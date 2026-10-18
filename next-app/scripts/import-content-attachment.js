const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// R2 Setup
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function importAttachment(contentId, existingPrisma = null, authToken = null) {
    const db = existingPrisma || prisma;

    if (!contentId) {
        throw new Error('Please provide a content ID as an argument.');
    }

    try {
        const baseUrl = process.env.TESTPRESS_BASE_URL || 'https://maheshiesacademy.testpress.in';
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        let authHeader = authToken;

        // 1. Authenticate if no token provided
        if (!authHeader) {
            console.log('Authenticating with Testpress...');
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
            authHeader = `JWT ${token}`;
            console.log('Authenticated.');
        }

        // 2. Fetch Content Details
        // console.log(`Fetching content details for ${contentId}...`); 
        const contentRes = await fetch(`${cleanBaseUrl}/api/v2.5/admin/chapter_contents/${contentId}/`, {
            headers: { Authorization: authHeader }
        });

        if (!contentRes.ok) throw new Error(`Failed to fetch content: ${await contentRes.text()}`);
        const contentData = await contentRes.json();

        if (!contentData.attachment || !contentData.attachment.attachment_url) {
            // Check if it's already a Supabase URL? No, we filter those out in bulk script.
            // But if there is NO attachment, we can't import.
            console.log(`No attachment found for ${contentId}. Skipping.`);
            return false;
        }

        const attachmentUrl = contentData.attachment.attachment_url;
        const fileName = `imported_${contentId}_${path.basename(attachmentUrl.split('?')[0])}`;

        // 3. Download File
        const fileRes = await fetch(attachmentUrl);
        if (!fileRes.ok) throw new Error(`Failed to download file: ${fileRes.statusText}`);
        const arrayBuffer = await fileRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);


        // 4. Upload to Supabase
        // 4. Upload to Cloudflare R2
        const bucketName = process.env.R2_BUCKET_NAME || 'lms-assets';
        console.log(`Uploading to R2 bucket '${bucketName}' path 'attachments/${fileName}'...`);

        const key = `attachments/${fileName}`;
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: 'application/pdf',
        });

        await r2Client.send(command);

        // Construct Public URL
        let publicUrl;
        const r2Domain = process.env.R2_PUBLIC_DOMAIN;
        if (r2Domain) {
            publicUrl = `${r2Domain}/${key}`;
        } else {
            // Fallback to R2 dev URL (usually not public unless configured)
            // Warning: R2 doesn't have a default "public" URL structure like Supabase without domain mapping or public bucket access enabled.
            // Assuming user has set up a domain or we use the S3 endpoint (which isn't usually public viewable).
            // For now, if no domain, we'll construct a likely URL but log a warning.
            const accountId = process.env.R2_ACCOUNT_ID;
            publicUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;
            if (!r2Domain) console.warn('WARNING: R2_PUBLIC_DOMAIN not set. The generated URL might not be publicly accessible.');
        }

        console.log(`Uploaded successfully to R2. URL: ${publicUrl}`);

        // 5. Update Database
        let localContent;
        localContent = await db.chapter_contents.findFirst({ where: { testpress_id: parseInt(contentId) } });
        if (!localContent) {
            localContent = await db.chapter_contents.findUnique({ where: { id: parseInt(contentId) } });
        }

        if (localContent) {
            await db.chapter_contents.update({
                where: { id: localContent.id },
                data: {
                    url: publicUrl,
                    // type: 'pdf' // COMMENTED OUT: Keeping original type 'file' to prevent frontend breakage
                }
            });
            console.log(`Success: ${contentId} -> ${localContent.id}`);
            return true;
        } else {
            console.error(`Could not find local record for ${contentId}`);
            return false;
        }

    } catch (error) {
        throw error; // Re-throw so bulk script sees it
    } finally {
        if (!existingPrisma) {
            await db.$disconnect();
        }
    }
}

if (require.main === module) {
    const idArg = process.argv[2];
    importAttachment(idArg).catch(console.error);
}

module.exports = { importAttachment };
