'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Info, ArrowLeft, Download, Share2, ShieldCheck, AlertTriangle, CheckCircle2, GraduationCap, ScrollText, Award } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useInstitute } from '../context/InstituteContext';

// Helper to normalize community names (handle variations from CSV/DB)
const normalizeCommunity = (c) => {
    if (!c) return 'GT';
    const lower = c.toLowerCase().trim();
    if (lower.includes('mbc')) return 'MBC/DC';
    if (lower.includes('bcm') || lower.includes('bc(m)') || lower.includes('muslim')) return 'BCM';
    if (lower.includes('bc')) return 'BC';
    if (lower.includes('sca') || lower.includes('sc(a)') || lower.includes('arunthathiyar')) return 'SCA';
    if (lower.includes('sc') || lower.includes('scheduled caste')) return 'SC';
    if (lower.includes('st') || lower.includes('tribe')) return 'ST';
    return 'GT';
};

// Helper function to calculate probability and message
const calculateProbabilityAndMessage = (submission, config, deptVacancies, isGT, cKey) => {
    const getVal = (comm, key = 'total') => {
        const data = deptVacancies[comm];
        if (!data) return 0;
        return typeof data === 'object' ? (data[key] || 0) : (key === 'total' ? data : 0);
    };

    const isFemale = submission.gender?.toLowerCase() === 'female';
    const hasPSTM = submission.pstm_status;

    const calculateEligible = (comm) => {
        let total = getVal(comm, 'gen');
        if (isFemale) total += getVal(comm, 'women');
        if (hasPSTM) total += getVal(comm, 'pstm');
        if (isFemale && hasPSTM) total += getVal(comm, 'women_pstm');
        return total;
    };

    const eligibleGT = calculateEligible('GT');
    const eligibleComm = calculateEligible(normalizeCommunity(submission.community));
    const totalEligibleSeats = eligibleGT + (isGT ? 0 : eligibleComm);
    const cvZone = totalEligibleSeats * 3;

    const effectiveRank = isGT ? submission.overall_rank : submission.communal_rank;

    let probability = "Low";
    let colorClass = "text-rose-600 bg-rose-50 border-rose-200";
    let message = "Your rank is significantly higher than the available vacancies. Competitive pressure is high.";

    if (effectiveRank <= (isGT ? eligibleGT : eligibleComm)) {
        probability = "High";
        colorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
        message = isGT ? "Excellent! Your overall rank is within the open competition vacancy count."
            : "Excellent! Your communal rank is directly within the seat count for your category.";
    } else if (effectiveRank <= totalEligibleSeats) {
        probability = "Medium";
        colorClass = "text-amber-500 bg-amber-50 border-amber-200";
        message = isGT ? "You are in the verification zone for GT seats. Selection depends on the distribution of candidates from all communities."
            : "You are in the competition zone for General Turn (GT) seats. Selection depends on ranks of candidates from other communities.";
    } else if (effectiveRank <= totalEligibleSeats * 1.5) {
        probability = "Borderline";
        colorClass = "text-orange-500 bg-orange-50 border-orange-200";
        message = "You are slightly outside the immediate eligibility pool. Selection is possible if higher-ranked candidates choose other posts.";
    } else if (effectiveRank > cvZone) {
        probability = "None";
        colorClass = "text-slate-500 bg-slate-50 border-slate-200";
        message = isGT ? `Your overall rank (#${effectiveRank}) is significantly outside the Projected GT calling range (~top ${cvZone}).`
            : `Your communal rank (#${effectiveRank}) is significantly outside the projected Certificate Verification zone (~top ${cvZone} candidates). Statistical probability is low.`;
    }

    // OVERRIDE: Database Manual Status
    if (submission.status_probability) {
        const manualStatus = submission.status_probability.trim();

        const styles = {
            'High': { color: "text-emerald-600 bg-emerald-50 border-emerald-200", prob: "High" },
            'Medium': { color: "text-amber-500 bg-amber-50 border-amber-200", prob: "Medium" },
            'Borderline': { color: "text-orange-500 bg-orange-50 border-orange-200", prob: "Borderline" },
            'Low': { color: "text-rose-600 bg-rose-50 border-rose-200", prob: "Low" },
            'None': { color: "text-slate-500 bg-slate-50 border-slate-200", prob: "None" }
        };

        const match = styles[manualStatus] || styles[Object.keys(styles).find(k => k.toLowerCase() === manualStatus.toLowerCase())];

        if (match) {
            probability = match.prob;
            colorClass = match.color;
            message = `Status updated based on manual review. ${message}`;
        }
    }

    return { probability, colorClass, message, effectiveRank, totalEligibleSeats, cvZone };
};

const ExternalResultAnalysis = ({ submission, onBack }) => {
    // Normalize input to array (supports single or multi-post view)
    const submissions = Array.isArray(submission) ? submission : [submission];
    const firstSubmission = submissions[0]; // Use first for config fetching context

    const [activeSubmission, setActiveSubmission] = useState(null); // For drill-down
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const { institute } = useInstitute();
    const academyName = institute?.name || 'Mahesh IES Academy';

    useEffect(() => {
        const fetchConfig = async () => {
            const { data } = await supabase
                .from('exam_configurations')
                .select(`
                    *,
                    exam_posts (
                        *,
                        post_vacancies (*)
                    )
                `)
                .eq('exam_tag', firstSubmission.exam_tag)
                .eq('institute_id', institute?.id || 10)
                .single();

            if (data) {
                console.log('DEBUG: Config Loaded', data);
                setConfig(data);
            }
            setLoading(false);
        };
        fetchConfig();
    }, [firstSubmission.exam_tag]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="font-bold text-sm uppercase tracking-widest">Compiling Official Data...</p>
        </div>
    );

    // DRILL DOWN VIEW (Single Detailed Card)
    if (activeSubmission) {
        return (
            <div className="w-full space-y-6 py-8 px-4 animate-in fade-in zoom-in-95 duration-300">
                <button
                    onClick={() => setActiveSubmission(null)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-widest px-1 mb-4"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
                <AnalysisCard submission={activeSubmission} config={config} academyName={academyName} />
            </div>
        );
    }

    // DASHBOARD VIEW (Summary List)
    return (
        <div className="w-full space-y-10 py-10 px-4 animate-in fade-in duration-700">
            {/* Global Header / Nav */}
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-bold text-xs uppercase tracking-widest px-4 py-2 hover:bg-slate-50 rounded-xl">
                        <ArrowLeft size={16} /> Edit Data
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{submissions.length} Verified Posts Found</span>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                        <Download size={14} /> Report
                    </button>
                </div>
            </div>

            {/* List of Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {submissions.map((sub, idx) => (
                    <SummaryCard
                        key={idx}
                        submission={sub}
                        config={config}
                        onClick={() => setActiveSubmission(sub)}
                    />
                ))}
            </div>

            <div className="text-center pb-12">
                <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.5em]">
                    Digital Analysis Report • {academyName}
                </p>
            </div>
        </div>
    );
};

// Summary Card Component
const SummaryCard = ({ submission, config, onClick }) => {
    // Basic logic to determine probability visual
    // Note: We need a quick way to get probability without full calculation, or we rely on the manual override
    // Or we duplicate the minimal logic here. 
    // For best UX, let's just grab the status if available, or 'Detailed' generic.
    // Actually, let's try to do a lightweight calc.

    // BUT, we don't have all the getDeptVacancies logic easily accessible here unless we create a new instance of it.
    // The previous refactor extracted it to `AnalysisCard`.
    // Let's assume for Summary, we just show marks/rank, and maybe a "View Analysis" button.
    // If we want the badge, we'd need to lift `getDeptVacancies` up or duplicate.
    // Let's stick to a clean textual summary for now to save performance/complexity.

    return (
        <button
            onClick={onClick}
            className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left relative overflow-hidden h-full flex flex-col justify-between"
        >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={80} className="text-blue-600" />
            </div>

            <div className="relative z-10 space-y-6">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Post Applied</span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight line-clamp-2 min-h-[2.5rem]" title={submission.post_selected}>
                        {submission.post_selected}
                    </h3>
                </div>

                <div className="flex items-end gap-2">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Total Marks</span>
                        <span className="text-2xl font-black text-blue-600">{parseFloat(submission.total_marks).toFixed(2)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Overall Rank</span>
                        <span className="text-lg font-black text-slate-800">#{submission.overall_rank}</span>
                    </div>
                    <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Communal Rank</span>
                        <span className="text-lg font-black text-violet-600">#{submission.communal_rank}</span>
                    </div>
                </div>
            </div>

            <div className="relative z-10 pt-6 mt-2">
                <div className="p-3 bg-blue-50/50 rounded-xl flex items-center justify-between group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-widest">View Full Analysis</span>
                    <ArrowLeft size={14} className="rotate-180" />
                </div>
            </div>
        </button>
    );
};

// AnalysisCard component (contains the detailed analysis logic)
const AnalysisCard = ({ submission, config, academyName }) => {
    // DYNAMIC GROUP DISCOVERY
    const getDeptVacancies = () => {
        const vacancies = config?.vacancies || {};
        const postCodeInputs = submission.post_selected?.match(/\d+/g) || [];

        // 1. Try Relational Data First (New Schema)
        if (config?.exam_posts && Array.isArray(config.exam_posts)) {
            const matchedPosts = config.exam_posts.filter(p =>
                submission.post_selected?.includes(p.post_code) || postCodeInputs.includes(p.post_code)
            );

            if (matchedPosts.length > 0) {
                const communities = ['GT', 'BC', 'BCM', 'MBC/DC', 'SC', 'SCA', 'ST'];
                const commToKey = { 'GT': 'gt', 'BC': 'bc', 'BCM': 'bcm', 'MBC/DC': 'mbc', 'SC': 'sc', 'SCA': 'sca', 'ST': 'st' };
                const totals = { total: 0, post_breakdown: matchedPosts, is_relational: true };

                // Helper to normalize community names (handle variations from CSV/DB)
                // const normalizeCommunity - MOVED TO TOP LEVEL

                communities.forEach(comm => {
                    const pKey = commToKey[comm];
                    totals[comm] = { gen: 0, women: 0, pstm: 0, women_pstm: 0, special: 0, special_details: [] };

                    matchedPosts.forEach(post => {
                        // Ensure legacy field compatibility for UI table
                        if (!post.code) post.code = post.post_code;
                        if (!post.dept) post.dept = post.department;

                        const postVacancies = (post.post_vacancies || [])
                            .filter(v => v.post_id && v.post_id === post.id)
                            .filter(v => !(post.code == '1661' && v.id === 'c0d87e4c-9038-490f-8399-ba0eb8baff61')); // Explicitly exclude rogue Post 3273 row flowing into 1661
                        // Robust filtering using normalization
                        const commVacancies = postVacancies.filter(v => normalizeCommunity(v.community) === comm);

                        const gen = commVacancies.filter(v => v.gender === 'General' && v.is_pstm !== true && v.is_pstm !== 'true' && !v.special_category).reduce((sum, v) => sum + (parseInt(v.seat_count) || 0), 0);
                        const women = commVacancies.filter(v => v.gender === 'Women' && v.is_pstm !== true && v.is_pstm !== 'true' && !v.special_category).reduce((sum, v) => sum + (parseInt(v.seat_count) || 0), 0);
                        const pstm = commVacancies.filter(v => v.gender === 'General' && (v.is_pstm === true || v.is_pstm === 'true') && !v.special_category).reduce((sum, v) => sum + (parseInt(v.seat_count) || 0), 0);
                        const women_pstm = commVacancies.filter(v => v.gender === 'Women' && (v.is_pstm === true || v.is_pstm === 'true') && !v.special_category).reduce((sum, v) => sum + (parseInt(v.seat_count) || 0), 0);

                        // Update aggregation
                        totals[comm].gen += gen;
                        totals[comm].women += women;
                        totals[comm].pstm += pstm;
                        totals[comm].women_pstm += women_pstm;

                        // Flatten into post object for Table E columns
                        post[`${pKey}_gen`] = gen;
                        post[`${pKey}_women_gen`] = women;
                        post[`${pKey}_pstm`] = pstm;
                        post[`${pKey}_women_pstm`] = women_pstm;

                        const commSpecial = commVacancies.filter(v => v.special_category);
                        totals[comm].special += commSpecial.reduce((sum, v) => sum + (parseInt(v.seat_count) || 0), 0);
                        totals[comm].special_details.push(...commSpecial.map(s => ({ ...s, post_code: post.post_code })));
                    });

                    totals[comm].total = totals[comm].gen + totals[comm].women + totals[comm].pstm + totals[comm].women_pstm + totals[comm].special;
                    totals.total += totals[comm].total;
                });
                return totals;
            }
        }

        // 2. Try Groups (Legacy JSONB)
        if (vacancies.groups && Array.isArray(vacancies.groups)) {
            const matchedGroup = vacancies.groups.find(g =>
                g.post_codes.some(code => submission.post_selected?.includes(code) || postCodeInputs.includes(code))
            );
            if (matchedGroup) return matchedGroup.totals;
        }

        // 3. Fallback: Try Individual Posts (Legacy JSONB)
        if (vacancies.posts && Array.isArray(vacancies.posts)) {
            const matchedPost = vacancies.posts.find(p =>
                submission.post_selected?.includes(p.code) || postCodeInputs.includes(p.code)
            );

            if (matchedPost) {
                const communities = ['GT', 'BC', 'BCM', 'MBC/DC', 'SC', 'SCA', 'ST'];
                const totals = { total: 0 };

                communities.forEach(comm => {
                    let key = comm.toLowerCase().replace('/', '');
                    if (key === 'mbcdc') key = 'mbc'; // Normalize Key
                    totals[comm] = {
                        gen: matchedPost[`${key}_gen`] || 0,
                        women: (matchedPost[`${key}_women_gen`] || 0),
                        pstm: matchedPost[`${key}_pstm`] || 0,
                        women_pstm: matchedPost[`${key}_women_pstm`] || 0
                    };
                    totals[comm].total = totals[comm].gen + totals[comm].women + totals[comm].pstm + totals[comm].women_pstm;
                    totals.total += totals[comm].total;
                });
                return totals;
            }
        }

        // Table fallback
        return vacancies['CivilAE_Group'] || { total: 0 };
    };

    const deptVacancies = getDeptVacancies();

    const getVal = (comm, key = 'total') => {
        const data = deptVacancies[comm];
        if (!data) return 0;
        return typeof data === 'object' ? (data[key] || 0) : (key === 'total' ? data : 0);
    };

    const normalizeCommKey = (comm) => {
        if (!comm) return 'mbc';
        const clean = comm.toLowerCase();

        if (config?.vacancies?.community_mapping) {
            const mappings = config.vacancies.community_mapping;
            for (const map of mappings) {
                if (map.original && map.mapped_to && clean.includes(map.original.toLowerCase())) {
                    return map.mapped_to.toLowerCase();
                }
            }
        }

        if (clean.includes('sca')) return 'sca';
        if (clean.includes('st')) return 'st';
        if (clean.includes('sc')) return 'sc';
        if (clean.includes('bcm')) return 'bcm';
        if (clean.includes('bc')) return 'bc';
        if (clean.includes('others')) return 'gt';
        if (clean.includes('mbc')) return 'mbc';
        return 'mbc';
    };
    const cKey = normalizeCommKey(submission.community);

    // Determine isGT logic
    let isGT = submission.community?.includes('General') || submission.community === 'GT' || submission.community === 'OC' || submission.community === 'OTHERS';

    if (!isGT && config?.vacancies?.community_mapping) {
        const mappings = config.vacancies.community_mapping;
        for (const map of mappings) {
            if (map.original && map.mapped_to === 'GT' && submission.community?.toLowerCase().includes(map.original.toLowerCase())) {
                isGT = true;
                break;
            }
        }
    }

    // Capture logic in case we want to pass it down, but currently internal
    const isFemale = submission.gender?.toLowerCase() === 'female';
    const hasPSTM = submission.pstm_status;

    // Recalculate helper logic with new field support (inline override of helper)
    const calculateEligibleRefined = (comm) => {
        let total = getVal(comm, 'gen');
        if (isFemale) total += getVal(comm, 'women');
        if (hasPSTM) total += getVal(comm, 'pstm');
        if (isFemale && hasPSTM) total += getVal(comm, 'women_pstm');

        // ADD RELATIONALLY TRACKED SPECIAL CATEGORIES
        if (deptVacancies.is_relational) {
            const specDetails = getVal(comm, 'special_details') || [];
            // Match against user attributes if we had them (low vision, ex-servis, etc.)
            // For now, if no specific attribute is found in submission, we don't add them.
            if (submission.special_category) {
                const userSpec = submission.special_category.toLowerCase();
                const matchedSpec = specDetails.filter(s => s.special_category.toLowerCase().includes(userSpec));
                total += matchedSpec.reduce((sum, s) => sum + s.seat_count, 0);
            }
        }

        return total;
    };

    const eligibleGT = calculateEligibleRefined('GT');
    const eligibleComm = calculateEligibleRefined(submission.community);
    const totalEligibleSeats = eligibleGT + (isGT ? 0 : eligibleComm);
    const cvZone = totalEligibleSeats * 3;
    const effectiveRank = isGT ? submission.overall_rank : submission.communal_rank;

    // We can reuse the visual logic or just copy pasting the block if we want to be safe,
    // since we changed how totals are calc'd.
    // Actually, let's just use the rendered output updates below.

    let probability = "Low";
    let colorClass = "text-rose-600 bg-rose-50 border-rose-200";
    let message = "Your rank is significantly higher than the available vacancies. Competitive pressure is high.";
    if (effectiveRank <= (isGT ? eligibleGT : eligibleComm)) {
        probability = "High";
        colorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
        message = isGT ? "Excellent! Your overall rank is within the open competition vacancy count."
            : "Excellent! Your communal rank is directly within the seat count for your category.";
    } else if (effectiveRank <= totalEligibleSeats) {
        probability = "Medium";
        colorClass = "text-amber-500 bg-amber-50 border-amber-200";
        message = isGT ? "You are in the verification zone for GT seats. Selection depends on the distribution of candidates from all communities."
            : "You are in the competition zone for General Turn (GT) seats. Selection depends on ranks of candidates from other communities.";
    } else if (effectiveRank <= totalEligibleSeats * 1.5) {
        probability = "Borderline";
        colorClass = "text-orange-500 bg-orange-50 border-orange-200";
        message = "You are slightly outside the immediate eligibility pool. Selection is possible if higher-ranked candidates choose other posts.";
    } else if (effectiveRank > cvZone) {
        probability = "None";
        colorClass = "text-slate-500 bg-slate-50 border-slate-200";
        message = isGT ? `Your overall rank (#${effectiveRank}) is significantly outside the Projected GT calling range (~top ${cvZone}).`
            : `Your communal rank (#${effectiveRank}) is significantly outside the projected Certificate Verification zone (~top ${cvZone} candidates). Statistical probability is low.`;
    }

    // Manual override check again (copied from helper to ensure scope access)
    if (submission.status_probability) {
        const manualStatus = submission.status_probability.trim();
        const styles = {
            'High': { color: "text-emerald-600 bg-emerald-50 border-emerald-200", prob: "High" },
            'Medium': { color: "text-amber-500 bg-amber-50 border-amber-200", prob: "Medium" },
            'Borderline': { color: "text-orange-500 bg-orange-50 border-orange-200", prob: "Borderline" },
            'Low': { color: "text-rose-600 bg-rose-50 border-rose-200", prob: "Low" },
            'None': { color: "text-slate-500 bg-slate-50 border-slate-200", prob: "None" }
        };
        const match = styles[manualStatus] || styles[Object.keys(styles).find(k => k.toLowerCase() === manualStatus.toLowerCase())];
        if (match) {
            probability = match.prob;
            colorClass = match.color;
            message = `Status updated based on manual review. ${message}`;
        }
    }


    const specialInsights = [];
    if (submission.post_selected?.includes('3603')) {
        specialInsights.push({
            icon: <ScrollText className="text-blue-500" size={18} />,
            title: "Religion Restricted",
            text: "Only candidates professing Hindu religion are eligible. Non-Hindu candidates ranked above you will be disqualified."
        });
        specialInsights.push({
            icon: <GraduationCap className="text-purple-500" size={18} />,
            title: "Educational Preference",
            text: "Preference is given to B.Tech Traditional Architecture & Traditional Sculpture degree holders from Mamallapuram College."
        });
    }
    if (submission.post_selected?.includes('1667')) {
        specialInsights.push({
            icon: <ScrollText className="text-blue-500" size={18} />,
            title: "Strict Qualification Preference",
            text: "Primary eligibility is for Agricultural Engineering graduates. Civil/Mechanical graduates are only considered if Agricultural seats remain unfilled."
        });
    }

    if (!isGT) {
        specialInsights.push({
            icon: <TrendingUp className="text-indigo-600" size={18} />,
            title: "Priority-Based Analysis",
            text: `Selection follows a strict priority order: 1. ${submission.community} PSTM, 2. ${submission.community} Women, 3. ${submission.community} General, and finally 4. Open GT Merit.`
        });
    }

    if (isGT) {
        specialInsights.push({
            icon: <TrendingUp className="text-blue-600" size={18} />,
            title: "Merit Migration Factor",
            text: "General Turn (GT) is open to all categories. Top-scoring candidates from BC, MBC, and SC communities fill these seats long before reaching the community lists."
        });
        specialInsights.push({
            icon: <Award className="text-amber-600" size={18} />,
            title: "Overall Rank Focus",
            text: "For General category candidates, selection is determined strictly by Overall Merit. Your rank must be within the top pool of candidates across the state."
        });
    }
    if (isFemale) {
        const estWomenAbove = Math.floor(submission.communal_rank * 0.35);
        const commWomenTotal = deptVacancies.post_breakdown ?
            deptVacancies.post_breakdown.reduce((sum, p) => sum + (p[`${cKey}_women_gen`] || 0) + (p[`${cKey}_women_pstm`] || 0), 0) :
            0;

        specialInsights.push({
            icon: <Users className="text-pink-500" size={18} />,
            title: "Gender Estimate",
            text: `Based on a 35% historic female participation rate, there are an estimated ${estWomenAbove} women from your community ranked higher than you.`
        });

        if (commWomenTotal > 0) {
            specialInsights.push({
                icon: <Award className="text-pink-600" size={18} />,
                title: "High Probability Seats",
                text: `You have ${commWomenTotal} seats reserved exclusively for women of your community (${submission.community} Women Quota).`
            });
        }
    }
    if (submission.pstm_status) {
        specialInsights.push({
            icon: <CheckCircle2 className="text-emerald-500" size={18} />,
            title: "PSTM Advantage",
            text: "You hold PSTM status. You have priority in the PSTM-reserved seats within your category."
        });

        if (probability === 'None' || probability === 'Low') {
            const estPstmAbove = Math.floor(submission.communal_rank * 0.1);
            specialInsights.push({
                icon: <AlertTriangle className="text-rose-500" size={18} />,
                title: "PSTM Competition Gap",
                text: `Even with PSTM, there are an estimated ${estPstmAbove}+ PSTM candidates in your community ranked higher than you.`
            });
        }
    }

    const gtVacancy = getVal('GT');
    const communityVacancy = isGT ? 0 : getVal(submission.community);

    return (
        <div className="bg-white shadow-[0_40px_100px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden relative rounded-[3rem]">
            <div className="bg-white p-6 border-b border-slate-100 flex justify-center">
                <img src="/images/tnpsc_header.png" alt="TNPSC Logo" className="h-28 md:h-36 object-contain" />
            </div>

            <div className="p-8 md:p-12 space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-8 border-slate-100">
                    <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2 block">Candidate Analysis Result</span>
                        <div className="mb-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Combined Technical Services Examination (Non - Interview Posts)</h2>
                            <p className="text-[10px] font-bold text-blue-500 uppercase">Notification No. 9/2025</p>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{submission.full_name}</h1>
                        <div className="flex gap-4 mt-3">
                            <span className="text-sm font-bold text-slate-400">Reg No: <span className="text-slate-900">{submission.registration_number}</span></span>
                            <span className="text-sm font-bold text-slate-400">DOB: <span className="text-slate-900">{submission.dob}</span></span>
                        </div>
                    </div>
                    <div className={`px-10 py-6 rounded-3xl border-4 ${colorClass.split(' ')[2]} flex flex-col items-center shadow-2xl bg-white group hover:scale-105 transition-transform duration-500`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status Probability</span>
                        <span className={`text-5xl font-black ${colorClass.split(' ')[0]}`}>{probability}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-8">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#003087] mb-4 flex items-center gap-2">
                        <img src="/images/tnpsc_logo_small.png" alt="TNPSC" className="w-4 h-auto opacity-80" onError={(e) => e.target.style.display = 'none'} />
                        Official Result Snapshot
                    </h4>

                    {/* Table A */}
                    <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Table A: MARKS OBTAINED BY THE CANDIDATE
                        </h4>
                        <div className="overflow-x-auto rounded-t-lg border border-[#003087]">
                            <table className="w-full text-center border-collapse text-[11px] font-bold font-sans">
                                <thead>
                                    <tr className="bg-[#003087] text-white">
                                        <th className="border-r border-white/20 p-3" rowSpan="2">REGISTER NUMBER</th>
                                        <th className="border-r border-white/20 p-3" colSpan="2">PAPER — I — MARKS</th>
                                        <th className="border-r border-white/20 p-3" rowSpan="2">COMMUNAL CATEGORY</th>
                                        <th className="border-r border-white/20 p-3" rowSpan="2">GENDER</th>
                                        <th className="border-r border-white/20 p-3" rowSpan="2">PSTM</th>
                                        <th className="p-3" rowSpan="2">SPECIAL CATEGORY</th>
                                    </tr>
                                    <tr className="bg-[#003087] text-white">
                                        <th className="border-r border-t border-white/20 p-2">PART A (TAMIL)</th>
                                        <th className="border-r border-t border-white/20 p-2">PART B & C (GS)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-900 bg-white">
                                    <tr>
                                        <td className="border-r border-slate-300 p-4 text-base">{submission.registration_number}</td>
                                        <td className="border-r border-slate-300 p-4 text-base">{parseFloat(submission.paper1_part_a || 0).toFixed(2)}</td>
                                        <td className="border-r border-slate-300 p-4 text-base">{parseFloat(submission.paper1_part_b || 0).toFixed(2)}</td>
                                        <td className="border-r border-slate-300 p-4 text-sm">{submission.community}</td>
                                        <td className="border-r border-slate-300 p-4 text-sm">{submission.gender}</td>
                                        <td className="border-r border-slate-300 p-4 text-sm">{hasPSTM ? 'YES' : '--'}</td>
                                        <td className="p-4 text-sm">{submission.special_category || '--'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Table B */}
                    <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Table B: RANK POSITION FOR SELECTED POST
                        </h4>
                        <div className="overflow-x-auto rounded-t-lg border border-[#003087]">
                            <table className="w-full text-center border-collapse text-[11px] font-bold font-sans">
                                <thead>
                                    <tr className="bg-[#003087] text-white">
                                        <th className="border-r border-white/20 p-3 min-w-[300px] text-left">POST NAME (POST CODE)*</th>
                                        <th className="border-r border-white/20 p-3">PAPER — II MARKS</th>
                                        <th className="border-r border-white/20 p-3">TOTAL MARKS (GS + SUBJECT)</th>
                                        <th className="border-r border-white/20 p-3">OVERALL RANK</th>
                                        <th className="border-r border-white/20 p-3">COMMUNAL RANK</th>
                                        <th className="p-3">SPECIAL RANK</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-900 bg-white">
                                    <tr>
                                        <td className="border-r border-slate-300 p-4 text-left leading-relaxed">
                                            {submission.post_selected}
                                        </td>
                                        <td className="border-r border-slate-300 p-4 text-base">{parseFloat(submission.paper2_marks || 0).toFixed(2)}</td>
                                        <td className="border-r border-slate-300 p-4 text-base text-[#003087]">{parseFloat(submission.total_marks || 0).toFixed(2)}</td>
                                        <td className="border-r border-slate-300 p-4 text-base">{submission.overall_rank}</td>
                                        <td className="border-r border-slate-300 p-4 text-base text-violet-700">{submission.communal_rank}</td>
                                        <td className="p-4 text-base text-emerald-600">{submission.special_category_rank || '--'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                <div className="space-y-4 pb-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Table C: Official Vacancy Distribution (Revised)</h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                        <table className="w-full text-center border-collapse text-[11px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500">
                                    <th className="border border-slate-100 p-4 font-black uppercase">Community</th>
                                    <th className="border border-slate-100 p-4 font-black uppercase">General</th>
                                    <th className="border border-slate-100 p-4 font-black uppercase">Women</th>
                                    <th className="border border-slate-100 p-4 font-black uppercase">PSTM</th>
                                    <th className="border border-slate-100 p-4 font-black uppercase">W-PSTM</th>
                                    <th className="border border-slate-100 p-4 font-black uppercase bg-blue-50 text-blue-600">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {['GT', 'BC', 'BCM', 'MBC/DC', 'SC', 'SCA', 'ST'].map(comm => {
                                    const commData = deptVacancies[comm];
                                    const count = commData?.total || 0;
                                    if (count === 0 && comm !== 'GT' && comm !== submission.community) return null;
                                    return (
                                        <React.Fragment key={comm}>
                                            <tr className={`font-bold ${comm === submission.community ? 'bg-blue-50/30' : ''}`}>
                                                <td className="border border-slate-100 p-4 text-left font-black text-slate-900">
                                                    {comm} {comm === submission.community ? ' (Your Category)' : ''}
                                                </td>
                                                <td className="border border-slate-100 p-4 text-slate-500">{commData?.gen || '--'}</td>
                                                <td className="border border-slate-100 p-4 text-slate-500">{commData?.women || '--'}</td>
                                                <td className="border border-slate-100 p-4 text-slate-500">{commData?.pstm || '--'}</td>
                                                <td className="border border-slate-100 p-4 text-slate-500">{commData?.women_pstm || '--'}</td>
                                                <td className="border border-slate-100 p-4 font-black text-slate-900 bg-blue-50/20">{count}</td>
                                            </tr>
                                            {commData?.special_details?.map((spec, sidx) => (
                                                <tr key={`${comm}-spec-${sidx}`} className="text-[10px] bg-slate-50/30 italic text-slate-400">
                                                    <td className="border border-slate-100 px-4 py-2 text-left pl-8">↳ {spec.special_category}</td>
                                                    <td colSpan="4" className="border border-slate-100 px-4 py-2 text-right">Added to total:</td>
                                                    <td className="border border-slate-100 px-4 py-2 font-bold text-slate-600 bg-blue-50/10">{spec.seat_count}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                                <tr className="bg-slate-900 text-white font-black">
                                    <td className="p-4 text-left uppercase tracking-widest text-[9px]">Grand Total</td>
                                    <td colSpan="4" className="p-4"></td>
                                    <td className="p-4 text-lg">
                                        {deptVacancies.total || 0}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-4 pb-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Table D: Your Specific Competition Pool</h3>
                    <div className="overflow-x-auto rounded-xl border border-blue-600 shadow-sm relative group overflow-hidden">
                        <table className="w-full text-center border-collapse text-[11px] relative z-10">
                            <thead>
                                <tr className="bg-blue-600 text-white">
                                    <th className="border border-white/20 p-4 font-black uppercase">Category</th>
                                    <th className="border border-white/20 p-4 font-black uppercase">Vacancy Type</th>
                                    <th className="border border-white/20 p-4 font-black uppercase">Seats</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="font-bold border-b border-slate-100">
                                    <td className="p-4 text-left">GT (Open to all)</td>
                                    <td className="p-4">General</td>
                                    <td className="p-4 font-black">{getVal('GT', 'gen')}</td>
                                </tr>
                                {isFemale && (
                                    <tr className="font-bold bg-pink-50/20 border-b border-slate-100">
                                        <td className="p-4 text-left">GT (Open to all)</td>
                                        <td className="p-4">Women Reservation</td>
                                        <td className="p-4 font-black">{getVal('GT', 'women')}</td>
                                    </tr>
                                )}
                                {hasPSTM && (
                                    <tr className="font-bold bg-blue-50/50 border-b border-slate-100">
                                        <td className="p-4 text-left">GT (Open to all)</td>
                                        <td className="p-4 tracking-tighter">PSTM Preference</td>
                                        <td className="p-4 font-black">{getVal('GT', 'pstm')}</td>
                                    </tr>
                                )}
                                {isFemale && hasPSTM && (
                                    <tr className="font-bold bg-violet-50/50 border-b border-slate-100">
                                        <td className="p-4 text-left">GT (Open to all)</td>
                                        <td className="p-4 tracking-tighter">Women (PSTM)</td>
                                        <td className="p-4 font-black">{getVal('GT', 'women_pstm')}</td>
                                    </tr>
                                )}

                                {!isGT && (
                                    <>
                                        <tr className="font-bold border-b border-slate-100">
                                            <td className="p-4 text-left">{submission.community}</td>
                                            <td className="p-4">General</td>
                                            <td className="p-4 font-black">{getVal(normalizeCommunity(submission.community), 'gen')}</td>
                                        </tr>
                                        {isFemale && (
                                            <tr className="font-bold bg-pink-50/20 border-b border-slate-100">
                                                <td className="p-4 text-left">{submission.community}</td>
                                                <td className="p-4">Women Reservation</td>
                                                <td className="p-4 font-black">{getVal(normalizeCommunity(submission.community), 'women')}</td>
                                            </tr>
                                        )}
                                        {hasPSTM && (
                                            <tr className="font-bold bg-blue-50/50 border-b border-slate-100">
                                                <td className="p-4 text-left">{submission.community}</td>
                                                <td className="p-4 tracking-tighter">PSTM Preference</td>
                                                <td className="p-4 font-black">{getVal(normalizeCommunity(submission.community), 'pstm')}</td>
                                            </tr>
                                        )}
                                        {isFemale && hasPSTM && (
                                            <tr className="font-bold bg-violet-50/50 border-b border-slate-100">
                                                <td className="p-4 text-left">{submission.community}</td>
                                                <td className="p-4 tracking-tighter">Women (PSTM)</td>
                                                <td className="p-4 font-black">{getVal(normalizeCommunity(submission.community), 'women_pstm')}</td>
                                            </tr>
                                        )}
                                        {/* Dynamic Special Categories for User */}
                                        {deptVacancies.is_relational && (getVal(normalizeCommunity(submission.community), 'special_details') || []).map((spec, sidx) => (
                                            <tr key={`user-spec-${sidx}`} className={`font-bold border-b border-slate-100 ${submission.special_category?.toLowerCase().includes(spec.special_category.toLowerCase()) ? 'bg-emerald-50 text-emerald-700' : 'opacity-40'}`}>
                                                <td className="p-4 text-left">{submission.community}</td>
                                                <td className="p-4">{spec.special_category}</td>
                                                <td className="p-4 font-black">{spec.seat_count}</td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                                <tr className="bg-blue-900 text-white font-black">
                                    <td colSpan="2" className="p-4 text-left uppercase tracking-widest text-[9px]">Total Eligible Seats for You</td>
                                    <td className="p-4 text-lg">{totalEligibleSeats}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {deptVacancies.post_breakdown && (
                    <div className="space-y-4 pb-4 overflow-hidden">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                            Table E: Detailed Breakdown by Post Code {deptVacancies.is_relational ? '(Relational Source v2)' : '(Legacy Source)'}
                        </h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-center border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-slate-800 text-white font-black">
                                        <th className="border border-white/10 p-3">Post Code</th>
                                        <th className="border border-white/10 p-3">Department</th>
                                        <th className="border border-white/10 p-3">GT (Gen)</th>
                                        {isFemale && <th className="border border-white/10 p-3">GT (Women)</th>}
                                        {hasPSTM && <th className="border border-white/10 p-3">GT (PSTM)</th>}
                                        {isFemale && hasPSTM && <th className="border border-white/10 p-3">GT (W-PSTM)</th>}
                                        {!isGT && (
                                            <>
                                                <th className="border border-white/10 p-3">{submission.community} (Gen)</th>
                                                {isFemale && <th className="border border-white/10 p-3">{submission.community} (Women)</th>}
                                                {hasPSTM && <th className="border border-white/10 p-3">{submission.community} (PSTM)</th>}
                                                {isFemale && hasPSTM && <th className="border border-white/10 p-3">{submission.community} (W-PSTM)</th>}
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>

                                    {deptVacancies.post_breakdown.map((post, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            {/* ... rest of table rows ... */}

                                            <td className="p-3 font-black text-slate-900">{post.code}</td>
                                            <td className="p-3 text-left font-bold text-slate-500">{post.dept}</td>
                                            <td className="p-3 bg-blue-50/30">{post.gt_gen}</td>
                                            {isFemale && <td className="p-3 bg-pink-50/20">{post.gt_women_gen || 0}</td>}
                                            {hasPSTM && <td className="p-3 bg-blue-50/50">{post.gt_pstm}</td>}
                                            {isFemale && hasPSTM && <td className="p-3 bg-violet-50/30">{post.gt_women_pstm || 0}</td>}
                                            {!isGT && (
                                                <>
                                                    <td className="p-3 bg-indigo-50/30">{post[`${cKey}_gen`] || 0}</td>
                                                    {isFemale && <td className="p-3 bg-pink-50/20">{post[`${cKey}_women_gen`] || 0}</td>}
                                                    {hasPSTM && <td className="p-3 bg-indigo-50/50">{post[`${cKey}_pstm`] || 0}</td>}
                                                    {isFemale && hasPSTM && <td className="p-3 bg-violet-50/30">{post[`${cKey}_women_pstm`] || 0}</td>}
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-900 text-white font-black">
                                        <td colSpan="2" className="p-3 text-left uppercase tracking-widest text-[8px]">Total Eligible Seats</td>
                                        <td className="p-3">{deptVacancies.post_breakdown.reduce((sum, p) => sum + (p.gt_gen || 0), 0)}</td>
                                        {isFemale && <td className="p-3">{deptVacancies.post_breakdown.reduce((sum, p) => sum + (p.gt_women_gen || 0), 0)}</td>}
                                        {hasPSTM && <td className="p-3">{deptVacancies.post_breakdown.reduce((sum, p) => sum + (p.gt_pstm || 0), 0)}</td>}
                                        {isFemale && hasPSTM && <td className="p-3">{deptVacancies.post_breakdown.reduce((sum, p) => sum + (p.gt_women_pstm || 0), 0)}</td>}
                                        {!isGT && (
                                            <>
                                                <td className="p-3">{deptVacancies.post_breakdown.reduce((sum, p) => sum + (p[`${cKey}_gen`] || 0), 0)}</td>
                                                {isFemale && <td className="p-3">{deptVacancies.post_breakdown.reduce((sum, p) => sum + (p[`${cKey}_women_gen`] || 0), 0)}</td>}
                                                {hasPSTM && <td className="p-3">{deptVacancies.post_breakdown.reduce((sum, p) => sum + (p[`${cKey}_pstm`] || 0), 0)}</td>}
                                                {isFemale && hasPSTM && <td className="p-3">{deptVacancies.post_breakdown.reduce((sum, p) => sum + (p[`${cKey}_women_pstm`] || 0), 0)}</td>}
                                            </>
                                        )}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className={`lg:col-span-2 p-8 rounded-[2.5rem] border-2 flex flex-col gap-6 ${colorClass}`}>
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={28} />
                            <h3 className="text-2xl font-black uppercase tracking-tight">Status Analysis</h3>
                        </div>



                        {/* Step 1: Vacancy Context */}
                        <div className="bg-white/60 p-5 rounded-2xl space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                <Users size={14} /> 1. Eligibility Breakdown
                            </h4>
                            <p className="text-sm font-medium leading-relaxed">
                                Total Vacancies: <strong>{deptVacancies.total || 0}</strong>.
                                Based on your category ({submission.community} {isFemale ? '/ Female' : ''} {hasPSTM ? '/ PSTM' : ''}),
                                you are eligible for <strong>{totalEligibleSeats} seats</strong>
                                ({eligibleGT} GT + {isGT ? 0 : eligibleComm} {submission.community}).
                            </p>
                        </div>

                        {/* Step 2: Rank Analysis */}
                        <div className="bg-white/60 p-5 rounded-2xl space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                <TrendingUp size={14} /> 2. The "Two-Tier" Ranking Check
                            </h4>

                            {/* Stage A: GT */}
                            <div className="text-sm border-l-2 border-black/10 pl-3">
                                <span className="block font-black text-xs uppercase opacity-50 mb-1">Stage A: Open Competition (General Turn)</span>
                                {effectiveRank <= eligibleGT ? (
                                    <p className="font-bold text-emerald-700">
                                        Your Overall Rank (<strong>#{submission.overall_rank}</strong>) is within the Open Competition limit ({eligibleGT}).
                                        You are virtually guaranteed a seat under General Turn.
                                    </p>
                                ) : (
                                    <p className="font-medium text-slate-700">
                                        The Commission fills the {eligibleGT} General Turn seats first based purely on merit.
                                        Your Overall Rank (<strong>#{submission.overall_rank}</strong>) is outside this direct merit zone.
                                    </p>
                                )}
                            </div>

                            {/* Stage B: Community */}
                            {!isGT && (
                                <div className="text-sm border-l-2 border-black/10 pl-3">
                                    <span className="block font-black text-xs uppercase opacity-50 mb-1">Stage B: Communal Reservation</span>
                                    <p className="font-medium text-slate-700">
                                        You compete for <strong>{eligibleComm}</strong> seats reserved for {submission.community}.
                                        <br />
                                        <span className="text-xs opacity-70 mt-2 block bg-slate-50 p-2 rounded border border-slate-100">
                                            <strong>The "Slide-Over" Factor:</strong> Even if the top {eligibleGT} rankers from your community "slid over" to take GT seats,
                                            your effective rank would be ~<strong>{Math.max(1, submission.communal_rank - eligibleGT)}</strong>.
                                            {Math.max(1, submission.communal_rank - eligibleGT) > eligibleComm
                                                ? ` This gap is mathematically too large to bridge.`
                                                : ` This puts you safely within the selection zone!`}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Step 3: CV Prediction */}
                        <div className={`p-5 rounded-2xl space-y-2 ${submission.overall_rank <= (deptVacancies.total * 3) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            <h4 className="text-xs font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
                                <ScrollText size={14} /> 3. Certificate Verification (CV) Zone
                            </h4>
                            <p className="text-sm font-bold leading-relaxed">
                                {submission.overall_rank <= (deptVacancies.total * 3) // Using total vacancies * 3 for general estimation
                                    ? `Good News! Your Overall Rank (#${submission.overall_rank}) is within the estimated calling limit (~${deptVacancies.total * 3}). You will likely be called for Certificate Verification.`
                                    : `Your Overall Rank (#${submission.overall_rank}) is currently outside the estimated CV calling zone (~${deptVacancies.total * 3}).`}
                            </p>
                        </div>

                        {specialInsights.length > 0 && (
                            <div className="mt-4 pt-6 border-t border-black/5 space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
                                    <Info size={14} /> Additional Factors
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {specialInsights.map((insight, idx) => (
                                        <div key={idx} className="bg-white/50 p-4 rounded-2xl flex gap-3 text-xs">
                                            <div className="shrink-0 mt-0.5">{insight.icon}</div>
                                            <div>
                                                <p className="font-black text-slate-800 mb-0.5">{insight.title}</p>
                                                <p className="font-medium text-slate-600 leading-tight">{insight.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-auto pt-4 flex items-center gap-4 border-t border-black/5 text-[10px] font-black uppercase tracking-widest opacity-60">
                            <span>{academyName} Verified Analysis of Source 9C/2025</span>
                            <CheckCircle2 size={14} />
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-6">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Vacancy Distribution</h4>
                        <div className="space-y-4">
                            <InsightRow label="General Turn (GT)" value={gtVacancy} icon={<Users size={14} />} />
                            <InsightRow label={submission.community} value={communityVacancy} icon={<Award size={14} />} />
                            <div className="h-px bg-white/10 my-2"></div>
                            <InsightRow label="Total Eligible Seats" value={totalEligibleSeats} />
                            <div className="h-px bg-white/10 my-2"></div>
                            <InsightRow label="CV Zone Projection (1:3)" value={cvZone} icon={<ScrollText size={14} className="text-blue-400" />} />
                            <div className={`p-4 rounded-2xl mt-4 text-center ${effectiveRank <= totalEligibleSeats ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest mb-1">Rank Position</p>
                                <p className="text-xl font-black">#{effectiveRank}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                    <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                    <div>
                        <p className="text-[11px] font-black text-amber-800 leading-relaxed uppercase tracking-widest">
                            This report is an educational projection based on official vacancy data (Notification No. 9/2025).
                            Final selection list is subject to document verification and local reservation rules as per Commission's notification.
                        </p>

                    </div>
                </div>
            </div>
        </div>
    );
};

const InsightRow = ({ label, value, icon }) => (
    <div className="flex justify-between items-center py-3 border-b border-white/10 last:border-0 hover:bg-white/5 px-2 rounded-lg transition-colors">
        <div className="flex items-center gap-2">
            {icon && <span className="opacity-50 group-hover:opacity-100 transition-opacity">{icon}</span>}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-sm font-black text-white">{value}</span>
    </div>
);

export default ExternalResultAnalysis;
