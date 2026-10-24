import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Busboy from 'busboy';

export const config = {
    api: {
        bodyParser: false, // Disables body parser so busboy can stream multipart/form-data
    },
};

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'a5f79375eda2db712fdbc2aa424d939b';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'c0108a7b550b8659a667bfe43face84d';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '170767a851d9a2b2baa276be8142cc9f442f544dd719602c4bcf5433c1139b57';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';
const R2_PUBLIC_DOMAIN = (process.env.R2_PUBLIC_DOMAIN || 'https://pub-7ebc64389e3648b195eaa7d615ca4216.r2.dev').replace(/\/$/, '');

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({
            headers: req.headers,
            limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
        });

        const fields = {};
        let fileBuffer = null;
        let fileName = 'file';
        let mimeType = 'application/octet-stream';

        busboy.on('field', (name, val) => {
            fields[name] = val;
        });

        busboy.on('file', (name, fileStream, info) => {
            fileName = info.filename || 'file';
            mimeType = info.mimeType || 'application/octet-stream';

            const chunks = [];
            fileStream.on('data', (chunk) => {
                chunks.push(chunk);
            });
            fileStream.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
            });
        });

        busboy.on('finish', () => {
            resolve({ fields, fileBuffer, fileName, mimeType });
        });

        busboy.on('error', (err) => {
            reject(err);
        });

        req.pipe(busboy);
    });
}

function readRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const contentType = req.headers['content-type'] || '';
        let fileBuffer = null;
        let fileName = 'upload.jpg';
        let mimeType = 'image/jpeg';
        let folder = 'posts';

        if (contentType.includes('multipart/form-data')) {
            const parsed = await parseMultipart(req);
            fileBuffer = parsed.fileBuffer;
            fileName = parsed.fileName;
            mimeType = parsed.mimeType;
            if (parsed.fields.folder) {
                folder = parsed.fields.folder.replace(/^\/+|\/+$/g, '');
            }
        } else if (contentType.includes('application/json')) {
            const raw = await readRawBody(req);
            const json = JSON.parse(raw || '{}');
            if (!json.file) {
                return res.status(400).json({ success: false, error: 'No file provided in JSON' });
            }
            if (json.folder) folder = json.folder.replace(/^\/+|\/+$/g, '');
            if (json.fileName) fileName = json.fileName;
            if (json.contentType) mimeType = json.contentType;

            // file could be a base64 data URL: "data:image/png;base64,..."
            let base64Data = json.file;
            const dataUrlMatch = base64Data.match(/^data:([^;]+);base64,(.+)$/);
            if (dataUrlMatch) {
                mimeType = dataUrlMatch[1];
                base64Data = dataUrlMatch[2];
            }
            fileBuffer = Buffer.from(base64Data, 'base64');
        } else {
            return res.status(400).json({ success: false, error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' });
        }

        if (!fileBuffer || fileBuffer.length === 0) {
            return res.status(400).json({ success: false, error: 'No file data received' });
        }

        // Clean file name and generate unique key
        const sanitized = fileName
            .toLowerCase()
            .replace(/[^a-z0-9._-]/g, '-')
            .replace(/-+/g, '-');
        const key = `${folder}/${Date.now()}_${sanitized}`;

        const uploadCmd = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType,
            CacheControl: 'public, max-age=31536000',
        });

        await r2Client.send(uploadCmd);

        const publicUrl = `${R2_PUBLIC_DOMAIN}/${key}`;

        return res.status(200).json({
            success: true,
            url: publicUrl,
            key: key,
            bucket: R2_BUCKET,
            size: fileBuffer.length,
            contentType: mimeType,
        });
    } catch (error) {
        console.error('[upload] Error uploading to R2:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error uploading file',
        });
    }
}
