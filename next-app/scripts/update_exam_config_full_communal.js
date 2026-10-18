
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateConfig() {
    const postBreakdown = [
        {
            code: '1656', dept: 'Water Resources',
            gt_gen: 12, gt_women_gen: 5, gt_women_pstm: 2, gt_pstm: 3,
            mbc_gen: 8, mbc_women_gen: 4, mbc_women_pstm: 1, mbc_pstm: 2,
            bc_gen: 10, bc_women_gen: 5, bc_women_pstm: 2, bc_pstm: 2,
            sc_gen: 6, sc_women_gen: 3, sc_women_pstm: 1, sc_pstm: 1,
            sca_gen: 1, sca_women_gen: 1, sca_women_pstm: 0, sca_pstm: 0,
            bcm_gen: 1, bcm_women_gen: 1, bcm_pstm: 0
        },
        {
            code: '1661', dept: 'Highways',
            gt_gen: 16, gt_women_gen: 5, gt_women_pstm: 2, gt_pstm: 4,
            mbc_gen: 10, mbc_women_gen: 5, mbc_women_pstm: 1, mbc_pstm: 2,
            bc_gen: 12, bc_women_gen: 6, bc_women_pstm: 2, bc_pstm: 3,
            sc_gen: 8, sc_women_gen: 4, sc_women_pstm: 1, sc_pstm: 2,
            sca_gen: 1, sca_women_gen: 0, sca_women_pstm: 0, sca_pstm: 1,
            bcm_gen: 2, bcm_women_gen: 1, bcm_pstm: 0
        },
        {
            code: '1660', dept: 'Rural Dev',
            gt_gen: 7, gt_women_gen: 3, gt_women_pstm: 1, gt_pstm: 2,
            mbc_gen: 4, mbc_women_gen: 1, mbc_women_pstm: 1, mbc_pstm: 2,
            bc_gen: 5, bc_women_gen: 2, bc_women_pstm: 1, bc_pstm: 1,
            sc_gen: 3, sc_women_gen: 1, sc_women_pstm: 1, sc_pstm: 1,
            sca_gen: 1, sca_women_gen: 0, sca_women_pstm: 0, sca_pstm: 0,
            bcm_gen: 1, bcm_women_gen: 0, bcm_pstm: 1
        },
        {
            code: '3351', dept: 'TN Police Housing',
            gt_gen: 1, gt_women_gen: 0, gt_women_pstm: 0, gt_pstm: 0,
            mbc_gen: 1, mbc_women_gen: 0, mbc_women_pstm: 1, mbc_pstm: 0,
            bc_gen: 1, bc_women_gen: 0, bc_pstm: 0,
            sc_gen: 1, sc_women_gen: 0, sc_pstm: 0,
            sca_gen: 0, sca_pstm: 1,
            bcm_gen: 0, bcm_women_gen: 1, bcm_pstm: 0
        },
        {
            code: '3368', dept: 'SIPCOT',
            gt_gen: 4, gt_women_gen: 1, gt_women_pstm: 1, gt_pstm: 1,
            mbc_gen: 3, mbc_women_gen: 1, mbc_women_pstm: 0, mbc_pstm: 0,
            bc_gen: 3, bc_women_gen: 1, bc_pstm: 0,
            sc_gen: 2, sc_women_gen: 1, sc_pstm: 0,
            sca_gen: 1, sca_women_gen: 0, sca_pstm: 0,
            bcm_gen: 1, bcm_women_gen: 0, bcm_pstm: 0
        },
        {
            code: '3273', dept: 'Adi Dravidar Housing',
            gt_gen: 4, gt_women_gen: 1, gt_women_pstm: 0, gt_pstm: 1,
            mbc_gen: 2, mbc_women_gen: 1, mbc_women_pstm: 0, mbc_pstm: 0,
            bc_gen: 3, bc_women_gen: 1, bc_pstm: 0,
            sc_gen: 2, sc_women_gen: 1, sc_pstm: 0,
            sca_gen: 0, sca_women_gen: 1, sca_pstm: 0,
            bcm_gen: 1, bcm_women_gen: 0, bcm_pstm: 0
        },
        {
            code: '3663', dept: 'Maritime Board',
            gt_gen: 0, gt_women_gen: 0, gt_women_pstm: 0, gt_pstm: 0,
            mbc_gen: 0, mbc_women_gen: 1, mbc_women_pstm: 0, mbc_pstm: 0,
            bc_gen: 1, bc_women_gen: 0, bc_pstm: 0,
            sc_gen: 1, sc_women_gen: 0, sc_pstm: 0,
            sca_gen: 0, sca_women_gen: 0, sca_pstm: 0,
            bcm_gen: 0, bcm_women_gen: 0, bcm_pstm: 0
        },
        {
            code: '3531', dept: 'TN Housing Board',
            gt_gen: 2, gt_women_gen: 1, gt_women_pstm: 0, gt_pstm: 0,
            mbc_gen: 1, mbc_women_gen: 0, mbc_women_pstm: 0, mbc_pstm: 1,
            bc_gen: 1, bc_women_gen: 1, bc_pstm: 0,
            sc_gen: 1, sc_women_gen: 1, sc_pstm: 0,
            sca_gen: 0, sca_women_gen: 0, sca_pstm: 0,
            bcm_gen: 0, bcm_women_gen: 0, bcm_pstm: 0
        },
        {
            code: '3232', dept: 'CMDA',
            gt_gen: 1, gt_women_gen: 0, gt_women_pstm: 0, gt_pstm: 0,
            mbc_gen: 1, mbc_women_gen: 0, mbc_women_pstm: 0, mbc_pstm: 0,
            bc_gen: 1, bc_women_gen: 0, bc_pstm: 0,
            sc_gen: 1, sc_women_gen: 0, sc_pstm: 0,
            sca_gen: 0, sca_women_gen: 0, sca_pstm: 0,
            bcm_gen: 0, bcm_women_gen: 0, bcm_pstm: 0
        },
        {
            code: '3270', dept: 'TWAD Board',
            gt_gen: 0, gt_women_gen: 0, gt_women_pstm: 0, gt_pstm: 0,
            mbc_gen: 0, mbc_women_gen: 0, mbc_women_pstm: 0, mbc_pstm: 0,
            bc_gen: 0, bc_women_gen: 0, bc_pstm: 0,
            sc_gen: 0, sc_women_gen: 0, sc_pstm: 0,
            sca_gen: 0, sca_women_gen: 0, sca_pstm: 0,
            st_gen: 1, st_pstm: 0
        }
    ];

    const updatedVacancies = {
        "CivilAE_Group": {
            "GT": { "gen": 47, "women": 29, "pstm": 11, "total": 87 },
            "BC": { "gen": 38, "women": 18, "pstm": 14, "total": 70 },
            "BCM": { "gen": 6, "women": 3, "pstm": 2, "total": 11 },
            "MBC/DC": { "gen": 30, "women": 18, "pstm": 8, "total": 56 },
            "SC": { "gen": 22, "women": 12, "pstm": 7, "total": 41 },
            "SCA": { "gen": 4, "women": 2, "pstm": 2, "total": 8 },
            "ST": { "gen": 1, "women": 0, "pstm": 0, "total": 1 },
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

    console.log('Successfully updated with FULL Communal Per-Post Breakdown.');
}

updateConfig();
