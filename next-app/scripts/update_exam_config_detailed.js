
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateConfig() {
    const updatedVacancies = {
        // Group of 10 Civil Posts - Minimal breakdown as full G/W/PSTM wasn't provided for the 274 grand total sum
        "CivilAE_Group": {
            "GT": { "total": 87 },
            "BC": { "total": 70 },
            "MBC/DC": { "total": 56 },
            "SC": { "total": 41 },
            "BCM": { "total": 11 },
            "SCA": { "total": 8 },
            "ST": { "total": 1 }
        },
        // Junior Planner (3602) - FULL BREAKDOWN
        "Junior Planner": {
            "GT": { "gen": 6, "women": 2, "pstm": 2, "total": 10 },
            "BC": { "gen": 4, "women": 1, "pstm": 2, "total": 7 },
            "BCM": { "gen": 0, "women": 1, "pstm": 0, "total": 1 },
            "MBC/DC": { "gen": 5, "women": 1, "pstm": 0, "total": 6 },
            "SC": { "gen": 2, "women": 2, "pstm": 0, "total": 4 },
            "SCA": { "gen": 0, "women": 0, "pstm": 1, "total": 1 },
            "ST": { "gen": 0, "women": 0, "pstm": 1, "total": 1 }
        },
        // AE (Civil) HR&CE (3603) - FULL BREAKDOWN
        "AE_Civil_HRCE": {
            "GT": { "gen": 6, "women": 3, "pstm": 3, "total": 12 },
            "BC": { "gen": 7, "women": 3, "pstm": 1, "total": 11 },
            "MBC/DC": { "gen": 5, "women": 2, "pstm": 1, "total": 8 },
            "SC": { "gen": 3, "women": 2, "pstm": 1, "total": 6 },
            "SCA": { "gen": 0, "women": 0, "pstm": 2, "total": 2 },
            "BCM": { "total": 0 },
            "ST": { "total": 0 }
        },
        // AE Agricultural (1667) - FULL BREAKDOWN
        "AE_Agricultural": {
            "GT": { "gen": 19, "women": 9, "pstm": 6, "total": 36 },
            "BC": { "gen": 16, "women": 8, "pstm": 5, "total": 30 },
            "BCM": { "gen": 3, "women": 0, "pstm": 2, "total": 5 },
            "MBC/DC": { "gen": 14, "women": 4, "pstm": 5, "total": 23 },
            "SC": { "gen": 8, "women": 4, "pstm": 5, "total": 18 },
            "SCA": { "gen": 1, "women": 1, "pstm": 1, "total": 3 },
            "ST": { "gen": 1, "women": 0, "pstm": 0, "total": 1 }
        }
    };

    const { data, error } = await supabase
        .from('exam_configurations')
        .update({ vacancies: updatedVacancies })
        .eq('exam_tag', 'TNPSC_AE_2024');

    if (error) {
        console.error('Error updating config:', error);
        return;
    }

    console.log('Successfully updated exam configurations with DETAILED Gen/Women/PSTM data.');
}

updateConfig();
