const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { importAttachment } = require('./import-content-attachment');

// Load Env
function loadEnv(filename) {
    try {
        const envPath = path.resolve(__dirname, '..', filename);
        if (!fs.existsSync(envPath)) return;
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w_.]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                process.env[match[1]] = match[2]?.replace(/^['"]|['"]$/g, '');
            }
        });
    } catch (e) { }
}
loadEnv('.env.local');
loadEnv('.env');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fetching chapter contents with type="file" that need migration...');

        // Find contents that are 'file', have a testpress_id, and are NOT already on Supabase
        let contents = await prisma.chapter_contents.findMany({
            where: {
                type: 'file',
                testpress_id: { not: null },
                OR: [
                    { url: null },
                    {
                        NOT: {
                            url: {
                                contains: 'r2.dev'
                            }
                        }
                    }
                ]
            },
            select: {
                id: true,
                testpress_id: true,
                title: true,
                url: true
            },
            orderBy: {
                id: 'asc'
            }
        });

        const limitArg = process.argv[2] ? parseInt(process.argv[2]) : null;
        if (limitArg && !isNaN(limitArg)) {
            console.log(`Limiting processing to first ${limitArg} items.`);
            contents = contents.slice(0, limitArg);
        }

        console.log(`Found ${contents.length} contents to migrate (after limit).`);

        if (contents.length === 0) {
            console.log('No contents needing migration found.');
            return;
        }

        // Authenticate ONCE
        console.log('Authenticating with Testpress...');
        const baseUrl = process.env.TESTPRESS_BASE_URL || 'https://maheshiesacademy.testpress.in';
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const authUrl = `${cleanBaseUrl}/api/v2.5/auth-token/`;

        const authRes = await fetch(authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: process.env.TESTPRESS_USERNAME,
                password: process.env.TESTPRESS_PASSWORD
            })
        });

        if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
        const { token } = await authRes.json();
        const authToken = `JWT ${token}`;
        console.log('Authentication successful. Token obtained.');


        let successCount = 0;
        let failCount = 0;

        for (const [index, content] of contents.entries()) {
            process.stdout.write(`\r[${index + 1}/${contents.length}] Processing: ${content.testpress_id}... `);
            try {
                const result = await importAttachment(content.testpress_id, prisma, authToken);
                if (result) {
                    successCount++;
                    process.stdout.write('OK\n');
                } else {
                    failCount++;
                    process.stdout.write('SKIP\n');
                }
            } catch (e) {
                console.error(`\nFailed to process ${content.testpress_id}:`, e.message);
                failCount++;
            }
            // Add a delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('\n-----------------------------------');
        console.log('Bulk Import Completed');
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log('-----------------------------------');

    } catch (e) {
        console.error('Fatal error in bulk import:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
