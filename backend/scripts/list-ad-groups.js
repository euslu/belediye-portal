require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('ldapts');

async function main() {
  const client = new Client({ url: process.env.AD_URL });

  await client.bind(
    `${process.env.AD_USERNAME}@${process.env.AD_DOMAIN}`,
    process.env.AD_PASSWORD
  );

  const { searchEntries } = await client.search(process.env.AD_BASE_DN, {
    scope:      'sub',
    filter:     '(objectClass=group)',
    attributes: ['cn', 'description', 'member'],
  });

  const groups = searchEntries.map((e) => ({
    name: String(e.cn || ''),
    desc: e.description ? String(e.description) : '',
    memberCount: Array.isArray(e.member) ? e.member.length : e.member ? 1 : 0,
  }));

  groups.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  console.log(`\nToplam ${groups.length} grup bulundu:\n`);
  groups.forEach((g) => {
    const desc = g.desc ? `  — ${g.desc}` : '';
    console.log(`  ${g.name} (${g.memberCount} üye)${desc}`);
  });

  await client.unbind();
}

main().catch((err) => {
  console.error('Hata:', err.message);
  process.exit(1);
});
