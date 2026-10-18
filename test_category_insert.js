import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
    console.log('Testing insert into product_categories...');
    const { data, error } = await supabase
        .from('product_categories')
        .insert([{ name: 'Test Category', slug: 'test-category' }])
        .select();

    if (error) {
        console.log('❌ Error:', error.message);
    } else {
        console.log('✅ Inserted:', data);
    }
}

testInsert();
