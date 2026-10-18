
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateConfig() {
    const postBreakdown = [
        { code: '1656', dept: 'Water Resources', gt_gen: 12, gt_pstm: 3, mbc_gen: 8, mbc_pstm: 2 },
        { code: '1661', dept: 'Highways', gt_gen: 16, gt_pstm: 4, mbc_gen: 10, mbc_pstm: 2 },
        { code: '1660', dept: 'Rural Dev', gt_gen: 7, gt_pstm: 2, mbc_gen: 4, mbc_pstm: 2 },
        { code: '3273', dept: 'Adi Dravidar Housing', gt_gen: 4, gt_pstm: 1, mbc_gen: 2, mbc_pstm: 1 },
        { code: '3368', dept: 'SIPCOT', gt_gen: 4, gt_pstm: 1, mbc_gen: 3, mbc_pstm: 0 },
        { code: '3531', dept: 'TN Housing Board', gt_gen: 2, gt_pstm: 0, mbc_gen: 1, mbc_pstm: 1 },
        { code: '3351', dept: 'TN Police Housing', gt_gen: 1, gt_pstm: 0, mbc_gen: 1, mbc_pstm: 0 },
        { code: '3232', dept: 'CMDA', gt_gen: 1, gt_pstm: 0, mbc_gen: 1, mbc_pstm: 0 },
        { code: '3663', dept: 'Maritime Board', gt_gen: 0, gt_pstm: 0, mbc_gen: 0, mbc_pstm: 0 },
        { code: '3270', dept: 'TWAD Board', gt_gen: 0, gt_pstm: 0, mbc_gen: 0, mbc_pstm: 0 }
    ];

    const updatedVacancies = {
        // Group of 10 Civil Posts - CALIBRATED with G/W/PSTM
        "CivilAE_Group": {
            "GT": { "gen": 47, "women": 29, "pstm": 11, "total": 87 },
            "BC": { "total": 70 },
            "MBC/DC": { "gen": 30, "women": 18, "pstm": 8, "total": 56 },
            "SC": { "total": 41 },
            "BCM": { "total": 11 },
            "SCA": { "total": 8 },
            "ST": { "total": 1 },
            "post_breakdown": postBreakdown
        },
        "Junior Planner": {
            "GT": { "gen": 6, "women": 2, "pstm": 2, "total": 10 },
            "BC": { "gen": 4, "women": 1, "pstm": 2, "total": 7 },
            "BCM": { "gen": 0, "women": 1, "pstm": 0, "total": 1 },
            "MBC/DC": { "gen": 5, "women": 1, "pstm": 0, "total": 6 },
            "SC": { "gen": 2, "women": 2, "pstm": 0, "total": 4 },
            "SCA": { "gen": 0, "women": 0, "pstm": 1, "total": 1 },
            "ST": { "gen": 0, "women": 0, "pstm": 1, "total": 1 }
        },
        "AE_Civil_HRCE": {
            "GT": { "gen": 6, "women": 3, "pstm": 3, "total": 12 },
            "BC": { "gen": 7, "women": 3, "pstm": 1, "total": 11 },
            "MBC/DC": { "gen": 5, "women": 2, "pstm": 1, "total": 8 },
            "SC": { "gen": 3, "women": 2, "pstm": 1, "total": 6 },
            "SCA": { "gen": 0, "women": 0, "pstm": 2, "total": 2 },
            "BCM": { "total": 0 },
            "ST": { "total": 0 }
        },
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

    console.log('Successfully updated with Per-Post Civil AE Breakdown.');
}

updateConfig();
