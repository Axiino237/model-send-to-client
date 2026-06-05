import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log('Total users in DB:', users.length);
  for (const user of users) {
    const isPasswordValid = await bcrypt.compare('Password123!', user.password);
    console.log(`User: ${user.email}, Role: ${user.role}, Password 'Password123!' Valid?: ${isPasswordValid}`);
  }
}

check()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
