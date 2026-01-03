import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// --- Define all possible permissions for your platform ---
const permissions: Prisma.PermissionCreateManyInput[] = [
  // Order Permissions
  { action: 'read', subject: 'Order' },
  { action: 'update', subject: 'Order' },
  // Product Permissions
  { action: 'create', subject: 'Product' },
  { action: 'read', subject: 'Product' },
  { action: 'update', subject: 'Product' },
  { action: 'delete', subject: 'Product' },
  // Analytics Permissions
  { action: 'read', subject: 'Analytics' },
  // Staff Permissions
  { action: 'manage', subject: 'Staff' }, // 'manage' can be a shorthand for CRUD
  // Payout Permissions
  { action: 'read', subject: 'Payout' },
];

async function main() {
  console.log('Start seeding...');

  // 1. Seed Permissions
  console.log('Seeding permissions...');
  await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true,
  });
  console.log('Permissions seeded.');

  // 2. Seed Admin User
  console.log('Seeding admin user...');
  const adminEmail = 'admin@jottosop.com';
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Platform Admin',
        role: 'admin', // Ensure your User model has a role field
      },
    });
    console.log('Admin user created. Email: admin@jottosop.com, Password: AdminPassword123!');
  } else {
    console.log('Admin user already exists.');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });