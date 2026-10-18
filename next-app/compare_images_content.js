const https = require('https');
const crypto = require('crypto');

const url1 = 'https://xalbtjoykovnlbjeddtv.supabase.co/storage/v1/object/public/avatars/13752.png';
const url2 = 'https://xalbtjoykovnlbjeddtv.supabase.co/storage/v1/object/public/avatars/13750.png';

function getHash(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status code ${res.statusCode}`));
                return;
            }

            const hash = crypto.createHash('md5');
            let size = 0;

            res.on('data', (chunk) => {
                hash.update(chunk);
                size += chunk.length;
            });

            res.on('end', () => {
                resolve({
                    hash: hash.digest('hex'),
                    size: size
                });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function verifyIdentity() {
    try {
        console.log('Fetching first image...');
        const result1 = await getHash(url1);
        console.log(`Image 1: Size=${result1.size}, Hash=${result1.hash}`);

        console.log('Fetching second image...');
        const result2 = await getHash(url2);
        console.log(`Image 2: Size=${result2.size}, Hash=${result2.hash}`);

        if (result1.hash === result2.hash && result1.size === result2.size) {
            console.log('CONCLUSION: The images are IDENTICAL.');
        } else {
            console.log('CONCLUSION: The images are DIFFERENT.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

verifyIdentity();
