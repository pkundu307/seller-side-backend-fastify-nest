"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
const permissions = [
    { action: 'read', subject: 'Order' },
    { action: 'update', subject: 'Order' },
    { action: 'create', subject: 'Product' },
    { action: 'read', subject: 'Product' },
    { action: 'update', subject: 'Product' },
    { action: 'delete', subject: 'Product' },
    { action: 'read', subject: 'Analytics' },
    { action: 'manage', subject: 'Staff' },
    { action: 'read', subject: 'Payout' },
];
async function main() {
    console.log('Start seeding...');
    console.log('Seeding permissions...');
    await prisma.permission.createMany({
        data: permissions,
        skipDuplicates: true,
    });
    console.log('Permissions seeded.');
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
                role: 'admin',
            },
        });
        console.log('Admin user created. Email: admin@jottosop.com, Password: AdminPassword123!');
    }
    else {
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
//# sourceMappingURL=seed.js.map