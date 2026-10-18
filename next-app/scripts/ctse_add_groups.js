require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const groupsData = [
    {
        id: "group_electrician",
        name: "Trade: Electrician",
        code: "438", // Subject Code
        post_codes: ["3623", "3659", "3683", "3684", "3685", "3686", "3687", "3688"]
    },
    {
        id: "group_fitter",
        name: "Trade: Fitter",
        code: "436",
        post_codes: ["3625", "3657", "3699", "3700"]
    },
    {
        id: "group_mmv",
        name: "Trade: Mechanic Motor Vehicle",
        code: "437",
        post_codes: ["3635", "3655", "3689", "3690", "3691", "3692", "3693", "3694"]
    },
    {
        id: "group_welder",
        name: "Trade: Welder (Gas & Electric)",
        code: "440",
        post_codes: ["3647", "3658", "3695", "3696", "3697"]
    },
    {
        id: "group_rac",
        name: "Trade: Mechanic Refrigeration & AC",
        code: "435",
        post_codes: ["3637", "3661"]
    },
    {
        id: "group_surveyor",
        name: "Trade: Surveyor",
        code: "387",
        post_codes: ["3378", "3643"]
    }
];

async function addGroups() {
    console.log('🚀 Adding Subject Groups to CTSE Config...');

    // Fetch
    const { data: config } = await supabase
        .from('exam_configurations')
        .select('*')
        .eq('exam_tag', 'TNPSC_CTSE_DIP_ITI_2025')
        .single();

    if (!config) return console.error('❌ CTSE Config not found!');

    // Update
    const currentVacancies = config.vacancies || {};
    const updatedVacancies = {
        ...currentVacancies,
        groups: groupsData
    };

    const { error } = await supabase
        .from('exam_configurations')
        .update({ vacancies: updatedVacancies })
        .eq('id', config.id);

    if (error) console.error('❌ Group Update failed:', error);
    else console.log(`✅ Successfully added ${groupsData.length} groups!`);
}

addGroups();
