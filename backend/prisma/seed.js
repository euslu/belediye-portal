require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

async function main() {
  // ─── Gruplar ─────────────────────────────────────────────────────────────
  const BI = 'Bilgi İşlem Dairesi Başkanlığı';
  const groupDefs = [
    { name: 'Ağ ve Altyapı',      description: 'Ağ, sunucu ve altyapı yönetimi',           department: BI },
    { name: 'Donanım Destek',     description: 'Bilgisayar ve donanım teknik destek',       department: BI },
    { name: 'Yazılım Geliştirme', description: 'Uygulama geliştirme ve bakım',              department: BI },
    { name: 'Güvenlik',           description: 'Bilgi güvenliği ve siber güvenlik',         department: BI },
    { name: 'Sunucu ve Sistem',   description: 'Sunucu, sanallaştırma ve sistem yönetimi', department: BI },
    { name: 'Kullanıcı Destek',   description: 'Kullanıcı hesapları ve genel destek',       department: BI },
  ];

  for (const g of groupDefs) {
    await prisma.group.upsert({
      where:  { name: g.name },
      update: { description: g.description, department: g.department },
      create: g,
    });
  }

  const G = {};
  for (const g of groupDefs) G[g.name] = await prisma.group.findUnique({ where: { name: g.name } });
  const ag       = G['Ağ ve Altyapı'];
  const donanim  = G['Donanım Destek'];
  const yazilim  = G['Yazılım Geliştirme'];
  const guvenlik = G['Güvenlik'];
  const sunucu   = G['Sunucu ve Sistem'];
  const kullanici = G['Kullanıcı Destek'];
  console.log('✓ Gruplar hazır');

  // ─── Mock kullanıcılar ───────────────────────────────────────────────────
  const userDefs = [
    { username: 'admin',    displayName: 'Admin Kullanıcı', role: 'admin',   email: 'admin@mugla.bel.tr' },
    { username: 'manager1', displayName: 'Ahmet Yılmaz',    role: 'manager', email: 'ahmet.yilmaz@mugla.bel.tr' },
    { username: 'user1',    displayName: 'Mehmet Demir',    role: 'user',    email: 'mehmet.demir@mugla.bel.tr' },
    { username: 'user2',    displayName: 'Ayşe Kaya',       role: 'user',    email: 'ayse.kaya@mugla.bel.tr' },
    { username: 'user3',    displayName: 'Fatma Çelik',     role: 'user',    email: 'fatma.celik@mugla.bel.tr' },
    { username: 'user4',    displayName: 'Ali Öztürk',      role: 'user',    email: 'ali.ozturk@mugla.bel.tr' },
  ];

  for (const u of userDefs) {
    await prisma.user.upsert({
      where:  { username: u.username },
      update: { displayName: u.displayName, role: u.role, email: u.email },
      create: u,
    });
  }

  const [admin, manager1, user1, user2, user3, user4] = await Promise.all(
    ['admin','manager1','user1','user2','user3','user4'].map(u => prisma.user.findUnique({ where: { username: u } }))
  );

  const memberships = [
    { userId: admin.id,    groupId: ag.id,       role: 'leader' },
    { userId: manager1.id, groupId: ag.id,       role: 'member' },
    { userId: user1.id,    groupId: ag.id,       role: 'member' },
    { userId: user2.id,    groupId: yazilim.id,  role: 'leader' },
    { userId: user3.id,    groupId: yazilim.id,  role: 'member' },
    { userId: user4.id,    groupId: donanim.id,  role: 'leader' },
    { userId: manager1.id, groupId: guvenlik.id, role: 'leader' },
    { userId: user1.id,    groupId: guvenlik.id, role: 'member' },
  ];

  for (const m of memberships) {
    await prisma.userGroup.upsert({
      where:  { userId_groupId: { userId: m.userId, groupId: m.groupId } },
      update: { role: m.role },
      create: m,
    });
  }
  console.log('✓ Kullanıcılar ve grup üyelikleri hazır');

  // ─── Başvuru Tipleri (1. katman) ─────────────────────────────────────────
  const submitTypeDefs = [
    { name: 'Arıza',         key: 'ARIZA',         icon: '⚡', color: 'red',    description: 'Teknik arıza ve sorun bildirimi', order: 0 },
    { name: 'Talep',         key: 'HIZMET_TALEBI', icon: '📋', color: 'indigo', description: 'Hizmet ve kaynak talebi',        order: 1 },
  ];

  for (const st of submitTypeDefs) {
    await prisma.submitType.upsert({
      where:  { key: st.key },
      update: { name: st.name, icon: st.icon, color: st.color, description: st.description, order: st.order, active: true },
      create: st,
    });
  }
  // Eski TALEP tipini pasife al
  await prisma.submitType.updateMany({ where: { key: 'TALEP' }, data: { active: false } });

  const stAriza = await prisma.submitType.findUnique({ where: { key: 'ARIZA' } });
  const stTalep = await prisma.submitType.findUnique({ where: { key: 'HIZMET_TALEBI' } });
  console.log('✓ Başvuru tipleri hazır');

  // ─── Kategoriler & Konular temizle, yeniden oluştur ───────────────────────
  await prisma.subject.deleteMany({});
  await prisma.category.deleteMany({});

  // ─── 2. Katman: Kategoriler ───────────────────────────────────────────────
  // format: { name, icon, typeId }
  // 3. Katman: subjects format: [ { name, gid } ]

  const tree = [
    // ══════════════════════════════════════════════════════════════════
    // ARIZA
    // ══════════════════════════════════════════════════════════════════
    {
      name: 'İnternet bağlantımla ilgili sorun yaşıyorum',
      icon: '🌐', typeId: stAriza.id,
      subjects: [
        { name: 'İnternet Arızası ve Yeni Hat Çekilmesi',                   gid: ag.id },
        { name: 'Hizmet Binası İçi İnternet Kablolama ve Kabinet Düzenleme', gid: ag.id },
      ],
    },
    {
      name: 'Bilgisayarımla ilgili sorun yaşıyorum',
      icon: '💻', typeId: stAriza.id,
      subjects: [
        { name: 'Bilgisayar Arızası ve Kurulum',   gid: donanim.id },
        { name: 'Workstation Kullanım Talepleri',   gid: donanim.id },
      ],
    },
    {
      name: 'Yazıcı veya tarayıcıyla ilgili sorun yaşıyorum',
      icon: '🖨️', typeId: stAriza.id,
      subjects: [
        { name: 'Yazıcı Arızası ve Kurulumu', gid: donanim.id },
        { name: 'Tarayıcı Arızası',           gid: donanim.id },
      ],
    },
    {
      name: 'Monitörle ilgili sorun yaşıyorum',
      icon: '🖥️', typeId: stAriza.id,
      subjects: [
        { name: 'Monitör Arızası', gid: donanim.id },
      ],
    },
    {
      name: 'Kesintisiz güç kaynağı (UPS) arızası',
      icon: '⚡', typeId: stAriza.id,
      subjects: [
        { name: 'Kesintisiz Güç Kaynağı (UPS) Arızası', gid: donanim.id },
      ],
    },
    {
      name: 'Telefon ile ilgili sorun yaşıyorum',
      icon: '📱', typeId: stAriza.id,
      subjects: [
        { name: 'IP Telefon Arızası', gid: ag.id },
      ],
    },
    {
      name: 'Güvenlik kamerası ile ilgili sorun yaşıyorum',
      icon: '📷', typeId: stAriza.id,
      subjects: [
        { name: 'Güvenlik Kamerası Sistemi Arızası', gid: guvenlik.id },
      ],
    },
    {
      name: 'Yazılım veya uygulama çalışmıyor',
      icon: '💾', typeId: stAriza.id,
      subjects: [
        { name: 'Yazılım Arızası',                  gid: yazilim.id },
        { name: 'PDKS Arızası',                     gid: yazilim.id },
        { name: 'Belediye Otomasyon Modül Destek',  gid: yazilim.id },
        { name: 'CBS Uygulama Desteği',             gid: yazilim.id },
        { name: 'E-Belediye Evrak Modülü Destek',   gid: yazilim.id },
      ],
    },
    {
      name: 'Kullanıcı adı veya şifre sorunu',
      icon: '🔐', typeId: stAriza.id,
      subjects: [
        { name: 'Kullanıcı Adı ve Şifre Destek', gid: kullanici.id },
      ],
    },
    {
      name: 'E-posta ile ilgili sorun yaşıyorum',
      icon: '📧', typeId: stAriza.id,
      subjects: [
        { name: 'E-Posta Hesabı Sorunları', gid: kullanici.id },
      ],
    },
    {
      name: 'Bariyer arızası',
      icon: '🚧', typeId: stAriza.id,
      subjects: [
        { name: 'Bariyer Arızası (Bilgi İşlem)', gid: donanim.id },
      ],
    },
    {
      name: 'Ortak klasör sorunu',
      icon: '📁', typeId: stAriza.id,
      subjects: [
        { name: 'Ortak Klasör Sorunları', gid: guvenlik.id },
      ],
    },

    // ══════════════════════════════════════════════════════════════════
    // HİZMET TALEBİ
    // ══════════════════════════════════════════════════════════════════
    {
      name: 'İnternet veya ağ talebi',
      icon: '🌐', typeId: stTalep.id,
      subjects: [
        { name: 'İnternet Yetki Talebi',          gid: ag.id },
        { name: 'Hizmet Binası İnternet Talebi',  gid: ag.id },
        { name: 'VPN Bağlantı Talebi',            gid: ag.id },
      ],
    },
    {
      name: 'Telefon veya GSM talebi',
      icon: '📱', typeId: stTalep.id,
      subjects: [
        { name: 'IP Telefon Dış Arama Yetki Talebi',   gid: ag.id },
        { name: 'IP Telefon İsim ve Dahili Değişikliği', gid: ag.id },
        { name: 'Mobil İnternet/GSM Hattı Talebi',     gid: ag.id },
      ],
    },
    {
      name: 'Bilgisayar veya donanım talebi',
      icon: '💻', typeId: stTalep.id,
      subjects: [
        { name: 'Ürün/Cihaz Talebi', gid: donanim.id },
      ],
    },
    {
      name: 'Yazıcı veya sarf malzeme talebi',
      icon: '🖨️', typeId: stTalep.id,
      subjects: [
        { name: 'Toner Talebi', gid: donanim.id },
      ],
    },
    {
      name: 'Yazılım kurulum veya lisans talebi',
      icon: '💾', typeId: stTalep.id,
      subjects: [
        { name: 'Yazılım Kurulumu Talebi',                gid: yazilim.id },
        { name: 'Yazılım Lisans ve Kurulum Talebi',       gid: yazilim.id },
        { name: 'Yazılım Geliştirme',                     gid: yazilim.id },
        { name: 'Yazılım Raporlama',                      gid: yazilim.id },
        { name: 'Yazılım Uygulamaları Kullanıcı Destekleri', gid: yazilim.id },
        { name: 'Yazılım Uygulamaları Teknik Şartname',   gid: yazilim.id },
      ],
    },
    {
      name: 'Belediye otomasyon talebi',
      icon: '📊', typeId: stTalep.id,
      subjects: [
        { name: 'Belediye Otomasyon Modül Yetki Talebi',      gid: yazilim.id },
        { name: 'Belediye Otomasyon Rapor ve Geliştirme Talep', gid: yazilim.id },
        { name: 'MBB Kurumsal Geliştirme Talepleri',           gid: yazilim.id },
        { name: 'MBB Kurumsal Personel Değişikliği',           gid: yazilim.id },
        { name: 'PDKS Uygulama Desteği',                       gid: yazilim.id },
      ],
    },
    {
      name: 'Yetki veya erişim talebi',
      icon: '🔐', typeId: stTalep.id,
      subjects: [
        { name: 'Ortak Klasör Yetki Talebi', gid: guvenlik.id },
      ],
    },
    {
      name: 'Sunucu veya sanal makine talebi',
      icon: '🖥️', typeId: stTalep.id,
      subjects: [
        { name: 'Sanal Sunucu İşlemleri',                   gid: sunucu.id },
        { name: 'Sanal Sunucu Talepleri',                   gid: sunucu.id },
        { name: 'Video Konferans Toplantı Talebi (Teams)',  gid: sunucu.id },
      ],
    },
    {
      name: 'E-posta hesabı talebi',
      icon: '📧', typeId: stTalep.id,
      subjects: [
        { name: 'Yeni E-Posta Hesabı Talebi', gid: kullanici.id },
      ],
    },
    {
      name: 'Diğer talepler',
      icon: '📋', typeId: stTalep.id,
      subjects: [
        { name: 'Bilgi Talebi', gid: kullanici.id },
        { name: 'İhbar',        gid: kullanici.id },
      ],
    },
  ];

  let totalSubjects = 0;
  for (const cat of tree) {
    const created = await prisma.category.create({
      data: { name: cat.name, icon: cat.icon, typeId: cat.typeId },
    });
    for (const s of cat.subjects) {
      await prisma.subject.create({
        data: { name: s.name, categoryId: created.id, defaultGroupId: s.gid },
      });
      totalSubjects++;
    }
  }
  console.log(`✓ ${tree.length} kategori, ${totalSubjects} başvuru konusu oluşturuldu`);

  // ─── Başlangıç Lokasyonu ─────────────────────────────────────────────────
  await prisma.location.upsert({
    where:  { id: 1 },
    update: {},
    create: { name: 'Merkez Hizmet Binası', city: 'Muğla', active: true },
  });
  console.log('✓ Başlangıç lokasyonu hazır');

  // ─── SLA Ayarları ────────────────────────────────────────────────────────
  const settings = [
    { key: 'sla_critical', value: '4'  },
    { key: 'sla_high',     value: '8'  },
    { key: 'sla_medium',   value: '24' },
    { key: 'sla_low',      value: '72' },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log('✓ SLA ayarları hazır');
}

main()
  .then(() => { console.log('\nSeed tamamlandı.'); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
