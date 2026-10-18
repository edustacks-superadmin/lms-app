
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
    const examTag = 'CTSE_NON_INTERVIEW_2024'; // Trying to guess or I will fetch it first
    // Actually, I can fetch the exam tag from filtered results? 
    // Let's first search for Maniprakasam S without tag to find the tag?
    // No, I need tag for the query in route.js

    // I will try to fetch one result to get a valid tag
    const { data: anyRes } = await supabase.from('external_exam_results').select('exam_tag').limit(1);
    const tag = anyRes && anyRes.length > 0 ? anyRes[0].exam_tag : 'unknown';
    console.log("Using Exam Tag:", tag);

    const search = 'Maniprakasam S';

    // Reproduction of the query in route.js
    let query = supabase
        .from('external_exam_results')
        .select(`
            *,
            members!inner (
                display_name, email
            )
        `)
    // 2-Step Search Strategy
    let memberIds = [];
    if (search) {
        const safeSearch = search.replace(/ /g, ' ').trim(); // Using raw search but trusted logic
        // Search members first
        const { data: foundMembers, error: memError } = await supabase
            .from('members')
            .select('id')
            .or(`display_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`)
            .limit(50);

        if (memError) console.error("Member Search Error:", memError);
        else memberIds = foundMembers.map(m => m.id);
        console.log(`Found ${memberIds.length} matching members`);
    }

    let orConditions = [`registration_number.ilike."%${search}%"`];
    if (memberIds.length > 0) {
        orConditions.push(`member_id.in.(${memberIds.join(',')})`);
    }

    // Join with comma for OR
    query = query.or(orConditions.join(','));

    if (error) {
        console.error("Search Error:", error);
    } else {
        console.log(`Found ${data.length} results for '${search}'`);
        data.forEach(d => console.log(`- ${d.registration_number}: ${d.members.display_name}`));
    }
}

testSearch();
