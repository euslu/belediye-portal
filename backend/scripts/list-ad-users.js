require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('ldapts');

async function main() {
  const client = new Client({ url: process.env.AD_URL });

  await client.bind(
    `${process.env.AD_USERNAME}@${process.env.AD_DOMAIN}`,
    process.env.AD_PASSWORD
  );

  const { searchEntries } = await client.search(process.env.AD_BASE_DN, {
    scope:  'sub',
    filter: '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
    attributes: ['sAMAccountName', 'displayName', 'mail', 'department', 'title'],
    paged: { pageSize: 200 },
  });

  const users = searchEntries.map((e) => ({
    username:    String(e.sAMAccountName || ''),
    displayName: String(e.displayName    || ''),
    email:       e.mail       ? String(e.mail)       : '',
    department:  e.department ? String(e.department) : '',
    title:       e.title      ? String(e.title)      : '',
  }));

  users.sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));

  console.log(`\nToplam ${users.length} aktif kullanıcı:\n`);
  users.forEach((u) => {
    console.log(`  ${u.displayName.padEnd(30)} | ${u.username.padEnd(25)} | ${u.department}`);
  });

  await client.unbind();
}

main().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
