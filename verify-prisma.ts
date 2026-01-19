import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });
import prisma from './src/infrastructure/persistence/client';

async function main() {
    console.log('Connecting to database...');
    try {
        // 1. Check connection
        await prisma.$connect();
        console.log('Successfully connected to database.');

        // 2. Simple query
        const userCount = await prisma.user.count();
        console.log(`Current user count: ${userCount}`);

        // 3. Create a test user (optional, maybe skip if we don't want side effects, or use transaction and rollback)
        // For now, just reading is safe enough to verify migration of schema read.
        const users = await prisma.user.findMany({ take: 1 });
        console.log('Sample user:', users[0] || 'No users found');

        console.log('Verification successful.');
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
