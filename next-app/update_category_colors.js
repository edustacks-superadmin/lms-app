const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Nice vibrant colors for categories
const categoryColors = {
    'Mahesh IES Academy': '#2563eb', // Blue
    'TNPSC': '#059669',              // Emerald
    'SSC': '#d97706',                // Amber
    'APPSC': '#7c3aed',              // Violet
    'RRB': '#dc2626',                // Red
    'TRB': '#0891b2',                // Cyan
    'TNPSC-JDO': '#16a34a',          // Green
    'TNPSC-AE': '#ea580c',           // Orange
    'ESE': '#4f46e5',                // Indigo
    'GATE': '#be185d',               // Pink
};

async function updateCategoryColors() {
    console.log('Updating category colors...\n');

    for (const [name, color] of Object.entries(categoryColors)) {
        const { data, error } = await supabase
            .from('categories')
            .update({ color })
            .eq('name', name)
            .select();

        if (error) {
            console.error(`❌ Error updating ${name}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`✅ Updated ${name} -> ${color}`);
        } else {
            console.log(`⚠️  Category "${name}" not found`);
        }
    }

    console.log('\nDone!');
}

updateCategoryColors();
