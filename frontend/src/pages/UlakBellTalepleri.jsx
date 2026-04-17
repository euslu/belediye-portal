import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL || ''

const DURUM_MAP = {
  new:                  { label:'Yeni',           bg:'#eff6ff', color:'#1d4ed8', emoji:'🆕' },
  pending:              { label:'Beklemede',       bg:'#fff7ed', color:'#c2410c', emoji:'⏳' },
  in_process:           { label:'İşlemde',         bg:'#f0fdf4', color:'#166534', emoji:'⚙️' },
  completed:            { label:'Sonuçlandı',      bg:'#f1f5f9', color:'#475569', emoji:'✅' },
  waiting_for_approval: { label:'Onay Bekliyor',   bg:'#fef9c3', color:'#a16207', emoji:'🔔' },
}

const TIP_MAP = {
  demand:      { label:'Talep',       color:'#3b82f6' },
  complaint:   { label:'Şikayet',     color:'#ef4444' },
  thank:       { label:'Teşekkür',    color:'#43DC80' },
  project:     { label:'Proje',       color:'#8b5cf6' },
  information: { label:'Bilgi',       color:'#f59e0b' },
  notice:      { label:'İhbar',       color:'#dc2626' },
}

function formatTarih(unix) {
  if (!unix) return '—'
  const num = Number(unix)
  if (isNaN(num) || num < 1e9) return '—'
  return new Date(num * 1000).toLocaleDateString('tr-TR', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
  })
}

export default function UlakBellTalepleri() {
  const { user } = useAuth()
  const rol = user?.sistemRol || user?.role || 'personel'
  const isAdmin = rol === 'admin'

  const [talepler, setTalepler]     = useState([])
  const [toplam, setToplam]         = useState(0)
  const [sonSayfa, setSonSayfa]     = useState(1)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kaynaklar, setKaynaklar]   = useState([])
  const [birimler, setBirimler]     = useState([])
  const [konular, setKonular]       = useState([])
  const [sayfa, setSayfa]           = useState(1)
  const [secili, setSecili]         = useState(null)
  const [meta, setMeta]             = useState(null)

  const [filtreDurum,  setFiltreDurum]  = useState('all')
  const [filtreKaynak, setFiltreKaynak] = useState('all')
  const [filtreBirim,  setFiltreBirim]  = useState('all')
  const [aramaNo,      setAramaNo]      = useState('')

  // İletme modalı
  const [iletModal, setIletModal] = useState(null)
  const [iletForm, setIletForm]   = useState({ department_id:'', topic_id:'', priority:'normal', not:'' })
  const [iletYukleniyor, setIletYukleniyor] = useState(false)

  const token   = localStorage.getItem('token')
  const headers = useMemo(() => ({ Authorization: 'Bearer ' + token }), [token])

  useEffect(() => {
    fetch(`${API}/api/ulakbell/kaynaklar`, { headers })
      .then(r => r.json()).then(d => setKaynaklar(Array.isArray(d) ? d : [])).catch(() => {})
    fetch(`${API}/api/ulakbell/birimler`, { headers })
      .then(r => r.json()).then(d => setBirimler(Array.isArray(d) ? d : [])).catch(() => {})
    fetch(`${API}/api/ulakbell/konular`, { headers })
      .then(r => r.json()).then(d => setKonular(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const fetchTalepler = useCallback(() => {
    setYukleniyor(true)
    const params = new URLSearchParams({ count: 20, page: sayfa })
    if (filtreDurum  !== 'all') params.set('status', filtreDurum)
    if (filtreKaynak !== 'all') params.set('incident_source_id', filtreKaynak)
    if (filtreBirim  !== 'all') params.set('department_id', filtreBirim)
    if (aramaNo.trim())         params.set('q', aramaNo.trim())

    fetch(`${API}/api/ulakbell/basvurular?${params}`, { headers })
      .then(r => r.json())
      .then(d => {
        const liste = Array.isArray(d) ? d : (d.data || [])
        setTalepler(liste)
        setToplam(d.total || liste.length)
        setSonSayfa(d.last_page || Math.ceil((d.total || liste.length) / 20) || 1)
        if (d._meta) setMeta(d._meta)
      })
      .catch(() => {})
      .finally(() => setYukleniyor(false))
  }, [sayfa, filtreDurum, filtreKaynak, filtreBirim, aramaNo, headers])

  useEffect(() => { fetchTalepler() }, [fetchTalepler])

  // İletme fonksiyonu
  async function iletBasvuru() {
    if (!iletModal || !iletForm.department_id) return
    setIletYukleniyor(true)
    try {
      const r = await fetch(`${API}/api/ulakbell/basvurular/${iletModal.public_token}/ilet`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(iletForm),
      })
      const d = await r.json()
      if (d.is_successful !== false && !d.error) {
        setIletModal(null)
        setIletForm({ department_id:'', topic_id:'', priority:'normal', not:'' })
        fetchTalepler()
      } else {
        alert('İletme hatası: ' + (d.error || d.message || 'Bilinmeyen hata'))
      }
    } catch (e) {
      alert('İletme hatası: ' + e.message)
    } finally {
      setIletYukleniyor(false)
    }
  }

  const selectStyle = {
    width:'100%', padding:'8px 10px', fontSize:13,
    border:'1.5px solid #e2e8f0', borderRadius:8, background:'#f8fafc',
    outline:'none',
  }
  const labelStyle = {
    fontSize:11, fontWeight:600, color:'#9aa8a0',
    textTransform:'uppercase', display:'block', marginBottom:6,
  }

  // Birim filtresi için: sadece üst birimler (Daire Başkanlıkları)
  const ustBirimler = birimler.filter(b =>
    b.parent_department_id === 0 || b.title?.includes('Dairesi') || b.title?.includes('Müşavirliği')
  ).filter(b => !b.title?.includes('Personeli') && !b.title?.includes('Evrak'))

  return (
    <div style={{ padding:'24px 32px', maxWidth:1400 }}>

      {/* Baslik */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#1a2e23', margin:0 }}>
            <i className="bi bi-telephone-inbound" style={{ marginRight:8, color:'#43DC80' }} />
            ulakBELL Başvuruları
          </h1>
          <p style={{ fontSize:13, color:'#9aa8a0', margin:'4px 0 0' }}>
            {toplam.toLocaleString('tr-TR')} toplam başvuru
            {meta?.filtrelenenDaire && !isAdmin && (
              <span style={{ marginLeft:8, fontSize:12, color:'#059669', fontWeight:600 }}>
                🏢 {meta.filtrelenenDaire}
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchTalepler}
          className="portal-cta-btn portal-cta-btn--green"
          style={{ fontSize:13 }}>
          <i className="bi bi-arrow-clockwise" /> Yenile
        </button>
      </div>

      {/* Filtreler */}
      <div style={{ background:'#fff', border:'1px solid #e8ede9', borderRadius:12,
        padding:'16px 20px', marginBottom:20,
        display:'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr 1fr auto' : '1fr 1fr 1fr auto', gap:12, alignItems:'end' }}>

        <div>
          <label style={labelStyle}>Durum</label>
          <select value={filtreDurum} onChange={e => { setFiltreDurum(e.target.value); setSayfa(1) }} style={selectStyle}>
            <option value="all">Tümü</option>
            {Object.entries(DURUM_MAP).map(([k,v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Kaynak</label>
          <select value={filtreKaynak} onChange={e => { setFiltreKaynak(e.target.value); setSayfa(1) }} style={selectStyle}>
            <option value="all">Tümü</option>
            {kaynaklar.map(k => (
              <option key={k.id} value={k.id}>{k.title}</option>
            ))}
          </select>
        </div>

        {/* Birim filtresi — sadece admin */}
        {isAdmin && (
          <div>
            <label style={labelStyle}>Birim</label>
            <select value={filtreBirim} onChange={e => { setFiltreBirim(e.target.value); setSayfa(1) }} style={selectStyle}>
              <option value="all">Tümü</option>
              {ustBirimler.map(b => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={labelStyle}>Başvuru No</label>
          <input
            value={aramaNo}
            onChange={e => setAramaNo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchTalepler()}
            placeholder="No ile ara..."
            style={{ ...selectStyle, boxSizing:'border-box' }}
          />
        </div>

        <button onClick={() => { setSayfa(1); fetchTalepler() }}
          className="portal-cta-btn portal-cta-btn--green"
          style={{ fontSize:13, minHeight:38, padding:'8px 16px' }}>
          <i className="bi bi-search" />
        </button>
      </div>

      {/* Icerik */}
      {yukleniyor ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#9aa8a0' }}>
          <div style={{ fontSize:14 }}>Yükleniyor...</div>
        </div>
      ) : talepler.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#9aa8a0' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
          Başvuru bulunamadı
        </div>
      ) : (
        <>
          {/* Tablo */}
          <div style={{ background:'#fff', border:'1px solid #e8ede9', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e8ede9' }}>
                  {['No','Ad Soyad','Tip','Metin','İlçe/Mahalle','Tarih','Durum',''].map(h => (
                    <th key={h} style={{ padding:'10px 14px', fontSize:11, fontWeight:600,
                      color:'#9aa8a0', textTransform:'uppercase', textAlign:'left', letterSpacing:'0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {talepler.map((t, i) => {
                  const durum = DURUM_MAP[t.status] || { label: t.status, bg:'#f1f5f9', color:'#6b7280', emoji:'•' }
                  const tip   = TIP_MAP[t.incident_type] || { label: t.incident_type || '—', color:'#9aa8a0' }
                  const isSecili = secili?.number === t.number

                  return (
                    <tr key={t.id || i}
                      onClick={() => setSecili(t)}
                      style={{
                        borderBottom:'1px solid #f0f4f0',
                        cursor:'pointer',
                        background: isSecili ? '#f0fdf4' : 'transparent',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => { if (!isSecili) e.currentTarget.style.background = '#fafffe' }}
                      onMouseLeave={e => { if (!isSecili) e.currentTarget.style.background = 'transparent' }}>
                      <td style={{ padding:'10px 14px', fontSize:12, fontFamily:'monospace', color:'#9aa8a0', whiteSpace:'nowrap' }}>
                        #{t.number}
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:13, color:'#1a2e23', fontWeight:500, whiteSpace:'nowrap' }}>
                        {[t.name, t.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:11, fontWeight:600, color: tip.color }}>{tip.label}</span>
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#374151', maxWidth:250, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {t.text ? (t.text.length > 60 ? t.text.slice(0,60) + '...' : t.text) : '—'}
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#6b7280', whiteSpace:'nowrap' }}>
                        {[t.ilce_id, t.mahalle_id].filter(v => v && v !== '-').join(' / ') || '—'}
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:11, color:'#9aa8a0', whiteSpace:'nowrap' }}>
                        {formatTarih(t.created_at)}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
                          background: durum.bg, color: durum.color, whiteSpace:'nowrap' }}>
                          {durum.emoji} {durum.label}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        {t.status !== 'completed' && (
                          <button onClick={e => { e.stopPropagation(); setIletModal(t); setIletForm({ department_id:'', topic_id:'', priority:'normal', not:'' }) }}
                            style={{ padding:'4px 10px', fontSize:11, fontWeight:600,
                              background:'#eff6ff', color:'#1d4ed8',
                              border:'1px solid #bfdbfe', borderRadius:8, cursor:'pointer',
                              whiteSpace:'nowrap', transition:'all 150ms' }}>
                            → İlet
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Sayfalama */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
            <span style={{ fontSize:12, color:'#9aa8a0' }}>
              Sayfa {sayfa} / {sonSayfa} &middot; {toplam.toLocaleString('tr-TR')} başvuru
            </span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setSayfa(p => Math.max(1, p-1))} disabled={sayfa <= 1}
                className="portal-pill-btn" style={{ fontSize:12, minHeight:36 }}>
                &lsaquo; Önceki
              </button>
              <button onClick={() => setSayfa(p => p+1)} disabled={sayfa >= sonSayfa}
                className="portal-pill-btn" style={{ fontSize:12, minHeight:36 }}>
                Sonraki &rsaquo;
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detay Paneli */}
      {secili && (
        <>
          <div onClick={() => setSecili(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:1000 }} />
          <div style={{
            position:'fixed', top:0, right:0, bottom:0, width:420,
            background:'#fff', zIndex:1001, boxShadow:'-4px 0 24px rgba(0,0,0,0.15)',
            overflowY:'auto', padding:'28px',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#1a2e23' }}>
                Başvuru #{secili.number}
              </h3>
              <button onClick={() => setSecili(null)}
                style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9aa8a0' }}>
                &times;
              </button>
            </div>

            {(() => {
              const d = DURUM_MAP[secili.status] || { label: secili.status, bg:'#f1f5f9', color:'#6b7280' }
              return (
                <span style={{ fontSize:12, fontWeight:600, padding:'4px 12px', borderRadius:20,
                  background: d.bg, color: d.color, display:'inline-block', marginBottom:16 }}>
                  {d.label}
                </span>
              )
            })()}

            {[
              { label:'Ad Soyad',  value: [secili.name, secili.last_name].filter(Boolean).join(' ') || '—' },
              { label:'Telefon',   value: secili.mobile_phone || '—' },
              { label:'Tarih',     value: formatTarih(secili.created_at) },
              { label:'Tip',       value: TIP_MAP[secili.incident_type]?.label || secili.incident_type || '—' },
              { label:'İlçe',      value: secili.ilce_id || '—' },
              { label:'Mahalle',   value: secili.mahalle_id || '—' },
              { label:'Sokak',     value: secili.sokak_id || '—' },
              { label:'Dış Kapı',  value: secili.dis_kapi_no || '—' },
              { label:'İç Kapı',   value: secili.ic_kapi_no || '—' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:'1px solid #f0f4f0' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#9aa8a0', width:80, flexShrink:0 }}>{r.label}</div>
                <div style={{ fontSize:13, color:'#1a2e23' }}>{r.value}</div>
              </div>
            ))}

            {secili.text && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#9aa8a0', textTransform:'uppercase', marginBottom:8 }}>
                  Başvuru Metni
                </div>
                <div style={{ fontSize:13, color:'#374151', lineHeight:1.6, background:'#f8fafc', borderRadius:8, padding:'12px 14px' }}>
                  {secili.text}
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <a href={`https://kurumsal.mugla.bel.tr/home#/incidents/show/${secili.public_token}`}
                target="_blank" rel="noreferrer"
                className="portal-cta-btn portal-cta-btn--green"
                style={{ display:'flex', flex:1, fontSize:13, textDecoration:'none' }}>
                <i className="bi bi-box-arrow-up-right" /> ulakBELL'de Aç
              </a>
              {secili.status !== 'completed' && (
                <button onClick={() => { setIletModal(secili); setSecili(null); setIletForm({ department_id:'', topic_id:'', priority:'normal', not:'' }) }}
                  className="portal-cta-btn portal-cta-btn--green-outline"
                  style={{ fontSize:13 }}>
                  → İlet
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* İletme Modalı */}
      {iletModal && (
        <>
          <div onClick={() => setIletModal(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:2000 }} />
          <div style={{
            position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            background:'#fff', borderRadius:16, padding:28, width:440, maxHeight:'80vh', overflowY:'auto',
            zIndex:2001, boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#1a2e23' }}>
                → Başvuru #{iletModal.number} İlet
              </h3>
              <button onClick={() => setIletModal(null)}
                style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9aa8a0' }}>
                &times;
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={labelStyle}>Birim *</label>
                <select value={iletForm.department_id}
                  onChange={e => setIletForm(f => ({ ...f, department_id: e.target.value, topic_id:'' }))}
                  style={selectStyle}>
                  <option value="">Birim seçin</option>
                  {ustBirimler.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Konu</label>
                <select value={iletForm.topic_id}
                  onChange={e => setIletForm(f => ({ ...f, topic_id: e.target.value }))}
                  style={selectStyle}>
                  <option value="">Konu seçin (opsiyonel)</option>
                  {konular
                    .filter(k => !iletForm.department_id || String(k.department_id) === String(iletForm.department_id))
                    .map(k => (
                      <option key={k.id} value={k.id}>{k.title}</option>
                    ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Öncelik</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6 }}>
                  {[
                    { v:'low', l:'Düşük', border:'#94a3b8', bg:'#f8fafc', color:'#475569' },
                    { v:'normal', l:'Normal', border:'#3b82f6', bg:'#eff6ff', color:'#1d4ed8' },
                    { v:'high', l:'Yüksek', border:'#f97316', bg:'#fff7ed', color:'#c2410c' },
                    { v:'critical', l:'Acil', border:'#ef4444', bg:'#fef2f2', color:'#b91c1c' },
                  ].map(p => {
                    const active = iletForm.priority === p.v
                    return (
                      <button key={p.v} type="button"
                        onClick={() => setIletForm(f => ({ ...f, priority: p.v }))}
                        style={{
                          padding:'8px 4px', borderRadius:10, fontSize:12, fontWeight: active ? 600 : 500,
                          border: `1.5px solid ${active ? p.border : '#e5e7eb'}`,
                          background: active ? p.bg : '#fff',
                          color: active ? p.color : '#6b7280',
                          cursor:'pointer', transition:'all 150ms', textAlign:'center',
                        }}>
                        {p.l}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Not</label>
                <textarea value={iletForm.not}
                  onChange={e => setIletForm(f => ({ ...f, not: e.target.value }))}
                  placeholder="İletme notu (opsiyonel)..."
                  rows={3}
                  style={{ ...selectStyle, resize:'none', fontFamily:'inherit' }} />
              </div>

              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button onClick={iletBasvuru}
                  disabled={!iletForm.department_id || iletYukleniyor}
                  className="portal-cta-btn portal-cta-btn--green"
                  style={{ flex:1, fontSize:13, opacity: (!iletForm.department_id || iletYukleniyor) ? 0.5 : 1 }}>
                  {iletYukleniyor ? 'İletiliyor...' : '→ İlet'}
                </button>
                <button onClick={() => setIletModal(null)}
                  className="portal-pill-btn"
                  style={{ fontSize:13 }}>
                  İptal
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
