
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfill() {
    console.log('🔄 Starting Status Probability Backfill...');

    // 1. Fetch Configurations (for vacancies)
    // We assume mostly one active config, but good to handle multiple if tags differ
    const { data: configs } = await supabase.from('exam_configurations').select('*');
    if (!configs || configs.length === 0) {
        console.error('❌ No exam configurations found.');
        return;
    }

    const configMap = {};
    configs.forEach(c => configMap[c.exam_tag] = c);

    // 2. Fetch Results
    let { data: results, error } = await supabase
        .from('external_exam_results')
        .select('*');

    if (error) {
        console.error('Error fetching results:', error);
        return;
    }

    console.log(`Found ${results.length} records to update.`);

    let updatedCount = 0;

    for (const sub of results) {
        const config = configMap[sub.exam_tag];
        if (!config) {
            console.warn(`⚠️ No config for tag ${sub.exam_tag}, skipping.`);
            continue;
        }

        const calculatedStatus = calculateStatus(sub, config);

        if (calculatedStatus) {
            const { error: upErr } = await supabase
                .from('external_exam_results')
                .update({ status_probability: calculatedStatus })
                .eq('id', sub.id);

            if (upErr) console.error(`❌ Failed to update ${sub.registration_number}:`, upErr);
            else {
                updatedCount++;
                if (updatedCount % 50 === 0) console.log(`Processed ${updatedCount}...`);
            }
        }
    }

    console.log(`\n✅ Backfill Complete. Updated ${updatedCount} records.`);
}

// Logic copied/adapted from ExternalResultAnalysis.jsx
function calculateStatus(submission, config) {
    const vacancies = config?.vacancies || {};

    // --- Helper: Get Dept Vacancies ---
    const getDeptVacancies = () => {
        const postCodeInputs = submission.post_selected?.match(/\d+/g) || [];

        // 1. Try Groups (Robust Match: Any code in string matches Group definition)
        if (vacancies.groups && Array.isArray(vacancies.groups)) {
            const matchedGroup = vacancies.groups.find(g =>
                g.post_codes.some(code => submission.post_selected?.includes(code) || postCodeInputs.includes(code))
            );
            if (matchedGroup) return matchedGroup.totals;
        }

        // 2. Fallback: Try Individual Posts (Smart Fallback)
        if (vacancies.posts && Array.isArray(vacancies.posts)) {
            const matchedPost = vacancies.posts.find(p =>
                submission.post_selected?.includes(p.code) || postCodeInputs.includes(p.code)
            );

            if (matchedPost) {
                const communities = ['GT', 'BC', 'BCM', 'MBC/DC', 'SC', 'SCA', 'ST'];
                const totals = { total: 0 };

                communities.forEach(comm => {
                    const key = comm.toLowerCase().replace('/', '');
                    totals[comm] = {
                        gen: matchedPost[`${key}_gen`] || 0,
                        women: (matchedPost[`${key}_women_gen`] || 0) + (matchedPost[`${key}_women_pstm`] || 0),
                        pstm: matchedPost[`${key}_pstm`] || 0
                    };
                    totals[comm].total = totals[comm].gen + totals[comm].women + totals[comm].pstm;
                    totals.total += totals[comm].total;
                });
                return totals;
            }
        }

        // 3. Last Resort: Legacy Architecture
        const legacyKey = (submission.post_selected?.includes('3270') || submission.post_selected?.includes('1656')) ? 'CivilAE_Group' :
            submission.post_selected?.includes('3603') ? 'AE_Civil_HRCE' :
                submission.post_selected?.includes('1667') ? 'AE_Agricultural' :
                    submission.post_selected?.toLowerCase().includes('planner') ? 'Junior Planner' :
                        submission.post_selected?.toLowerCase().includes('mech') ? 'Mechanical' :
                            submission.post_selected?.toLowerCase().includes('elec') ? 'Electrical' : 'CivilAE_Group';

        return vacancies[legacyKey] || { total: 0 };
    };

    const deptVacancies = getDeptVacancies();

    const getVal = (comm, key = 'total') => {
        const data = deptVacancies[comm];
        if (!data) return 0;
        return typeof data === 'object' ? (data[key] || 0) : (key === 'total' ? data : 0);
    };

    const isFemale = submission.gender?.toLowerCase() === 'female';
    const hasPSTM = submission.pstm_status;
    const isGT = submission.community?.includes('General') || submission.community === 'GT' || submission.community === 'OC' || submission.community === 'OTHERS';
    const effectiveRank = isGT ? submission.overall_rank : submission.communal_rank;

    const calculateEligible = (comm) => {
        let total = getVal(comm, 'gen');
        if (isFemale) total += getVal(comm, 'women');
        if (hasPSTM) total += getVal(comm, 'pstm');
        return total;
    };

    const eligibleGT = calculateEligible('GT');
    const eligibleComm = calculateEligible(submission.community);
    const totalEligibleSeats = eligibleGT + (isGT ? 0 : eligibleComm);
    const cvZone = totalEligibleSeats * 3;

    if (effectiveRank <= (isGT ? eligibleGT : eligibleComm)) {
        return "High";
    } else if (effectiveRank <= totalEligibleSeats) {
        return "Medium";
    } else if (effectiveRank <= totalEligibleSeats * 1.5) {
        return "Borderline";
    } else if (effectiveRank > cvZone) {
        return "None";
    } else {
        return "Low"; // Fallback for gaps between borderline and 'None' (cvZone)
    }
}

backfill();
