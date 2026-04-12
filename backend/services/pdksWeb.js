'use strict';
/**
 * PDKS Web Client — pdks.mugla.bel.tr web arayüzüne login olup
 * Ajax API üzerinden birim, personel ve devam verisi çeker.
 *
 * Kullanım:
 *   const pdksWeb = require('./pdksWeb');
 *   const client  = await pdksWeb.getClient();   // login + cache
 *   const birimler = await client.getBirimTree();
 *   const personeller = await client.getPersonelList([27, 28, ...]);
 *   const rapor = await client.getAttendance([23,53,...], '07.04.2026');
 */

const https = require('https');
const http  = require('http');
const { URL } = require('url');
const { TextDecoder } = require('util');
const { getTlsOptions } = require('../utils/tls');

const PDKS_BASE  = 'https://pdks.mugla.bel.tr';
const PDKS_REPORT = 'http://pdks.mugla.bel.tr:9090';
const TC       = '26803902426';
const PASSWORD = 'Mbb!123*';
const KURUM_ID = '1';

// ─── HTTP helpers (cookie-aware, no external deps) ──────────────────────────

class CookieJar {
  constructor() { this.cookies = {}; }

  /** Parse Set-Cookie headers */
  update(headers) {
    const raw = headers['set-cookie'] || [];
    const arr = Array.isArray(raw) ? raw : [raw];
    for (const c of arr) {
      const [pair] = c.split(';');
      const [name, ...rest] = pair.split('=');
      if (name) this.cookies[name.trim()] = rest.join('=').trim();
    }
  }

  /** Build Cookie header string */
  toString() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

function makeRequest(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url  = new URL(urlStr);
    const mod  = url.protocol === 'https:' ? https : http;
    const opts = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method:   options.method || 'GET',
      headers:  options.headers || {},
      timeout:  15000,
      ...(url.protocol === 'https:' ? getTlsOptions('PDKS_WEB', urlStr, ['pdks.mugla.bel.tr']) : {}),
    };

    const req = mod.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─── PDKS Client ────────────────────────────────────────────────────────────

class PDKSClient {
  constructor() {
    this.jar       = new CookieJar();
    this.loggedIn  = false;
    this.loginTime = null;
    // cache
    this._birimCache    = null;
    this._birimCacheAt  = 0;
  }

  /** Login — get session, POST credentials */
  async login() {
    // 1) GET index page → __VIEWSTATE + session cookie
    const r1 = await makeRequest(`${PDKS_BASE}/`, {
      headers: { 'User-Agent': 'MBBPortal/1.0' },
    });
    this.jar.update(r1.headers);

    const loginDecoder = new TextDecoder('windows-1254');
    const html = loginDecoder.decode(r1.body);
    const vs  = html.match(/__VIEWSTATE" value="([^"]*)"/)?.[1] || '';
    const vsg = html.match(/__VIEWSTATEGENERATOR" value="([^"]*)"/)?.[1] || '';
    const ev  = html.match(/__EVENTVALIDATION" value="([^"]*)"/)?.[1] || '';

    if (!vs) throw new Error('PDKS login sayfası okunamadı');

    // 2) POST login form
    const formBody = new URLSearchParams({
      __VIEWSTATE: vs,
      __VIEWSTATEGENERATOR: vsg,
      __EVENTVALIDATION: ev,
      txtuser: TC,
      txtpass: PASSWORD,
      cmbKurumId: KURUM_ID,
      'btnLogin': 'Giriş',
    }).toString();

    const r2 = await makeRequest(`${PDKS_BASE}/Index.aspx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': this.jar.toString(),
      },
      body: formBody,
    });
    this.jar.update(r2.headers);

    if (r2.status !== 302 || !(r2.headers.location || '').includes('Default')) {
      throw new Error('PDKS login başarısız');
    }

    // 3) Follow redirect
    await makeRequest(`${PDKS_BASE}/Default.aspx`, {
      headers: { Cookie: this.jar.toString() },
    });

    // 4) Visit report page to init server state
    await makeRequest(`${PDKS_BASE}/PageReport/PagePdksReports/PDKS_GIRIS_CIKIS_LISTESI.aspx`, {
      headers: { Cookie: this.jar.toString() },
    });

    this.loggedIn  = true;
    this.loginTime = Date.now();
    return true;
  }

  /** Ensure active session (re-login if expired > 10 min) */
  async ensureSession() {
    if (!this.loggedIn || Date.now() - this.loginTime > 8 * 60 * 1000) {
      await this.login();
    }
  }

  /** Generic Ajax call */
  async ajax(pageName, eventName, jsonValue = 'XSW') {
    await this.ensureSession();

    const payload = JSON.stringify({ values: [pageName, eventName, jsonValue] });
    const r = await makeRequest(`${PDKS_BASE}/RedirectAjaxPage.aspx/AjaxGelenDegerler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': this.jar.toString(),
      },
      body: payload,
    });

    const decoder = new TextDecoder('windows-1254');
    const text = decoder.decode(r.body);
    const data = JSON.parse(text);
    const d    = data.d[0];

    if (d.HataKodu === 1) {
      // Session expired — retry once
      if (d.DurumMesaj && d.DurumMesaj.includes('Zaman')) {
        this.loggedIn = false;
        await this.ensureSession();
        return this.ajax(pageName, eventName, jsonValue);
      }
      throw new Error(d.DurumMesaj || 'PDKS Ajax hatası');
    }
    return d;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /** Birim (organizasyon) ağacı — 10 dk cache */
  async getBirimTree() {
    if (this._birimCache && Date.now() - this._birimCacheAt < 600_000) {
      return this._birimCache;
    }
    const d = await this.ajax('PDKS_GIRIS_CIKIS_LISTESI', 'PDKS_GIRIS_CIKIS_LISTESI_Load');
    const birimler = JSON.parse(d.DonenDeger[0]);
    this._birimCache   = birimler;
    this._birimCacheAt = Date.now();
    return birimler;
  }

  /** Verilen birim ID'lerine ait personel listesi */
  async getPersonelList(birimIds) {
    const idsStr  = birimIds.join(',');
    const jsonVal = JSON.stringify({ BIRIMLISTESI: idsStr });
    const d = await this.ajax(
      'PDKS_GIRIS_CIKIS_LISTESI',
      'PdksGirisCikisListesiButtonClick_PersonelYukle',
      jsonVal,
    );
    if (d.DonenDeger && d.DonenDeger[0]) {
      return JSON.parse(d.DonenDeger[0]);
    }
    return [];
  }

  /** Bir daire adına göre tüm alt birim ID'lerini bul */
  async findBirimIds(daireAdi) {
    const birimler = await this.getBirimTree();
    // Find top-level daire by partial name match
    const daire = birimler.find(b =>
      b.ADI.toLocaleLowerCase('tr').includes(daireAdi.toLocaleLowerCase('tr')),
    );
    if (!daire) return [];

    // BFS — collect all sub-unit IDs
    const ids = [daire.ID];
    const queue = [daire.ID];
    while (queue.length) {
      const parentId = queue.shift();
      for (const b of birimler) {
        if (b.ID_UST === parentId && !ids.includes(b.ID)) {
          ids.push(b.ID);
          queue.push(b.ID);
        }
      }
    }
    return ids;
  }

  /** Giriş-çıkış raporu — Crystal Reports HTML'den parse */
  async getAttendance(personelIds, tarih) {
    const idsStr = personelIds.join(',') + ',';
    const jsonVal = JSON.stringify({
      SAYFAADI: 'PDKS_GIRIS_CIKIS_LISTESI',
      BASLAMATARIHI: tarih,
      BITISTARIHI: tarih,
      PERSONEL_ID_LISTESI: idsStr,
    });

    const d = await this.ajax(
      'PDKS_GIRIS_CIKIS_LISTESI',
      'PdksGirisCikisListesiButtonClick_RaporAl',
      jsonVal,
    );

    const guid = d.DonenDegerStr;
    if (!guid) return [];

    // Fetch Crystal Reports from report service
    const r = await makeRequest(`${PDKS_REPORT}/MuglaBBReportService?ID=${guid}`, {
      headers: { Cookie: this.jar.toString() },
    });

    const html = r.body.toString('utf-8').replace(/\\\//g, '/');
    return this._parseReport(html);
  }

  /** Parse Crystal Reports HTML → structured records */
  _parseReport(html) {
    // Unescape HTML entities
    const unescape = (s) =>
      s.replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#220;/g, 'Ü')
        .replace(/&#199;/g, 'Ç')
        .replace(/&#214;/g, 'Ö')
        .replace(/&#350;/g, 'Ş')
        .trim();

    // Extract all <span class="UUID-N">content</span>
    const spanRe = /<span class="([^"]+)">([^<]+)<\/span>/g;
    const spans  = [];
    let m;
    while ((m = spanRe.exec(html)) !== null) {
      const cls    = m[1];
      const suffix = cls.split('-').pop();
      const value  = unescape(m[2]);
      spans.push({ suffix, value });
    }

    if (!spans.length) return [];

    // Determine which suffix = person name (class -3)
    // The name class appears after header class (S.No, Personel Adı etc.)
    // We identify it by checking which suffix has UPPERCASE names
    const records = [];
    let current   = null;

    for (const { suffix, value } of spans) {
      if (suffix === '3') {
        // Person name
        if (current) records.push(current);
        current = { adSoyad: value, giris: null, cikis: null, mGiris: null, mCikis: null, izin: null, kaynak: [] };
      } else if (current) {
        if (suffix === '4') {
          // Regular giriş / çıkış time
          if (!current.giris) current.giris = value.substring(0, 5);
          else if (!current.cikis) current.cikis = value.substring(0, 5);
        } else if (suffix === '6') {
          // M.Giriş / M.Çıkış
          if (!current.mGiris) current.mGiris = value.substring(0, 5);
          else if (!current.mCikis) current.mCikis = value.substring(0, 5);
        } else if (suffix === '5') {
          current.kaynak.push(value);
        } else if (suffix === '7') {
          current.izin = value;
        }
      }
    }
    if (current) records.push(current);

    // Determine status for each record
    return records.map((r) => {
      let durum = 'GELMEDI';
      if (r.izin) durum = 'IZINLI';
      else if (r.giris || r.mGiris) durum = 'GELDI';

      return {
        adSoyad:  r.adSoyad,
        giris:    r.giris || r.mGiris || null,
        cikis:    r.cikis || r.mCikis || null,
        izinTur:  r.izin || null,
        durum,
      };
    });
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _client = null;

async function getClient() {
  if (!_client) {
    _client = new PDKSClient();
  }
  return _client;
}

module.exports = { getClient, PDKSClient };
