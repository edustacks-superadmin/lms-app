import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDate(date) {
    try {
        return new Date(date).toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'maheshiesacademy.edustacks.co.in';
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const baseUrl = `${proto}://${host}`;

        // Resolve institute ID based on subdomain
        let instituteId = null;
        try {
            let slug = 'maheshiesacademy';
            const parts = host.split('.');
            if (parts.length > 2) {
                slug = parts[0].toLowerCase();
            }
            const { data: inst } = await supabase
                .from('institute_settings')
                .select('id')
                .eq('slug', slug)
                .maybeSingle();

            if (inst?.id) {
                instituteId = inst.id;
            } else {
                instituteId = 10;
            }
        } catch (e) {
            console.warn('Error resolving institute for sitemap:', e.message);
            instituteId = 10;
        }

        // 1. Static Public Pages
        const staticPages = [
            { path: '/', priority: '1.0', changefreq: 'daily' },
            { path: '/home', priority: '0.9', changefreq: 'daily' },
            { path: '/posts', priority: '0.9', changefreq: 'daily' },
            { path: '/store', priority: '0.9', changefreq: 'daily' },
            { path: '/contact-us', priority: '0.7', changefreq: 'monthly' },
            { path: '/login', priority: '0.6', changefreq: 'monthly' },
            { path: '/student/signup', priority: '0.7', changefreq: 'monthly' },
            { path: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
            { path: '/terms-and-conditions', priority: '0.5', changefreq: 'yearly' },
            { path: '/refund-policy', priority: '0.5', changefreq: 'yearly' },
            { path: '/shipping-policy', priority: '0.5', changefreq: 'yearly' }
        ];

        // 2. Fetch Active Products filtered by instituteId
        let products = [];
        try {
            let prodQuery = supabase
                .from('products')
                .select('id, slug, updated_at, created_at')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(500);

            if (instituteId) {
                prodQuery = prodQuery.eq('institute_id', instituteId);
            }

            const { data } = await prodQuery;
            products = data || [];
        } catch (e) {
            console.warn('Error fetching products for sitemap:', e.message);
        }

        // 3. Fetch Public Posts filtered by instituteId
        let posts = [];
        try {
            let postsQuery = supabase
                .from('posts')
                .select('id, slug, publication_date, created_at')
                .eq('is_deleted', false)
                .eq('access_control', 'Public')
                .order('created_at', { ascending: false })
                .limit(500);

            if (instituteId) {
                postsQuery = postsQuery.eq('institute_id', instituteId);
            }

            const { data, error } = await postsQuery;
            if (error) throw error;
            posts = data || [];
        } catch (e) {
            console.warn('Error fetching posts for sitemap:', e.message);
        }

        const today = new Date().toISOString().split('T')[0];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Add static pages
        for (const page of staticPages) {
            xml += `  <url>\n`;
            xml += `    <loc>${escapeXml(`${baseUrl}${page.path}`)}</loc>\n`;
            xml += `    <lastmod>${today}</lastmod>\n`;
            xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
            xml += `    <priority>${page.priority}</priority>\n`;
            xml += `  </url>\n`;
        }

        // Add products
        for (const prod of products) {
            const lastmod = formatDate(prod.updated_at || prod.created_at || today);
            const prodUrl = prod.slug
                ? `${baseUrl}/student/store/product/${prod.slug}`
                : `${baseUrl}/student/store/product/${prod.id}`;

            xml += `  <url>\n`;
            xml += `    <loc>${escapeXml(prodUrl)}</loc>\n`;
            xml += `    <lastmod>${lastmod}</lastmod>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>0.8</priority>\n`;
            xml += `  </url>\n`;
        }

        // Add posts
        for (const post of posts) {
            const lastmod = formatDate(post.publication_date || post.created_at || today);
            const postUrl = post.slug
                ? `${baseUrl}/post/${post.slug}`
                : `${baseUrl}/post/${post.id}`;

            xml += `  <url>\n`;
            xml += `    <loc>${escapeXml(postUrl)}</loc>\n`;
            xml += `    <lastmod>${lastmod}</lastmod>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>0.7</priority>\n`;
            xml += `  </url>\n`;
        }

        xml += `</urlset>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200');
        return res.status(200).send(xml);

    } catch (error) {
        console.error('Error generating sitemap:', error);
        return res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
}
