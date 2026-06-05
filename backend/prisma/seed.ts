import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminEmail = 'admin@example.com';
  const creatorEmail = 'creator@example.com';
  const defaultPassword = 'Password123!';

  // Hash password
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // Seed Admin User
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Seeded admin user: ${admin.email}`);

  // Seed Creator User
  const creator = await prisma.user.upsert({
    where: { email: creatorEmail },
    update: {},
    create: {
      email: creatorEmail,
      name: 'Creator User',
      password: hashedPassword,
      role: 'CREATOR',
    },
  });
  console.log(`Seeded creator user: ${creator.email}`);

  console.log('Seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
