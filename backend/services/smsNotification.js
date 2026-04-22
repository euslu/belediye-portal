/**
 * SMS Bildirim Servisi
 * 4 tetikleyici:
 * 1. ulakBELL yeni başvuru → daire başkanına
 * 2. Ticket atanınca → personele
 * 3. Ticket durumu değişince → personele
 * 4. SLA aşılınca → personel + müdür + daire başkanı
 */
const { smsSend } = require('./sms');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// ─── Yardımcı fonksiyonlar ──────────────────────────────────────────────────

function temizleTel(tel) {
  if (!tel) return null;
  const temiz = String(tel).replace(/\D/g, '');
  if (temiz.length === 10 && temiz.startsWith('5')) return temiz;
  if (temiz.startsWith('90') && temiz.length === 12) return temiz.slice(2);
  if (temiz.startsWith('0') && temiz.length === 11) return temiz.slice(1);
  return null;
}

async function getUserPhone(userId) {
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: typeof userId === 'number' ? userId : parseInt(userId) },
    select: { phone: true, ipPhone: true, displayName: true, username: true,
              directorate: true, department: true },
  });
  if (!user) return null;
  const tel = temizleTel(user.phone) || temizleTel(user.ipPhone);
  return { tel, user };
}

// Belirli roldeki kullanıcıların telefonlarını UserRole tablosundan bul
async function getRolePhones(directorate, department, role) {
  const where = { role, active: true };
  if (directorate) where.directorate = directorate;
  if (department) where.department = department;

  const userRoles = await prisma.userRole.findMany({
    where,
    select: { username: true },
  });

  if (userRoles.length === 0) return [];

  const usernames = userRoles.map(ur => ur.username);
  const users = await prisma.user.findMany({
    where: { username: { in: usernames }, phone: { not: null } },
    select: { phone: true },
  });

  return users.map(u => temizleTel(u.phone)).filter(Boolean);
}

async function smsGonderVeLogla(telefonlar, mesaj, tur) {
  const liste = telefonlar.filter(Boolean);
  if (liste.length === 0) {
    logger.info(`[SMS ${tur}] Telefon bulunamadi, SMS gonderilemedi`);
    return;
  }
  try {
    const sonuc = await smsSend(liste, mesaj);
    logger.info(`[SMS ${tur}] ${liste.length} kisiye gonderildi`, { sonuc });
  } catch (e) {
    logger.error(`[SMS ${tur}] Hata: ${e.message}`);
  }
}

// ─── 1. ulakBELL YENİ BAŞVURU → Daire başkanına ────────────────────────────

async function smsUlakbellYeniBasvuru(bildirim) {
  try {
    if (!bildirim.portalDaire) return;

    const telefonlar = await getRolePhones(bildirim.portalDaire, null, 'daire_baskani');
    if (telefonlar.length === 0) return;

    const daire = bildirim.portalDaire
      .replace(' Dairesi Başkanlığı', '')
      .replace(' Daire Başkanlığı', '');

    const mesaj = `ulakBELL: ${daire} biriminize yeni basvuru geldi.` +
      (bildirim.basvuruNo ? ` Basvuru No: ${bildirim.basvuruNo}.` : '') +
      ` Mugla BB Portal uzerinden takip edebilirsiniz.`;

    await smsGonderVeLogla(telefonlar, mesaj, 'ulakBELL_yeni');
  } catch (e) {
    logger.error('[SMS ulakBELL] Hata:', e.message);
  }
}

// ─── 2. TİCKET ATANINCA → Personele ────────────────────────────────────────

async function smsTicketAtandi(ticket, atananUserId) {
  try {
    const info = await getUserPhone(atananUserId);
    if (!info || !info.tel) return;

    const konu = ticket.title || ticket.subject || 'Destek Talebi';
    const mesaj = `Mugla BB Portal: Size yeni bir gorev atandi.` +
      ` Konu: "${konu}" (Talep #${ticket.id}).` +
      ` Portaldan inceleyebilirsiniz.`;

    await smsGonderVeLogla([info.tel], mesaj, 'ticket_atandi');
  } catch (e) {
    logger.error('[SMS ticket_atandi] Hata:', e.message);
  }
}

// ─── 3. TİCKET DURUMU DEĞİŞİNCE → Atanan personele ────────────────────────

const DURUM_LABEL = {
  IN_PROGRESS:      'Isleme Alindi',
  RESOLVED:         'Cozuldu',
  CLOSED:           'Kapatildi',
  REJECTED:         'Reddedildi',
  PENDING_APPROVAL: 'Onay Bekliyor',
  ASSIGNED:         'Atandi',
  OPEN:             'Acik',
};

async function smsTicketDurumDegisti(ticket, yeniDurum, assignedToId) {
  try {
    if (!assignedToId) return;
    const info = await getUserPhone(assignedToId);
    if (!info || !info.tel) return;

    const durumLabel = DURUM_LABEL[yeniDurum] || yeniDurum;
    let mesaj;

    if (yeniDurum === 'CLOSED' || yeniDurum === 'RESOLVED') {
      mesaj = `Mugla BB Portal: Talep #${ticket.id} "${durumLabel}".` +
        ` Goreviniz tamamlandi, tesekkurler.`;
    } else {
      mesaj = `Mugla BB Portal: Talep #${ticket.id} durumu "${durumLabel}" olarak guncellendi.`;
    }

    await smsGonderVeLogla([info.tel], mesaj, 'ticket_durum');
  } catch (e) {
    logger.error('[SMS ticket_durum] Hata:', e.message);
  }
}

// ─── 4. SLA AŞILINCA → Personel + Müdür + Daire Başkanı ────────────────────

async function smsSlaAsildi(ticket) {
  try {
    const telefonlar = new Set();

    // Atanan personel
    if (ticket.assignedToId) {
      const info = await getUserPhone(ticket.assignedToId);
      if (info?.tel) telefonlar.add(info.tel);
    }

    // Müdür (ticket'ın departmanındaki)
    const dept = ticket.assignedTo?.department || ticket.targetDept;
    if (dept) {
      const mudurTeller = await getRolePhones(null, dept, 'mudur');
      mudurTeller.forEach(t => telefonlar.add(t));
    }

    // Daire başkanı
    const dir = ticket.assignedTo?.directorate || ticket.targetDirectorate;
    if (dir) {
      const baskanTeller = await getRolePhones(dir, null, 'daire_baskani');
      baskanTeller.forEach(t => telefonlar.add(t));
    }

    if (telefonlar.size === 0) return;

    const konu = ticket.title || ticket.subject || 'Destek Talebi';
    const mesaj = `Mugla BB Portal SLA UYARISI: Talep #${ticket.id}` +
      ` "${konu}" icin SLA suresi doldu!` +
      ` Lutfen portaldan kontrol ediniz.`;

    await smsGonderVeLogla([...telefonlar], mesaj, 'sla_asildi');
  } catch (e) {
    logger.error('[SMS SLA] Hata:', e.message);
  }
}

module.exports = {
  smsUlakbellYeniBasvuru,
  smsTicketAtandi,
  smsTicketDurumDegisti,
  smsSlaAsildi,
};
