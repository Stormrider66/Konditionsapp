const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.athleteAccount.findMany({
  include: { user: true, client: true },
  take: 5
})
.then(r => {
  if (r.length === 0) {
    console.log('No athlete accounts found');
    return;
  }
  console.log('Found', r.length, 'athlete accounts:');
  r.forEach(a => console.log('- Email:', a.user?.email, '| Client:', a.client?.name));
})
.catch(e => console.log('Error:', e.message))
.finally(() => p.$disconnect());
