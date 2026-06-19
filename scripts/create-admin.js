// One-off: create/upsert the admin account ONLY (no dummy data).
// Usage: DATABASE_URL=<url> ADMIN_EMAIL=.. ADMIN_PASSWORD=.. node scripts/create-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  const email = process.env.ADMIN_EMAIL || 'admin@kostfind.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Administrator';
  const hash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'admin', isVerified: true, isActive: true, password_hash: hash, name },
    create: { name, email, password_hash: hash, role: 'admin', isVerified: true, isActive: true },
    select: { id: true, email: true, name: true, role: true, isVerified: true, isActive: true },
  });

  console.log('ADMIN_OK ' + JSON.stringify(admin));
  await prisma.$disconnect();
})().catch((e) => { console.error('ADMIN_ERR', e.message); process.exit(1); });
