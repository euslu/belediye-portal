export const DEFAULT_WIDGETS = [
  // Stat kartları
  { id: 'toplam-basvuru',     label: 'Toplam Başvuru',        visible: true,  type: 'stat',  col: 1 },
  { id: 'tamamlandi',         label: 'Tamamlandı',            visible: true,  type: 'stat',  col: 1 },
  { id: 'devam',              label: 'Devam Etmekte',         visible: true,  type: 'stat',  col: 1 },
  { id: 'tamamlanmadi',       label: 'Tamamlanmadı',          visible: true,  type: 'stat',  col: 1 },
  { id: 'ort-sure',           label: 'Ort. Cevap Süresi',     visible: true,  type: 'stat',  col: 1 },
  { id: 'toplam-yatirim',     label: 'Toplam Yatırım',        visible: true,  type: 'stat',  col: 1 },
  { id: 'tamamlanan-yatirim', label: 'Tamamlanan Yatırım',    visible: true,  type: 'stat',  col: 1 },
  { id: 'beklemede',          label: 'Beklemede',             visible: false, type: 'stat',  col: 1 },
  { id: 'atanmamis',          label: 'Birim Atanmamış',       visible: false, type: 'stat',  col: 1 },
  { id: 'toplam-mahalle',     label: 'Toplam Mahalle',        visible: true,  type: 'stat',  col: 1 },
  // Grafik kartları
  { id: 'durum-pie',          label: 'Durum Dağılımı (Pie)',       visible: true,  type: 'chart', col: 2 },
  { id: 'yatirim-bar',        label: 'Yatırım Tamamlanma',         visible: true,  type: 'chart', col: 2 },
  { id: 'ilce-basvuru',       label: 'İlçe Bazlı Başvuru',         visible: true,  type: 'chart', col: 2 },
  { id: 'daire-basvuru',      label: 'Daire Bazlı Başvuru',        visible: true,  type: 'chart', col: 2 },
  { id: 'konu-dagilim',       label: 'Top 15 Başvuru Konusu',      visible: true,  type: 'chart', col: 2 },
  { id: 'daire-tamamlanma',   label: 'Daire Tamamlanma Oranı',     visible: true,  type: 'chart', col: 2 },
  { id: 'ilce-tamamlanma',    label: 'İlçe Tamamlanma Oranı',      visible: true,  type: 'chart', col: 2 },
];

export const LS_KEY_WIDGETS = 'dashboard_widgets';

export function loadWidgets() {
  try {
    const saved = localStorage.getItem(LS_KEY_WIDGETS);
    if (!saved) return DEFAULT_WIDGETS;
    const savedArr = JSON.parse(saved);
    return DEFAULT_WIDGETS.map(w => {
      const s = savedArr.find(x => x.id === w.id);
      return s !== undefined ? { ...w, visible: s.visible } : w;
    });
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export function saveWidgets(widgets) {
  localStorage.setItem(LS_KEY_WIDGETS, JSON.stringify(
    widgets.map(({ id, visible }) => ({ id, visible }))
  ));
}
