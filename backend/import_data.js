const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('c:/Users/LENOVO/db_export.json', 'utf8'));

  console.log('Clearing local database...');
  await prisma.video.deleteMany();
  await prisma.modelFile.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.analytics.deleteMany();
  await prisma.share.deleteMany();
  await prisma.model.deleteMany();
  await prisma.user.deleteMany();

  console.log('Inserting Users...');
  if (data.users.length) await prisma.user.createMany({ data: data.users });

  console.log('Inserting Models...');
  if (data.models.length) await prisma.model.createMany({ data: data.models });

  console.log('Inserting Shares...');
  if (data.shares.length) await prisma.share.createMany({ data: data.shares });

  console.log('Inserting Analytics...');
  if (data.analytics.length) await prisma.analytics.createMany({ data: data.analytics });

  console.log('Inserting Photos...');
  if (data.photos.length) await prisma.photo.createMany({ data: data.photos });

  console.log('Inserting Attachments...');
  if (data.attachments.length) await prisma.attachment.createMany({ data: data.attachments });

  console.log('Inserting ModelFiles...');
  if (data.modelFiles.length) await prisma.modelFile.createMany({ data: data.modelFiles });

  console.log('Inserting Videos...');
  if (data.videos.length) await prisma.video.createMany({ data: data.videos });

  console.log('✅ Local database successfully synced with remote data!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
