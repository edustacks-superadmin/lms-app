const https = require('https');

const SUPABASE_URL = "https://xalbtjoykovnlbjeddtv.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c";

const url = `${SUPABASE_URL}/rest/v1/products?select=title,image&limit=10&order=created_at.desc`;

const options = {
    headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
    }
};

https.get(url, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const products = JSON.parse(data);
            console.log(JSON.stringify(products, null, 2));
        } catch (e) {
            console.error(e.message);
        }
    });

}).on('error', (err) => {
    console.error("Error: " + err.message);
});
