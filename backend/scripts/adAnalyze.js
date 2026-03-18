'use strict';
const { Client } = require('ldapts');
require('dotenv').config();
const { resolveDirectorate } = require('../lib/directorateMap');

async function main() {
  const client = new Client({ url: process.env.AD_URL, strictDN: false });
  await client.bind(process.env.AD_USERNAME + '@' + process.env.AD_DOMAIN, process.env.AD_PASSWORD);

  try {
    const { searchEntries } = await client.search('OU=Staff,OU=_Users,DC=muglabb,DC=lcl', {
      scope: 'sub',
      filter: '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
      attributes: ['sAMAccountName', 'displayName', 'mail', 'department', 'title',
        'employeeID', 'employeeNumber', 'extensionAttribute1', 'otherIpPhone',
        'personalTitle', 'l', 'manager', 'distinguishedName'],
      paged: true,
      sizeLimit: 0,
    });

    console.log('Toplam aktif kullanıcı:', searchEntries.length);

    // Unique department değerleri ve mapping analizi
    const deptCounts = {};
    const unmapped = {};

    searchEntries.forEach((e) => {
      const dept = e.department ? String(e.department) : '(boş)';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;

      const { directorate } = resolveDirectorate(dept);
      if (!directorate) {
        unmapped[dept] = (unmapped[dept] || 0) + 1;
      }
    });

    console.log('\n=== UNMAPPED DEPARTMENT DEĞERLERİ ===');
    Object.entries(unmapped).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
      console.log(' [' + v + 'x]', JSON.stringify(k));
    });

    console.log('\nToplam unique department:', Object.keys(deptCounts).length);
    console.log('Unmapped unique:', Object.keys(unmapped).length);
    console.log('Unmapped kullanıcı sayısı:', Object.values(unmapped).reduce((a, b) => a + b, 0));

    // Attribute coverage analizi
    console.log('\n=== ATTRIBUTE COVERAGE ===');
    const attrs = ['mail', 'title', 'department', 'employeeID', 'employeeNumber', 'extensionAttribute1', 'otherIpPhone', 'personalTitle', 'l', 'manager'];
    attrs.forEach((attr) => {
      const filled = searchEntries.filter((e) => e[attr] && String(e[attr]).trim()).length;
      const pct = Math.round(filled / searchEntries.length * 100);
      console.log(` ${attr}: ${filled}/${searchEntries.length} (${pct}%)`);
    });

    // Örnek kullanıcı - tüm dolu alanlar
    console.log('\n=== ÖRNEK KULLANICI (en çok dolu alan) ===');
    const sample = searchEntries[0];
    console.log(JSON.stringify({
      sAMAccountName: sample.sAMAccountName,
      displayName: sample.displayName,
      mail: sample.mail,
      department: sample.department,
      title: sample.title,
      employeeID: sample.employeeID,
      employeeNumber: sample.employeeNumber,
      extensionAttribute1: sample.extensionAttribute1,
      otherIpPhone: sample.otherIpPhone,
      personalTitle: sample.personalTitle,
      l: sample.l,
    }, null, 2));

  } finally {
    await client.unbind().catch(() => {});
  }
}
main().catch(console.error);
