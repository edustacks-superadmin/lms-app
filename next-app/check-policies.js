const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const res = await prisma.$queryRawUnsafe(`
            SELECT tablename, policyname, cmd, qual 
            FROM pg_policies 
            WHERE tablename IN ('questions', 'question_options', 'exam_questions')
        `);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
