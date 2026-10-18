'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useInstitute } from '../context/InstituteContext';
import { Upload, FileText, Phone, User, Calendar, Award, CheckCircle2, Loader2, AlertCircle, Mail, Calculator, ChevronDown } from 'lucide-react';
import { uploadImage } from '../app/actions/images';

const ExternalResultForm = ({ examTag, examName, config, onSuccess }) => {
    const { user } = useAuth();
    const { institute } = useInstitute();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        whatsapp_number: '',
        registration_number: '',
        dob: '',
        overall_rank: '',
        communal_rank: '',
        community: '',
        department: 'Civil', // Default to Civil
        gender: '',
        pstm_status: false,
        // Marks Fields
        paper1_part_a: '',
        paper1_part_b: '',
        paper2_marks: '',
        total_marks: 0,
        post_selected: '',
        special_category: '',
        special_category_rank: ''
    });

    const [isVerified, setIsVerified] = useState(false);
    const [fetchedResults, setFetchedResults] = useState(null);
    const [verifying, setVerifying] = useState(false);

    // Pre-fill data if user is logged in
    useEffect(() => {
        if (user) {
            const fetchMember = async () => {
                const { data } = await supabase
                    .from('members')
                    .select('id, first_name, last_name, phone_number, dob')
                    .eq('auth_user_id', user.id)
                    .single();

                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        full_name: [data.first_name, data.last_name].filter(Boolean).join(' ') || prev.full_name,
                        email: user.email || prev.email,
                        whatsapp_number: data.phone_number || prev.whatsapp_number,
                        dob: data.dob || prev.dob
                    }));
                }
            };
            fetchMember();
        }
    }, [user]);

    // Calculate total marks whenever sub-marks change
    useEffect(() => {
        const p1b = parseFloat(formData.paper1_part_b) || 0;
        const p2 = parseFloat(formData.paper2_marks) || 0;
        setFormData(prev => ({ ...prev, total_marks: (p1b + p2).toFixed(2) }));
    }, [formData.paper1_part_b, formData.paper2_marks]);

    const handleVerify = async () => {
        if (!formData.registration_number || !formData.dob || !formData.full_name || !formData.email || !formData.whatsapp_number) {
            setError('Please enter all profile details (Name, Email, WhatsApp, Reg No, DOB) to proceed with verification.');
            return;
        }

        setVerifying(true);
        setError('');
        try {
            // Convert YYYY-MM-DD to DD/MM/YYYY for TNPSC
            let [y, m, d] = formData.dob.split('-');
            const formattedDob = `${d}/${m}/${y}`;

            // Determine verification endpoint based on exam tag
            const verifyEndpoint = examTag?.includes('DIP_ITI') || examTag?.includes('DIPLOMA')
                ? '/api/student/verify-tnpsc-diploma-iti'
                : '/api/student/verify-tnpsc-ae';

            const response = await fetch(verifyEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    registration_number: formData.registration_number,
                    dob: formattedDob
                })
            });

            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('SERVER RESPONSE:', text);
                throw new Error(`Server returned invalid response (Status: ${response.status}). Check logs.`);
            }

            if (!response.ok) throw new Error(result.error || 'Verification failed');

            const details = result.data;
            setFetchedResults(details);
            setIsVerified(true);

            // Update form with basic profile info from result
            setFormData(prev => ({
                ...prev,
                paper1_part_a: details.paper1_part_a || prev.paper1_part_a,
                paper1_part_b: details.paper1_part_b || prev.paper1_part_b,
                community: mapCommunity(details.communal_category) || prev.community,
                gender: details.gender || prev.gender,
                full_name: details.official_name || prev.full_name,
                full_name: details.official_name || prev.full_name,
                pstm_status: (details.pstm && (details.pstm.toLowerCase().includes('yes') || details.pstm.includes('PSTM'))) || false,
                special_category: details.special_category || prev.special_category
            }));

            // If rows exist, auto-select the first meaningful post or user's likely preference
            if (details.rows && details.rows.length > 0) {
                // Default to the first one for now or let user choose. 
                // Better UX: Auto-select the first one so fields fill up.
                const row = details.rows[0];
                setFormData(prev => ({
                    ...prev,
                    post_selected: row.post_name,
                    paper2_marks: row.paper2_marks,
                    overall_rank: row.overall_rank,
                    paper2_marks: row.paper2_marks,
                    overall_rank: row.overall_rank,
                    communal_rank: row.communal_rank === '-' ? '0' : row.communal_rank,
                    special_category_rank: row.special_category_rank === '-' ? null : row.special_category_rank
                }));
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    // Helper to map official community strings to dropdown values
    const mapCommunity = (officialComm) => {
        if (!officialComm) return '';
        const norm = officialComm.toUpperCase().trim();

        // 1. Check Dynamic Mappings from Config
        if (config?.vacancies?.community_mapping) {
            const mappings = config.vacancies.community_mapping;
            for (const map of mappings) {
                if (map.original && map.mapped_to && norm.includes(map.original.toUpperCase())) {
                    return map.mapped_to;
                }
            }
        }

        // 2. Default Mappings
        if (norm.includes('MBC') || norm.includes('DNC')) return 'MBC';
        if (norm.includes('BC(OBCM)') || norm.includes('BC (OBCM)')) return 'BC';
        if (norm.includes('BCM')) return 'BCM';
        if (norm.includes('BC')) return 'BC';
        if (norm.includes('SC(A)')) return 'SCA';
        if (norm.includes('SC')) return 'SC';
        if (norm.includes('ST')) return 'ST';
        if (norm.includes('GT') || norm.includes('OTHERS')) return 'GT';

        return norm;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // If user manually changes critical fields, reset verification
        if (['registration_number', 'dob'].includes(name)) {
            setIsVerified(false);
            setFetchedResults(null);
        }

        // If user selects a post from fetched results, update ranks
        if (name === 'post_selected' && fetchedResults) {
            const matchedRes = fetchedResults.rows.find(r => r.post_name === value);
            if (matchedRes) {
                setFormData(prev => ({
                    ...prev,
                    paper2_marks: matchedRes.paper2_marks,
                    overall_rank: matchedRes.overall_rank,
                    overall_rank: matchedRes.overall_rank,
                    communal_rank: matchedRes.communal_rank === '-' ? '0' : matchedRes.communal_rank,
                    special_category_rank: matchedRes.special_category_rank === '-' ? null : matchedRes.special_category_rank
                }));
            }
        }
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setFiles(prev => ({ ...prev, [type]: file }));
            setPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Validate Profile Data
            if (!formData.registration_number || !formData.dob) {
                throw new Error('Please verify your result first.');
            }
            if (!fetchedResults?.rows?.length) {
                throw new Error('No verified posts found to submit.');
            }

            // 2. Resolve Member ID
            let member_id = null;
            if (user) {
                const { data: mData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).maybeSingle();
                if (mData) member_id = mData.id;
            } else if (formData.email) {
                const { data: mData } = await supabase.from('members').select('id').eq('email', formData.email).maybeSingle();
                if (mData) member_id = mData.id;
            }

            // 3. Submit ALL Verified Posts
            // Prepare common data
            const baseData = {
                full_name: formData.full_name,
                email: formData.email,
                whatsapp_number: formData.whatsapp_number,
                registration_number: formData.registration_number,
                dob: formData.dob,
                community: formData.community,
                gender: formData.gender,
                pstm_status: formData.pstm_status || false,
                paper1_part_a: parseFloat(formData.paper1_part_a) || 0,
                paper1_part_b: parseFloat(formData.paper1_part_b) || 0,
                department: 'Civil',
                member_id,
                exam_tag: examTag,
                institute_id: institute?.id || 10,
                is_verified: true
            };

            const submissions = fetchedResults.rows.map(row => ({
                ...baseData,
                post_selected: row.post_name,
                paper2_marks: parseFloat(row.paper2_marks) || 0,
                total_marks: parseFloat(row.total_marks) || 0,
                overall_rank: parseInt(row.overall_rank) || 0,
                overall_rank: parseInt(row.overall_rank) || 0,
                communal_rank: (row.communal_rank === '-' || !row.communal_rank) ? 0 : parseInt(row.communal_rank),
                special_category: formData.special_category || null,
                special_category_rank: (row.special_category_rank && row.special_category_rank !== '-') ? parseInt(row.special_category_rank) : null,
            }));

            // Submit each post sequentially (or parallel)
            // We use upsert logic concept: check exist -> update OR insert
            let successCount = 0;

            for (const sub of submissions) {
                const { data: existing } = await supabase
                    .from('external_exam_results')
                    .select('id')
                    .eq('registration_number', sub.registration_number)
                    .eq('post_selected', sub.post_selected)
                    .eq('exam_tag', sub.exam_tag)
                    .maybeSingle();

                let res;
                if (existing) {
                    res = await supabase.from('external_exam_results').update(sub).eq('id', existing.id);
                } else {
                    res = await supabase.from('external_exam_results').insert([sub]);
                }

                if (res.error) {
                    console.error(`Failed to save post ${sub.post_selected}:`, res.error);
                } else {
                    successCount++;
                }
            }

            if (successCount === 0) {
                throw new Error('Failed to save any results. Please try again.');
            }

            if (onSuccess) onSuccess(submissions);

        } catch (err) {
            console.error('Detailed Submission error:', err);
            setError(err.message || 'Failed to submit results. Please check your data.');
        } finally {
            setLoading(false);
        }
    };

    const POST_OPTIONS = [
        { code: '3270', name: 'Assistant Engineer / Assistant Engineer (Civil) (3270, 3531, 1656, 3232, 1660, 1661, 3663, 3368, 3351, 3273)' },
        { code: '3602', name: 'Junior Planner (3602)' },
        { code: '3603', name: 'Assistant Engineer (Civil) (3603)' },
        { code: '1667', name: 'Assistant Engineer (Agricultural Engineering) (1667)' },
    ];

    return (
        <div className="w-[80%] mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            {/* Header Branding */}
            <div className="bg-white p-2 border-b border-slate-50 flex justify-center">
                <img src={config?.vacancies?.header_image_url || '/images/tnpsc_header.png'} alt="Header" className="max-w-full h-auto" />
            </div>

            <div className="p-10">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{examName}</h2>
                    {config?.vacancies?.notification_number && <p className="text-blue-600 font-black text-xs uppercase tracking-[0.3em] mt-2 mb-4">Notification No. {config.vacancies.notification_number}</p>}
                    <p className="text-slate-500 font-medium italic">Mirror your official result for accurate analysis</p>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-3 animate-shake shadow-sm">
                        <AlertCircle size={24} className="text-red-400" />
                        <span className="text-sm font-bold">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-10">
                    {/* section 1: Basic Details */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Candidate Profile</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Full Name</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <User size={20} />
                                    </div>
                                    <input required type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="form-input-custom w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-semibold" placeholder="Full name as per result" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <Mail size={20} />
                                    </div>
                                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="form-input-custom w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-semibold" placeholder="For receiving analysis report" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">WhatsApp Number</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <Phone size={20} />
                                    </div>
                                    <input required type="tel" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleChange} className="form-input-custom w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-semibold" placeholder="For result updates" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Date of Birth</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <Calendar size={20} />
                                    </div>
                                    <input required type="date" name="dob" value={formData.dob} onChange={handleChange} className="form-input-custom w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-semibold" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Registration Number</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <input required type="text" name="registration_number" value={formData.registration_number} onChange={handleChange} className="form-input-custom w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-semibold" placeholder="Enter Registration Number" />
                                    {isVerified && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in-50 duration-300">
                                            <CheckCircle2 size={24} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleVerify}
                                    disabled={verifying || isVerified || !formData.registration_number || !formData.dob || !formData.full_name || !formData.email || !formData.whatsapp_number}
                                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isVerified
                                        ? 'bg-emerald-100 text-emerald-600 cursor-default'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none'
                                        }`}
                                >
                                    {verifying ? (
                                        <><Loader2 size={18} className="animate-spin" /> Verifying with TNPSC Portal...</>
                                    ) : isVerified ? (
                                        <><CheckCircle2 size={18} /> Official Result Verified</>
                                    ) : (
                                        <><Award size={18} /> Verify with Official Website</>
                                    )}
                                </button>
                                {!isVerified && !verifying && (
                                    <p className="text-[9px] text-slate-400 font-bold text-center mt-3 uppercase tracking-widest">
                                        Note: We will fetch your real marks directly from TNPSC to ensure 100% accuracy.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-500 ${!isVerified && !verifying ? 'opacity-30 blur-[2px] pointer-events-none' : 'opacity-100 blur-0'}`}>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Community</label>
                                <select disabled={isVerified} required name="community" value={formData.community} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-semibold cursor-pointer appearance-none disabled:bg-slate-50">
                                    <option value="">Choose Community</option>
                                    <option value="GT">GT - General Turn</option>
                                    <option value="BC">BC(OBCM) - Backward Classes (Other than Backward Class Muslims)</option>
                                    <option value="BCM">BCM - Backward Class Muslims</option>
                                    <option value="MBC">MBC / DC - Most Backward Classes / Denotified Communities</option>
                                    <option value="SC">SC - Scheduled Castes</option>
                                    <option value="SCA">SC(A) - Scheduled Castes (Arunthathiyars)</option>
                                    <option value="ST">ST - Scheduled Tribes</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Gender</label>
                                    <div className="flex gap-4">
                                        {['Male', 'Female'].map((g) => (
                                            <label key={g} className="flex items-center gap-2 cursor-pointer">
                                                <input disabled={isVerified} type="radio" name="gender" value={g} checked={formData.gender?.toUpperCase() === g.toUpperCase()} onChange={handleChange} className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
                                                <span className="text-sm font-bold text-slate-600">{g}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">PSTM Status</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                disabled={isVerified}
                                                type="radio"
                                                name="pstm_status"
                                                checked={formData.pstm_status === true}
                                                onChange={() => setFormData(prev => ({ ...prev, pstm_status: true }))}
                                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-bold text-slate-600">Yes</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                disabled={isVerified}
                                                type="radio"
                                                name="pstm_status"
                                                checked={formData.pstm_status === false}
                                                onChange={() => setFormData(prev => ({ ...prev, pstm_status: false }))}
                                                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-bold text-slate-600">No</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Special Category</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                        <Award size={20} />
                                    </div>
                                    <input
                                        disabled={isVerified}
                                        type="text"
                                        name="special_category"
                                        value={formData.special_category || ''}
                                        onChange={handleChange}
                                        className="form-input-custom w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all font-semibold disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="e.g. Destitute Widow (Leave empty if none)"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* section 2: Marks Breakdown */}
                    <div className={`space-y-6 transition-all duration-500 ${!isVerified && !verifying ? 'opacity-30 blur-[2px] pointer-events-none' : 'opacity-100 blur-0'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Paper I Marks</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Paper I - Part A (Tamil) <span className="text-slate-300">/ 150</span></label>
                                <span className="text-[10px] font-bold text-blue-500 uppercase block text-center -mt-1 mb-1">Eligibility Only</span>
                                <input readOnly={isVerified} required type="number" step="0.01" name="paper1_part_a" value={formData.paper1_part_a} onChange={handleChange} className={`w-full py-4 text-center font-black text-xl bg-slate-50 border rounded-2xl focus:ring-4 outline-none transition-all ${parseFloat(formData.paper1_part_a) > 150 ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-slate-100 focus:ring-emerald-500/10 focus:border-emerald-50'} ${isVerified ? 'bg-emerald-50/20' : ''}`} placeholder="0.00" />
                                {parseFloat(formData.paper1_part_a) > 150 && <p className="text-[9px] text-red-500 font-bold text-center uppercase animate-pulse">Exceeds Max Marks (150)</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Paper I - Part B & C (GS) <span className="text-slate-300">/ 150</span></label>
                                <input readOnly={isVerified} required type="number" step="0.01" name="paper1_part_b" value={formData.paper1_part_b} onChange={handleChange} className={`w-full py-4 text-center font-black text-xl bg-slate-50 border rounded-2xl focus:ring-4 outline-none transition-all ${parseFloat(formData.paper1_part_b) > 150 ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : 'border-slate-100 focus:ring-emerald-500/10 focus:border-emerald-500'} ${isVerified ? 'bg-emerald-50/20' : ''}`} placeholder="0.00" />
                                {parseFloat(formData.paper1_part_b) > 150 && <p className="text-[9px] text-red-500 font-bold text-center uppercase animate-pulse">Exceeds Max Marks (150)</p>}
                            </div>
                        </div>
                    </div>

                    {/* section 3: Verified Posts List */}
                    <div className={`transition-all duration-500 ${!isVerified && !verifying ? 'opacity-30 blur-[2px] pointer-events-none' : 'opacity-100 blur-0'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Verified Posts & Ranks</h3>
                        </div>

                        {fetchedResults?.rows?.length > 0 ? (
                            <div className="space-y-4">
                                {fetchedResults.rows.map((row, index) => (
                                    <div key={index} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-blue-300 transition-colors">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 text-sm mb-1">{row.post_name}</h4>
                                            <div className="flex flex-wrap gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                <span className="bg-white px-2 py-1 rounded border border-slate-100">Paper II: <span className="text-slate-700">{row.paper2_marks}</span></span>
                                                <span className="bg-white px-2 py-1 rounded border border-slate-100">Total: <span className="text-slate-700">{row.total_marks}</span></span>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Overall</span>
                                                <span className="block text-lg font-black text-blue-600">#{row.overall_rank}</span>
                                            </div>
                                            <div className="text-center pl-4 border-l border-slate-200">
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Communal</span>
                                                <span className="block text-lg font-black text-emerald-600">#{row.communal_rank}</span>
                                            </div>
                                            {(row.special_category_rank && row.special_category_rank !== '-') && (
                                                <div className="text-center pl-4 border-l border-slate-200">
                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Special</span>
                                                    <span className="block text-lg font-black text-violet-600">#{row.special_category_rank}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                                    <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
                                    <p className="text-xs text-emerald-800 font-medium">
                                        Success! We found <strong>{fetchedResults.rows.length} eligible posts</strong> for you. Clicking submit will add ALL of them to your analysis report.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                <p className="text-sm text-slate-400 font-bold">
                                    {isVerified ? "No eligible posts found matching your marks." : "Verify your result above to see your eligible posts and ranks."}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Submit section */}
                    < div className="pt-10" >
                        <button type="submit" disabled={loading || !isVerified} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-2xl hover:bg-blue-600 transition-all shadow-2xl hover:shadow-blue-500/30 flex items-center justify-center gap-4 disabled:bg-slate-100 disabled:text-slate-400 group">
                            {loading ? (
                                <><Loader2 className="animate-spin" size={32} /> Submitting...</>
                            ) : (
                                <>Analyze My Result <Award size={28} className="group-hover:rotate-12 transition-transform" /></>
                            )}
                        </button>
                        {
                            !isVerified && !loading && (
                                <p className="text-[10px] text-red-400 font-bold text-center mt-4 uppercase tracking-[0.2em] animate-pulse">
                                    Please verify your result with TNPSC first
                                </p>
                            )
                        }
                    </div >
                </form >
            </div >
        </div >
    );
};

export default ExternalResultForm;
