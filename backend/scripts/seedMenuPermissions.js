/**
 * Mevcut hardcode menü kurallarını MenuPermission tablosuna aktarır.
 * Kullanım: node scripts/seedMenuPermissions.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../lib/prisma');

const MENU_ITEMS = [
  // ── Anasayfa (grupLabel yok) ──
  {
    menuKey: 'anasayfa',
    label: 'Anasayfa',
    icon: 'bi-house-door',
    route: '/',
    groupLabel: null,
    groupOrder: 0,
    itemOrder: 0,
    herkes: true,
    exactEnd: true,
  },
  {
    menuKey: 'genel_sekreter',
    label: 'Genel Sekreter',
    icon: 'bi-speedometer2',
    route: '/genel-sekreter',
    groupLabel: null,
    groupOrder: 0,
    itemOrder: 1,
    usernames: JSON.stringify(['portal.admin', 'tayfun.yilmaz']),
  },

  // ── TALEPLERİM ──
  {
    menuKey: 'bilgi_islem_talebi',
    label: 'Bilgi İşlem Talebi',
    icon: 'bi-laptop',
    route: '/itsm/new',
    groupLabel: 'TALEPLERİM',
    groupOrder: 1,
    itemOrder: 0,
    herkes: true,
    exactEnd: true,
  },
  {
    menuKey: 'destek_hizmetleri',
    label: 'Destek Hizmetleri',
    icon: 'bi-wrench-adjustable',
    route: '/tickets/new/destek',
    groupLabel: 'TALEPLERİM',
    groupOrder: 1,
    itemOrder: 1,
    herkes: true,
    exactEnd: true,
  },
  {
    menuKey: 'tum_basvurularim',
    label: 'Tüm Başvurularım',
    icon: 'bi-list-ul',
    route: '/my-tickets',
    groupLabel: 'TALEPLERİM',
    groupOrder: 1,
    itemOrder: 2,
    herkes: true,
  },
  {
    menuKey: 'gelistirme',
    label: 'Geliştirme Talep Et',
    icon: 'bi-lightbulb',
    route: '/gelistirme',
    groupLabel: 'TALEPLERİM',
    groupOrder: 1,
    itemOrder: 3,
    herkes: true,
  },

  // ── GÖREVLERİM ──
  {
    menuKey: 'tum_talepler',
    label: 'Tüm Talepler',
    icon: 'bi-ticket-detailed',
    route: '/itsm',
    groupLabel: 'GÖREVLERİM',
    groupOrder: 2,
    itemOrder: 0,
    sistemRoller: JSON.stringify(['admin', 'daire_baskani', 'mudur']),
  },
  {
    menuKey: 'onay_bekleyenler',
    label: 'Onay Bekleyenler',
    icon: 'bi-clipboard-check',
    route: '/pending-approvals',
    groupLabel: 'GÖREVLERİM',
    groupOrder: 2,
    itemOrder: 1,
    sistemRoller: JSON.stringify(['admin', 'daire_baskani', 'mudur']),
    showApprovalBadge: true,
  },
  {
    menuKey: 'aktif_gorevlerim',
    label: 'Aktif Görevlerim',
    icon: 'bi-check2-square',
    route: '/my-tasks',
    groupLabel: 'GÖREVLERİM',
    groupOrder: 2,
    itemOrder: 2,
    sistemRoller: JSON.stringify(['admin', 'daire_baskani', 'mudur']),
  },
  {
    menuKey: 'birim_raporu',
    label: 'Birim Raporu',
    icon: 'bi-bar-chart-line',
    route: '/manager-dashboard',
    groupLabel: 'GÖREVLERİM',
    groupOrder: 2,
    itemOrder: 3,
    sistemRoller: JSON.stringify(['admin', 'daire_baskani', 'mudur']),
  },

  // ── ARAÇLAR ──
  {
    menuKey: 'personel',
    label: 'Personel',
    icon: 'bi-people',
    route: '/personel',
    groupLabel: 'ARAÇLAR',
    groupOrder: 3,
    itemOrder: 0,
    sistemRoller: JSON.stringify(['admin', 'daire_baskani']),
  },
  {
    menuKey: 'envanter',
    label: 'Envanter',
    icon: 'bi-server',
    route: '/admin/envanter',
    groupLabel: 'ARAÇLAR',
    groupOrder: 3,
    itemOrder: 1,
    sistemRoller: JSON.stringify(['admin']),
  },
  {
    menuKey: 'ulakbell',
    label: 'ulakBELL Talepleri',
    icon: 'bi-bell',
    route: '/ulakbell-incidents',
    groupLabel: 'ARAÇLAR',
    groupOrder: 3,
    itemOrder: 2,
    sistemRoller: JSON.stringify(['admin', 'daire_baskani', 'mudur']),
  },
  {
    menuKey: 'pdks',
    label: 'PDKS',
    icon: 'bi-clock',
    route: '/pdks',
    groupLabel: 'ARAÇLAR',
    groupOrder: 3,
    itemOrder: 3,
    sistemRoller: JSON.stringify(['admin', 'daire_baskani', 'mudur']),
  },
  {
    menuKey: 'bilgi_tabani',
    label: 'Bilgi Tabanı',
    icon: 'bi-book',
    route: '/kb',
    groupLabel: 'ARAÇLAR',
    groupOrder: 3,
    itemOrder: 4,
    sistemRoller: JSON.stringify(['admin']),
    disabled: true,
  },
  {
    menuKey: 'flexcity',
    label: 'FlexCity',
    icon: 'bi-database-check',
    route: '/flexcity',
    groupLabel: 'ARAÇLAR',
    groupOrder: 3,
    itemOrder: 5,
    sistemRoller: JSON.stringify(['admin']),
  },
  {
    menuKey: 'lisans_yonetimi',
    label: 'Lisans Yönetimi',
    icon: 'bi-key',
    route: '/admin/lisans-yonetimi',
    groupLabel: 'ARAÇLAR',
    groupOrder: 3,
    itemOrder: 6,
    sistemRoller: JSON.stringify(['admin']),
  },

  // ── AR-GE ──
  {
    menuKey: 'gsm_hat',
    label: 'GSM / Data Hatları',
    icon: 'bi-phone',
    route: '/arge/gsm-hat',
    groupLabel: 'AR-GE',
    groupOrder: 4,
    itemOrder: 0,
    sistemRoller: JSON.stringify(['admin']),
    directorates: JSON.stringify(['Bilgi İşlem Dairesi Başkanlığı']),
    departments: JSON.stringify(['Sistem, Ağ ve Veri Güvenliği Müdürlüğü']),
    // grupIds will be populated dynamically below
  },
  {
    menuKey: 'teslim_tutanagi',
    label: 'Teslim Tutanağı',
    icon: 'bi-file-earmark-text',
    route: '/arge/tutanak',
    groupLabel: 'AR-GE',
    groupOrder: 4,
    itemOrder: 1,
    sistemRoller: JSON.stringify(['admin']),
    directorates: JSON.stringify(['Bilgi İşlem Dairesi Başkanlığı']),
    departments: JSON.stringify(['Sistem, Ağ ve Veri Güvenliği Müdürlüğü']),
  },

  // ── SİSTEM ──
  {
    menuKey: 'ayarlar',
    label: 'Ayarlar',
    icon: 'bi-gear',
    route: '/admin/settings',
    groupLabel: 'SİSTEM',
    groupOrder: 5,
    itemOrder: 0,
    sistemRoller: JSON.stringify(['admin', 'daire_baskani']),
  },
  {
    menuKey: 'islem_gecmisi',
    label: 'İşlem Geçmişi',
    icon: 'bi-clock-history',
    route: '/islem-gecmisi',
    groupLabel: 'SİSTEM',
    groupOrder: 5,
    itemOrder: 1,
    sistemRoller: JSON.stringify(['admin', 'daire_baskani']),
  },
  {
    menuKey: 'menu_yetkilendirme',
    label: 'Menü Yetkilendirme',
    icon: 'bi-shield-lock',
    route: '/admin/menu-yetkilendirme',
    groupLabel: 'SİSTEM',
    groupOrder: 5,
    itemOrder: 2,
    sistemRoller: JSON.stringify(['admin']),
  },

  // ── Profilim (grupLabel yok) ──
  {
    menuKey: 'profilim',
    label: 'Profilim',
    icon: 'bi-person-circle',
    route: '/profile',
    groupLabel: null,
    groupOrder: 99,
    itemOrder: 0,
    herkes: true,
  },
];

async function seed() {
  console.log('Menü izinleri seed ediliyor...');

  // AR-GE çalışma grubu ID'sini bul
  let argeGrupId = null;
  try {
    const argeGrup = await prisma.calismaGrubu.findFirst({
      where: { ad: { contains: 'Ar-Ge', mode: 'insensitive' } },
    });
    if (argeGrup) argeGrupId = argeGrup.id;
  } catch {
    console.log('Çalışma grubu tablosu bulunamadı, AR-GE grup ID atlanıyor.');
  }

  for (const item of MENU_ITEMS) {
    // AR-GE menülerine grup ID ekle
    if (['gsm_hat', 'teslim_tutanagi'].includes(item.menuKey) && argeGrupId) {
      item.grupIds = JSON.stringify([argeGrupId]);
    }

    await prisma.menuPermission.upsert({
      where: { menuKey: item.menuKey },
      update: {
        label: item.label,
        icon: item.icon || null,
        route: item.route,
        groupLabel: item.groupLabel || null,
        groupOrder: item.groupOrder || 0,
        itemOrder: item.itemOrder || 0,
        herkes: item.herkes || false,
        disabled: item.disabled || false,
        exactEnd: item.exactEnd || false,
        sistemRoller: item.sistemRoller || null,
        directorates: item.directorates || null,
        departments: item.departments || null,
        grupIds: item.grupIds || null,
        usernames: item.usernames || null,
        showApprovalBadge: item.showApprovalBadge || false,
      },
      create: item,
    });
    console.log(`  ✓ ${item.menuKey}`);
  }

  console.log(`\nToplam ${MENU_ITEMS.length} menü öğesi seed edildi.`);
}

seed()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
