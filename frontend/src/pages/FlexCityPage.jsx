import { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import Surface from '../components/ui/Surface';

function formatNumber(value) {
  return (value ?? 0).toLocaleString('tr-TR');
}

function SectionHeader({ icon, title, accent = 'from-emerald-500 to-blue-500' }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg shadow-slate-200/60`}>
        <i className={`bi ${icon} text-lg`} />
      </div>
      <div className="min-w-0">
        <h2 className="m-0 text-lg font-semibold text-slate-800">{title}</h2>
        <div className="mt-2 h-px w-20 rounded-full bg-gradient-to-r from-emerald-400 via-blue-400 to-transparent" />
      </div>
    </div>
  );
}

function StatCard({ title, value, detail, icon, accent = 'from-emerald-500 to-emerald-400' }) {
  return (
    <Surface className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-white/0 via-white/50 to-white/0" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-3 mb-0 text-3xl font-bold leading-none text-slate-800">{formatNumber(value)}</p>
          {detail && <p className="mt-2 mb-0 text-sm text-slate-500">{detail}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg shadow-slate-200/70`}>
          <i className={`bi ${icon} text-lg`} />
        </div>
      </div>
    </Surface>
  );
}

function HorizontalBars({ title, subtitle, data, accent = 'bg-emerald-500', maxShow = 10 }) {
  if (!data?.length) {
    return (
      <Surface className="p-5">
        <EmptyState
          compact
          icon={<i className="bi bi-bar-chart-line" />}
          title={title}
          description="Bu kart için gösterilecek veri bulunamadı."
        />
      </Surface>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.sayi || 0), 1);

  return (
    <Surface className="p-5">
      <div className="mb-5">
        <h3 className="m-0 text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-1 mb-0 text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="space-y-3">
        {data.slice(0, maxShow).map((item, index) => {
          const width = Math.max(5, ((item.sayi || 0) / maxValue) * 100);
          return (
            <div key={`${item.ad}-${index}`} className="grid grid-cols-[minmax(0,180px)_1fr_auto] items-center gap-3">
              <div className="truncate text-sm text-slate-600" title={item.ad}>{item.ad}</div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${accent} transition-[width] duration-500`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="min-w-[44px] text-right text-sm font-semibold text-slate-700">{formatNumber(item.sayi)}</div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function DistributionList({ title, subtitle, data, colors }) {
  if (!data?.length) {
    return (
      <Surface className="p-5">
        <EmptyState
          compact
          icon={<i className="bi bi-pie-chart" />}
          title={title}
          description="Bu kart için gösterilecek veri bulunamadı."
        />
      </Surface>
    );
  }

  const total = data.reduce((sum, item) => sum + (item.sayi || 0), 0);
  const palette = colors || [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-lime-500',
  ];

  return (
    <Surface className="p-5">
      <div className="mb-5">
        <h3 className="m-0 text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-1 mb-0 text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = total ? Math.round(((item.sayi || 0) / total) * 100) : 0;
          return (
            <div key={`${item.ad}-${index}`} className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${palette[index % palette.length]} shadow-sm`} />
              <div className="min-w-0 flex-1 text-sm text-slate-600">{item.ad}</div>
              <div className="text-sm font-semibold text-slate-700">{formatNumber(item.sayi)}</div>
              <div className="w-10 text-right text-xs font-medium text-slate-400">%{percentage}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-3 text-right text-xs font-medium text-slate-400">
        Toplam: {formatNumber(total)}
      </div>
    </Surface>
  );
}

export default function FlexCityPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/flexcity/istatistik', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.error) {
          throw new Error(payload.error);
        }
        setData(payload);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="portal-page">
        <LoadingState
          title="FlexCity verileri hazırlanıyor"
          description="Mahalle, personel ve sosyal hizmet istatistikleri yükleniyor."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-page">
        <EmptyState
          icon={<i className="bi bi-exclamation-triangle" />}
          title="FlexCity verisi alınamadı"
          description={error}
          action={
            <Button color="green" onClick={() => window.location.reload()}>
              Tekrar Dene
            </Button>
          }
        />
      </div>
    );
  }

  const { mahalle, personel, sosyal, sehitGazi } = data;

  return (
    <div className="portal-page portal-page--wide">
      <div className="space-y-8">
        <PageHeader
          icon={<i className="bi bi-database-check text-xl" />}
          title="FlexCity Istatistikleri"
          description="Muğla Büyükşehir Belediyesi verilerini daha okunur ve karar destek odaklı bir görünümde toplar."
          meta={`Son güncelleme: ${new Date(data.cachedAt).toLocaleString('tr-TR')}`}
          actions={
            <Button variant="soft" onClick={() => window.location.reload()}>
              <i className="bi bi-arrow-clockwise mr-2" />
              Yenile
            </Button>
          }
        />

        <Surface className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-600 px-6 py-7 text-white md:px-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-emerald-50 uppercase">
                <i className="bi bi-lightning-charge-fill" />
                Veri Merkezi
              </div>
              <h2 className="mt-4 mb-0 text-3xl font-bold leading-tight">Kurumsal veriyi tek ekranda, daha canlı ve okunur şekilde izliyoruz.</h2>
              <p className="mt-3 mb-0 max-w-2xl text-sm leading-6 text-emerald-50/90">
                Mahalle, personel, sosyal hizmet ve şehit-gazi kayıtlarını tek akışta okuyup yoğunluğu yüksek alanları daha hızlı fark edebilirsiniz.
              </p>
            </div>

            <div className="grid gap-4 bg-slate-50/70 px-6 py-6 md:grid-cols-2 lg:grid-cols-1 lg:px-7">
              <div>
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Kapsam</p>
                <p className="mt-2 mb-0 text-2xl font-bold text-slate-800">{formatNumber(mahalle.toplam + personel.toplam + sosyal.yardimToplam + sehitGazi.toplam)}</p>
                <p className="mt-1 mb-0 text-sm text-slate-500">Toplam izlenen kayıt ve özet hacmi</p>
              </div>
              <div>
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Odak Alanı</p>
                <p className="mt-2 mb-0 text-2xl font-bold text-slate-800">{formatNumber(personel.toplam)}</p>
                <p className="mt-1 mb-0 text-sm text-slate-500">Şu an en büyük veri grubu personel</p>
              </div>
            </div>
          </div>
        </Surface>

        <section className="space-y-5">
          <SectionHeader icon="bi-geo-alt" title="Mahalle Bilgileri" accent="from-emerald-500 to-teal-500" />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Toplam Mahalle" value={mahalle.toplam} icon="bi-map" accent="from-emerald-500 to-teal-400" />
            <StatCard
              title="Toplam Nufus"
              value={mahalle.nufus.erkek + mahalle.nufus.kadin}
              detail={`${formatNumber(mahalle.nufus.erkek)} erkek • ${formatNumber(mahalle.nufus.kadin)} kadın`}
              icon="bi-people"
              accent="from-blue-500 to-cyan-400"
            />
            <StatCard title="Hane Sayisi" value={mahalle.nufus.hane} icon="bi-house" accent="from-amber-500 to-orange-400" />
            <StatCard title="Ilce Sayisi" value={mahalle.ilceler.length} icon="bi-pin-map" accent="from-violet-500 to-fuchsia-400" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <HorizontalBars
              title="Ilce bazli mahalle sayisi"
              subtitle="En yoğun mahalle dağılımını ilk sıralarda görürsünüz."
              data={mahalle.ilceler}
              accent="bg-emerald-500"
              maxShow={13}
            />
            <DistributionList
              title="Muhtar parti dagilimi"
              subtitle="Toplam mahalle yönetim dağılımı."
              data={mahalle.partiler}
            />
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeader icon="bi-person-badge" title="Personel Bilgileri" accent="from-blue-500 to-cyan-500" />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Toplam Personel" value={personel.toplam} icon="bi-person-badge" accent="from-blue-500 to-cyan-400" />
            <StatCard title="Daire Sayisi" value={personel.daireler.length} icon="bi-building" accent="from-emerald-500 to-green-400" />
            <StatCard title="Mudurluk" value={personel.mudurlukler.length} icon="bi-diagram-3" accent="from-amber-500 to-yellow-400" />
            <StatCard title="Lokasyon" value={personel.lokasyonlar.length} icon="bi-geo" accent="from-violet-500 to-purple-400" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <HorizontalBars
              title="Daire bazli personel sayisi"
              subtitle="En yoğun daireleri üst sırada görürsünüz."
              data={personel.daireler}
              accent="bg-blue-500"
            />
            <DistributionList
              title="Personel turu dagilimi"
              subtitle="Çalışan tiplerinin genel görünümü."
              data={personel.turler}
              colors={['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']}
            />
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeader icon="bi-heart" title="Sosyal Hizmetler" accent="from-rose-500 to-orange-500" />

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Sosyal Yardim" value={sosyal.yardimToplam} icon="bi-gift" accent="from-rose-500 to-pink-400" />
            <StatCard title="Evde Bakim" value={sosyal.evdeBakimToplam} icon="bi-house-heart" accent="from-fuchsia-500 to-pink-400" />
            <StatCard title="Hasta Nakil" value={sosyal.hastaNakilToplam} icon="bi-ambulance" accent="from-orange-500 to-amber-400" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <HorizontalBars
              title="Evde bakim ilce dagilimi"
              subtitle="Talep yoğunluğu ilçe bazında."
              data={sosyal.evdeBakimIlceler}
              accent="bg-pink-500"
            />
            <HorizontalBars
              title="Hasta nakil ilce dagilimi"
              subtitle="Nakil ihtiyacının ilçe dağılımı."
              data={sosyal.hastaNakilIlceler}
              accent="bg-orange-500"
            />
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeader icon="bi-shield-star" title="Sehit / Gazi" accent="from-violet-500 to-indigo-500" />

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Toplam Kayit" value={sehitGazi.toplam} icon="bi-shield-star" accent="from-violet-500 to-indigo-400" />
            <StatCard title="Sehit Ailesi" value={sehitGazi.sehitAilesi} icon="bi-flag" accent="from-rose-500 to-red-400" />
            <StatCard title="Gazi" value={sehitGazi.gazi} icon="bi-award" accent="from-amber-500 to-yellow-400" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <HorizontalBars
              title="Ilce bazli dagilim"
              subtitle="Kayıtların ilçe yoğunluğu."
              data={sehitGazi.ilceler}
              accent="bg-violet-500"
            />
            <DistributionList
              title="Engel turu dagilimi"
              subtitle="Şehit / gazi kayıtlarındaki engel türleri."
              data={sehitGazi.engelTurleri}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
