import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await argon2.hash('admin123');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Clínica Dr. Manoel',
      document: '00000000000000',
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@drmanoel.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log('Seed criado com sucesso! Cliente e Usuário Admin inseridos.');
}

main()
  .catch((e) => {
    console.error('Erro ao executar o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
