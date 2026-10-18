
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateConfig() {
    const updatedVacancies = {
        // Group of 10 Civil Posts (3270, 3531, 1656, 3232, 1660, 1661, 3663, 3368, 3351, 3273)
        "CivilAE_Group": {
            "GT": 87,
            "BC": 70,
            "MBC/DC": 56,
            "SC": 41,
            "BCM": 11,
            "SCA": 8,
            "ST": 1
        },
        // Junior Planner (3602)
        "Junior Planner": {
            "GT": 10,
            "BC": 7,
            "BCM": 1,
            "MBC/DC": 6,
            "SC": 4,
            "SCA": 1,
            "ST": 1
        },
        // AE (Civil) HR&CE (3603)
        "AE_Civil_HRCE": {
            "GT": 12,
            "BC": 11,
            "MBC/DC": 8,
            "SC": 6,
            "SCA": 2,
            "BCM": 0,
            "ST": 0
        },
        // Assistant Engineer (Agricultural Engineering) (1667)
        "AE_Agricultural": {
            "GT": 36,
            "BC": 30,
            "BCM": 5,
            "MBC/DC": 23,
            "SC": 18,
            "SCA": 3,
            "ST": 1
        },
        "Electrical": {
            "BC": 8,
            "GT": 10,
            "SC": 4,
            "ST": 0,
            "BCM": 1,
            "SCA": 1,
            "MBC/DC": 6
        },
        "Mechanical": {
            "BC": 12,
            "GT": 15,
            "SC": 5,
            "ST": 1,
            "BCM": 2,
            "SCA": 1,
            "MBC/DC": 8
        }
    };

    const { data, error } = await supabase
        .from('exam_configurations')
        .update({
            exam_name: 'Combined Technical Services Examination (Non - Interview Posts)',
            vacancies: updatedVacancies
        })
        .eq('exam_tag', 'TNPSC_AE_2024');

    if (error) {
        console.error('Error updating config:', error);
        return;
    }

    console.log('Successfully updated exam configurations with Agricultural AE data.');
}

updateConfig();
