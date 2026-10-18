require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Import Chunks
const chunk1 = require('./ctse_data_chunk1');
const chunk2 = require('./ctse_data_chunk2');
const chunk3 = require('./ctse_data_chunk3');
const chunk4 = require('./ctse_data_chunk4');
const chunk5 = require('./ctse_data_chunk5');

// Combine
const fullPostsData = [...chunk1, ...chunk2, ...chunk3, ...chunk4, ...chunk5];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log(`🚀 Seeding CTSE Exam Config with ${fullPostsData.length} posts...`);

    const examData = {
        exam_name: "Combined Technical Services Examination (Diploma / ITI Level)", // Corrected from 'name'
        // notification_id column likely doesn't exist based on inspection, so omitting or mapping if needed. 
        // Logic: The 'year' column exists. Let's use 2025.
        year: "2025",
        exam_tag: "TNPSC_CTSE_DIP_ITI_2025",
        created_at: new Date().toISOString(),
        is_active: true,
        vacancies: {
            posts: fullPostsData,
            groups: [],
            meta: {
                notification_no: "10/2025" // Storing notification ID in JSON metadata
            }
        }
    };

    // Check if exists
    const { data: existing } = await supabase
        .from('exam_configurations')
        .select('id')
        .eq('exam_tag', 'TNPSC_CTSE_DIP_ITI_2025')
        .single();

    if (existing) {
        console.log('🔄 Updating existing configuration...');
        const { error } = await supabase
            .from('exam_configurations')
            .update({
                vacancies: examData.vacancies,
                exam_name: examData.exam_name
            })
            .eq('id', existing.id);

        if (error) console.error('❌ Update failed:', error);
        else console.log('✅ Update successful!');
    } else {
        console.log('🆕 Creating new configuration...');
        const { error } = await supabase
            .from('exam_configurations')
            .insert([examData]);

        if (error) console.error('❌ Insert failed:', error);
        else console.log('✅ Creation successful!');
    }
}

seed();
