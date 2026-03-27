const crypto = require('crypto');

// Self-signed sertifika bypass
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const FLEXCITY_CONFIG = {
  sisUrl:  process.env.FLEXCITY_SIS_URL || 'https://ybs.mugla.bel.tr:8081/FlexCityUi/rest/json/sis/RestDataset',
  kbsUrl:  process.env.FLEXCITY_KBS_URL || 'https://ybs.mugla.bel.tr:8081/FlexCityUi/rest/json/kbs/FindAllKbsOrgutDto',
  apiKey:  process.env.FLEXCITY_API_KEY || 'njSVunfF3IrwRwQ0kK2eyMjHiswYWZSinNKPLQGLb1oqo2eJF4ujQ4UgzNqaQgp8NAwmW0RrhG83eklHMiIcq5cTLTJJjhguewKJAvS8HUkZBAYqZNbLmt2sgmboqC4Z',
  appKey:  process.env.FLEXCITY_APP_KEY || 'PBS_PERSONEL',
};

function getAuthHeader() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const offset = '+03:00';
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${offset}`;
  const md5Hash = crypto.createHash('md5').update(FLEXCITY_CONFIG.apiKey + dateStr, 'utf8').digest('hex').toLowerCase();
  return `applicationkey=${FLEXCITY_CONFIG.appKey},requestdate=${dateStr},md5hashcode=${md5Hash}`;
}

async function fetchPersonel() {
  const r = await fetch(FLEXCITY_CONFIG.sisUrl, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'datasetName=ldap_pbs_personel',
  });
  if (!r.ok) throw new Error(`SIS HTTP ${r.status}`);
  const data = await r.json();
  return data.resultSet || data.data || data || [];
}

async function fetchOrgut() {
  const r = await fetch(FLEXCITY_CONFIG.kbsUrl, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'tumu=EVET',
  });
  if (!r.ok) throw new Error(`KBS HTTP ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data.kbsOrgutDtoList || data.resultSet || data.data || []);
}

module.exports = { fetchPersonel, fetchOrgut, getAuthHeader };
