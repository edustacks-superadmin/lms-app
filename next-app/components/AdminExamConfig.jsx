'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { supabase } from '../supabaseClient';
import {
    Save, Plus, Trash2, Trophy, Search, UserCheck, ShieldCheck, Mail, MessageSquare, Download,
    RefreshCw, Filter, Copy, Users, Star, Megaphone, Lock, ShieldAlert, CheckCircle2, X, Edit2, AlertCircle, UserPlus, Layers, Database, List,
    ChevronRight, ChevronLeft, FileJson, Briefcase, ArrowUpDown, ChevronUp, ChevronDown, UserX
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useInstitute } from '../context/InstituteContext';
import { uploadImage } from '../app/actions/images';

const AdminExamConfig = () => {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'posts');
    const [currentConfig, setCurrentConfig] = useState(null);
    const [manualEntry, setManualEntry] = useState({
        full_name: '',
        email: '',
        whatsapp_number: '',
        registration_number: '',
        dob: '',
        community: '',
        gender: '',
        pstm_status: false,
        paper1_part_a: '',
        paper1_part_b: '',
        paper2_marks: '',
        post_selected: ''
    });
    const [submittingManual, setSubmittingManual] = useState(false);
    const [jsonError, setJsonError] = useState(null);
    const [currentPage, setCurrentPage] = useState(() => parseInt(searchParams.get('page')) || 1);
    const [candidateSearch, setCandidateSearch] = useState(() => searchParams.get('search') || '');
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
    const [postFilter, setPostFilter] = useState(() => searchParams.get('postFilter') || 'all');
    const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || '');
    const [sortDir, setSortDir] = useState(() => searchParams.get('sortDir') || 'asc');
    const [isDirty, setIsDirty] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'danger' });
    const { showToast } = useToast();
    const { institute } = useInstitute();
    const activeInstituteId = institute?.id || 10;

    // Visual Editor State
    const [postMode, setPostMode] = useState('visual'); // 'visual' or 'json'
    const [editingPost, setEditingPost] = useState(null); // null = list, {} = new/edit
    const [tempPost, setTempPost] = useState({});

    // Helper to update tab and URL
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tabName);
        router.push(`${pathname}?${params.toString()}`);
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    // Sync URL params with State
    useEffect(() => {
        if (!loading && configs.length > 0) {
            const editId = searchParams.get('edit_id');
            const action = searchParams.get('action');

            if (editId) {
                const config = configs.find(c => c.id.toString() === editId);
                if (config) {
                    // Only update if not already set or different
                    if (!currentConfig || currentConfig.id !== config.id) {
                        handleEditInternal(config);
                    }
                }
            } else if (action === 'new') {
                if (!isEditing || currentConfig?.id) {
                    handleAddNewInternal();
                }
            } else {
                // Return to list if no params
                if (isEditing) {
                    setIsEditing(false);
                    setCurrentConfig(null);
                }
            }
        }
    }, [loading, configs, searchParams]);

    // Sync tab state from URL (handles back/forward buttons)
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const fetchConfigs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('exam_configurations')
            .select(`
                *,
                exam_posts (
                    *,
                    post_vacancies (*)
                )
            `)
            .eq('institute_id', activeInstituteId)
            .order('created_at', { ascending: false });

        if (error) {
            showToast('Failed to fetch configurations', 'error');
            setLoading(false);
        } else {
            // Fetch counts
            const configsWithCounts = await Promise.all((data || []).map(async (config) => {
                const { count } = await supabase
                    .from('external_exam_results')
                    .select('*', { count: 'exact', head: true })
                    .eq('exam_tag', config.exam_tag)
                    .eq('is_verified', true);

                return { ...config, result_count: count || 0 };
            }));

            setConfigs(configsWithCounts);
            setLoading(false);
        }
    };

    // SWR Fetcher
    const fetcher = (url) => fetch(url).then((res) => res.json());

    // Construct SWR Key
    const getAppsKey = () => {
        if (!currentConfig?.exam_tag) return null;

        const queryParams = new URLSearchParams({
            examTag: currentConfig.exam_tag,
            page: searchParams.get('page') || '1',
            limit: 50,
            search: searchParams.get('search') || '',
            status: searchParams.get('status') || 'all',
            postFilter: searchParams.get('postFilter') || 'all',
            sortBy: searchParams.get('sortBy') || '',
            sortDir: searchParams.get('sortDir') || 'asc'
        });

        // Always include stats for now to ensure we have counts
        queryParams.append('includeStats', 'true');

        return `/api/admin/exams/applications?${queryParams.toString()}`;
    };

    const { data: appsData, error: appsError, isValidating: loadingApps, mutate: mutateApps } = useSWR(
        getAppsKey(),
        fetcher,
        {
            revalidateOnFocus: false, // Don't auto-reload when window gets focus
            keepPreviousData: true,   // Show previous page data while loading new page
        }
    );

    // Derived State from SWR Data
    const apps = appsData?.applications || [];
    const totalCount = appsData?.totalCount || 0;
    const totalPages = appsData?.totalPages || 0;
    const serverStats = appsData?.stats || {};

    const handleBulkSpecialUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const lines = content.trim().split('\n');
            if (lines.length < 2) {
                showToast("CSV is empty or invalid", "error");
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            const postCodeIdx = headers.indexOf('post_code');
            const commIdx = headers.indexOf('community');
            const genderIdx = headers.indexOf('gender');
            const pstmIdx = headers.includes('is_pstm') ? headers.indexOf('is_pstm') : headers.indexOf('pstm');
            const catIdx = headers.includes('special_category') ? headers.indexOf('special_category') : headers.indexOf('category');
            const seatIdx = headers.includes('seat_count') ? headers.indexOf('seat_count') : headers.indexOf('seats');

            if (postCodeIdx === -1 || commIdx === -1 || seatIdx === -1) {
                showToast("Missing required headers: post_code, community, seat_count", "error");
                return;
            }

            const updatesGrouped = {};
            lines.slice(1).forEach(line => {
                const parts = line.split(',');
                const post_code = parts[postCodeIdx]?.trim();
                if (!post_code) return;

                if (!updatesGrouped[post_code]) updatesGrouped[post_code] = [];
                updatesGrouped[post_code].push({
                    community: parts[commIdx]?.trim() || 'GT',
                    gender: parts[genderIdx]?.trim() || 'General',
                    is_pstm: parts[pstmIdx]?.trim().toLowerCase() === 'yes',
                    special_category: parts[catIdx]?.trim() || '',
                    seat_count: parseInt(parts[seatIdx]?.trim()) || 0
                });
            });

            const currentPosts = [...(currentConfig.posts || [])];
            let updatedCount = 0;
            const newPosts = currentPosts.map(post => {
                const code = post.code?.toString();
                if (updatesGrouped[code]) {
                    updatedCount++;
                    return { ...post, special_vacancies: updatesGrouped[code] };
                }
                return post;
            });

            setCurrentConfig({
                ...currentConfig,
                posts: newPosts,
                posts_json: JSON.stringify(newPosts, null, 2)
            });
            setIsDirty(true);
            showToast(`Bulk updated special vacancies for ${updatedCount} posts! Don't forget to save to database.`, "success");
            e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    const handlePromoteCandidate = async (app, promoData, action = 'verify') => {
        try {
            const res = await fetch('/api/admin/exams/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicationId: app.id,
                    memberId: app.member_id,
                    examTag: currentConfig.exam_tag,
                    examName: currentConfig.exam_name,
                    registrationNumber: app.registration_number,
                    full_name: app.full_name,
                    email: app.email,
                    whatsapp_number: app.whatsapp_number,
                    dob: app.dob,
                    community: app.community,
                    gender: app.gender,
                    pstm_status: app.pstm_status,
                    action: action,
                    ...promoData
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message || 'Operation successful', 'success');
                mutateApps();
            } else {
                showToast(data.error || 'Promotion failed', 'error');
            }
        } catch (e) {
            showToast('Promotion error', 'error');
        }
    };



    const handleCandidateSearch = (val) => {
        setCandidateSearch(val);
    };

    const handleSearchSubmit = () => {
        setCurrentPage(1);
        const params = new URLSearchParams(searchParams.toString());
        params.set('search', candidateSearch);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleStatusFilter = (val) => {
        setStatusFilter(val);
        setCurrentPage(1); // Reset to page 1 on filter
        const params = new URLSearchParams(searchParams.toString());
        params.set('status', val);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePostFilter = (val) => {
        setPostFilter(val);
        setCurrentPage(1);
        const params = new URLSearchParams(searchParams.toString());
        params.set('postFilter', val);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleSort = (col) => {
        let newDir = 'asc';
        if (sortBy === col) {
            newDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            // Smarter defaults for first click
            if (col === 'verified_marks') newDir = 'desc';
            else if (col === 'verified_rank') newDir = 'asc';
        }

        setSortBy(col);
        setSortDir(newDir);
        setCurrentPage(1);

        const params = new URLSearchParams(searchParams.toString());
        params.set('sortBy', col);
        params.set('sortDir', newDir);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const transformRelationalToLegacy = (posts) => {
        if (!posts) return [];
        return posts.map(p => {
            const legacyPost = {
                id: p.id,
                code: p.post_code,
                post_name: p.post_name,
                dept: p.dept
            };
            p.post_vacancies?.forEach(v => {
                if (!v.special_category) {
                    let commPrefix = v.community.toLowerCase();
                    if (commPrefix.includes('bc(obcm)') || commPrefix === 'bc') commPrefix = 'bc';
                    else if (commPrefix.includes('bc(m)') || commPrefix === 'bcm') commPrefix = 'bcm';
                    else if (commPrefix.includes('sc(a)') || commPrefix === 'sca') commPrefix = 'sca';
                    else commPrefix = commPrefix.replace('/dc', '').replace('/', '');

                    let suffix = '_gen';
                    if (v.gender === 'Women' && v.is_pstm) suffix = '_women_pstm';
                    else if (v.gender === 'Women') suffix = '_women_gen';
                    else if (v.is_pstm) suffix = '_pstm';

                    legacyPost[`${commPrefix}${suffix}`] = (legacyPost[`${commPrefix}${suffix}`] || 0) + v.seat_count;
                } else {
                    if (!legacyPost.special_vacancies) legacyPost.special_vacancies = [];
                    legacyPost.special_vacancies.push({
                        community: v.community,
                        gender: v.gender,
                        is_pstm: v.is_pstm,
                        special_category: v.special_category,
                        seat_count: v.seat_count
                    });
                }
            });
            return legacyPost;
        });
    };

    const handleEditInternal = (config) => {
        // Enforce new structure if missing
        const vacancies = config.vacancies || {};

        // Priority: 1. Relational data, 2. vacancies.posts, 3. Legacy CivilAE
        const posts = config.exam_posts && config.exam_posts.length > 0
            ? transformRelationalToLegacy(config.exam_posts)
            : (vacancies.posts || vacancies.CivilAE_Group?.post_breakdown || []);

        const community_mapping = vacancies.community_mapping || [];
        const groups = vacancies.groups || (vacancies.CivilAE_Group ? [
            {
                name: "Civil AE Group",
                post_codes: vacancies.CivilAE_Group.post_breakdown?.map(p => p.code) || [],
                totals: vacancies.CivilAE_Group
            }
        ] : []);

        setCurrentConfig({
            ...config,
            id: config.id, // Primary identity if it exists
            originalTag: config.exam_tag, // Fallback identity
            year: config.year || new Date().getFullYear(),
            is_active: config.is_active ?? true,
            portal_category: config.portal_category || null,
            notification_number: config.vacancies?.notification_number || '',
            header_image_url: config.vacancies?.header_image_url || '',
            posts: posts,
            groups: groups,
            community_mapping: community_mapping,
            posts_json: JSON.stringify(posts, null, 2)
        });
        setIsEditing(true);
        setIsDirty(false); // Reset on load
        setJsonError(null);
    };

    const handleEdit = (config) => {
        const params = new URLSearchParams(searchParams);
        params.set('edit_id', config.id);
        params.delete('action');
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleAddNewInternal = () => {
        setCurrentConfig({
            exam_tag: '',
            exam_name: '',
            id: null,
            originalTag: null,
            year: new Date().getFullYear(),
            is_active: true,
            portal_category: null,
            notification_number: '',
            header_image_url: '',
            posts: [],
            groups: [],
            community_mapping: [],
            posts_json: '[]'
        });
        setIsEditing(true);
        setIsDirty(false); // New one starts clean
        setJsonError(null);
    };

    const handleAddNew = () => {
        const params = new URLSearchParams(searchParams);
        params.set('action', 'new');
        params.delete('edit_id');
        router.push(`${pathname}?${params.toString()}`);
    };

    const calculateGroupTotals = (postCodes, postsList) => {
        const selectedPosts = postsList.filter(p => postCodes.includes(p.code));

        const communities = ['GT', 'BC', 'BCM', 'MBC/DC', 'SC', 'SCA', 'ST'];
        const totals = {};

        // Helper to normalize community names (handle variations from CSV/DB)
        const normalizeCommunity = (c) => {
            if (!c) return 'GT';
            const lower = c.toLowerCase();
            if (lower.includes('mbc')) return 'MBC/DC';
            if (lower.includes('bcm') || lower.includes('bc(m)')) return 'BCM';
            if (lower.includes('bc')) return 'BC';
            if (lower.includes('sca') || lower.includes('sc(a)')) return 'SCA';
            if (lower.includes('sc')) return 'SC';
            if (lower.includes('st')) return 'ST';
            return 'GT';
        };

        communities.forEach(comm => {
            let key = comm.toLowerCase().replace('/', '');
            if (key === 'mbcdc') key = 'mbc'; // Fix: keys are stored as 'mbc_*' not 'mbcdc_*'

            // 1. Regular Vacancies (Force Number type)
            let gen = selectedPosts.reduce((sum, p) => sum + (parseInt(p[`${key}_gen`] || 0)), 0);
            let women = selectedPosts.reduce((sum, p) => sum + (parseInt(p[`${key}_women_gen`] || 0)) + (parseInt(p[`${key}_women_pstm`] || 0)), 0);
            let pstm = selectedPosts.reduce((sum, p) => sum + (parseInt(p[`${key}_pstm`] || 0)), 0);

            // 2. Special Vacancies
            selectedPosts.forEach(p => {
                if (p.special_vacancies && Array.isArray(p.special_vacancies)) {
                    p.special_vacancies.forEach(sv => {
                        const svComm = normalizeCommunity(sv.community);

                        if (svComm === comm) {
                            const count = parseInt(sv.seat_count) || 0;
                            if (sv.gender === 'Women') {
                                women += count;
                            } else if (sv.is_pstm) {
                                pstm += count;
                            } else {
                                gen += count;
                            }
                        }
                    });
                }
            });

            totals[comm] = {
                gen,
                women,
                pstm,
                total: gen + women + pstm
            };
        });

        return {
            ...totals,
            post_breakdown: selectedPosts
        };
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setJsonError(null);

        let parsedPosts;
        try {
            parsedPosts = JSON.parse(currentConfig.posts_json);
        } catch (err) {
            setJsonError('Invalid JSON format for posts');
            return;
        }

        // Auto-recalculate all groups before saving
        const updatedGroups = (currentConfig.groups || []).map(group => ({
            ...group,
            totals: calculateGroupTotals(group.post_codes, parsedPosts)
        }));

        const payload = {
            exam_tag: currentConfig.exam_tag,
            exam_name: currentConfig.exam_name,
            year: parseInt(currentConfig.year),
            is_active: currentConfig.is_active,
            portal_category: currentConfig.portal_category,
            institute_id: activeInstituteId,
            vacancies: {
                posts: parsedPosts,
                groups: updatedGroups,
                community_mapping: currentConfig.community_mapping,
                notification_number: currentConfig.notification_number || null,
                header_image_url: currentConfig.header_image_url || null
            }
        };

        try {
            let configId = currentConfig.id;

            // 1. Save main configuration
            if (configId || currentConfig.originalTag) {
                const query = supabase.from('exam_configurations').update(payload);
                if (configId) query.eq('id', configId);
                else query.eq('exam_tag', currentConfig.originalTag);

                const { error } = await query;
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('exam_configurations').insert(payload).select().single();
                if (error) throw error;
                configId = data.id;
            }

            // 2. Relational Synchronization
            if (configId) {
                // A. Batch upsert posts
                const postRows = parsedPosts.map(p => ({
                    config_id: configId,
                    post_code: p.code,
                    post_name: p.post_name || '',
                    dept: p.dept || ''
                }));

                const { data: upsertedPosts, error: postUpsertError } = await supabase
                    .from('exam_posts')
                    .upsert(postRows, { onConflict: 'config_id, post_code' })
                    .select();

                if (postUpsertError) throw postUpsertError;

                // C. Cleanup deleted posts (Batch)
                const codesInList = parsedPosts.map(p => p.code).filter(Boolean);
                if (codesInList.length > 0) {
                    const { error: cleanupError } = await supabase
                        .from('exam_posts')
                        .delete()
                        .eq('config_id', configId)
                        .not('post_code', 'in', `(${codesInList.join(',')})`);
                    if (cleanupError) console.error('Cleanup error:', cleanupError);
                }

                // B. Clear and Insert Vacancies (Batch)
                const postIds = upsertedPosts.map(p => p.id);
                // We delete all vacancies for these posts first
                const { error: deleteError } = await supabase.from('post_vacancies').delete().in('post_id', postIds);
                if (deleteError) throw deleteError;

                const communities = ['gt', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'];
                const vacancyRows = [];

                upsertedPosts.forEach(postRecord => {
                    const postData = parsedPosts.find(p => p.code === postRecord.post_code);
                    if (!postData) return;

                    communities.forEach(comm => {
                        const commName = comm.toUpperCase() === 'MBC' ? 'MBC/DC' : comm.toUpperCase();
                        const mappings = [
                            { suffix: '_gen', gender: 'General', pstm: false },
                            { suffix: '_women_gen', gender: 'Women', pstm: false },
                            { suffix: '_pstm', gender: 'General', pstm: true },
                            { suffix: '_women_pstm', gender: 'Women', pstm: true }
                        ];

                        mappings.forEach(m => {
                            const count = parseInt(postData[`${comm}${m.suffix}`]) || 0;
                            if (count > 0) {
                                vacancyRows.push({
                                    post_id: postRecord.id,
                                    community: commName,
                                    gender: m.gender,
                                    is_pstm: m.pstm,
                                    seat_count: count,
                                    vacancy_type: 'Regular'
                                });
                            }
                        });
                    });

                    // Add Special Vacancies sync
                    if (postData.special_vacancies && Array.isArray(postData.special_vacancies)) {
                        postData.special_vacancies.forEach(spec => {
                            if (parseInt(spec.seat_count) > 0) {
                                vacancyRows.push({
                                    post_id: postRecord.id,
                                    community: spec.community === 'MBC' ? 'MBC/DC' : spec.community,
                                    gender: spec.gender,
                                    is_pstm: spec.is_pstm,
                                    seat_count: parseInt(spec.seat_count),
                                    special_category: spec.special_category,
                                    vacancy_type: 'Special'
                                });
                            }
                        });
                    }
                });

                if (vacancyRows.length > 0) {
                    const { error: vaccError } = await supabase.from('post_vacancies').insert(vacancyRows);
                    if (vaccError) throw vaccError;
                }
            }

            showToast('Configuration and Relational Data synced!', 'success');
            setIsDirty(false);
            if (!currentConfig.id && configId) {
                // New config created, update URL
                const params = new URLSearchParams(searchParams);
                params.set('edit_id', configId);
                params.delete('action');
                router.push(`${pathname}?${params.toString()}`);
            }
            fetchConfigs();
        } catch (err) {
            showToast('Save failed: ' + err.message, 'error');
            console.error('Save error:', err);
        }
    };

    const handleDelete = async (id) => {
        setConfirmAction({
            show: true,
            title: 'Delete Configuration',
            message: 'Are you sure you want to delete this configuration? This cannot be undone.',
            onConfirm: async () => {
                const { error } = await supabase
                    .from('exam_configurations')
                    .delete()
                    .eq('id', id)
                    .eq('institute_id', activeInstituteId);

                if (error) {
                    showToast('Delete failed: ' + error.message, 'error');
                } else {
                    showToast('Configuration deleted', 'success');
                    fetchConfigs();
                }
            }
        });
    };


    const handleAssignPortal = async (config, category) => {
        // 1. Remove this category assigment from OTHER configs (Exclusive per category)
        if (category) {
            const { error: resetError } = await supabase
                .from('exam_configurations')
                .update({ portal_category: null })
                .eq('institute_id', activeInstituteId)
                .eq('portal_category', category);

            if (resetError) {
                showToast('Failed to reset existing assignments', 'error');
                return;
            }
        }

        // 2. Assign to this config
        const { error: setError } = await supabase
            .from('exam_configurations')
            .update({ portal_category: category })
            .eq('id', config.id);

        if (setError) {
            showToast('Failed to assign portal category', 'error');
        } else {
            if (category) {
                showToast(`${config.exam_name} assigned to ${category} Portal.`, 'success');
            } else {
                showToast(`Portal assignment removed from ${config.exam_name}.`, 'success');
            }
        }

        fetchConfigs();
    };

    const handleManualSave = async () => {
        if (!manualEntry.full_name || !manualEntry.registration_number || !manualEntry.post_selected) {
            showToast('Please fill required candidate details', 'error');
            return;
        }

        setSubmittingManual(true);
        try {
            const p1b = parseFloat(manualEntry.paper1_part_b) || 0;
            const p2 = parseFloat(manualEntry.paper2_marks) || 0;
            const totalMarks = (p1b + p2).toFixed(2);

            const submissionData = {
                full_name: manualEntry.full_name,
                email: manualEntry.email || `${manualEntry.registration_number}@manual.entry`,
                whatsapp_number: manualEntry.whatsapp_number,
                registration_number: manualEntry.registration_number,
                community: manualEntry.community,
                dob: manualEntry.dob, // Added DOB
                gender: manualEntry.gender,
                pstm_status: manualEntry.pstm_status, // Added PSTM
                paper1_part_a: parseFloat(manualEntry.paper1_part_a) || 0,
                paper1_part_b: p1b,
                paper2_marks: p2,
                total_marks: parseFloat(totalMarks),
                post_selected: manualEntry.post_selected,
                // Extract proper department name (remove code) or use whole string if simple
                department: manualEntry.post_selected ? manualEntry.post_selected.split('(')[0].trim() : 'Manual Entry',
                overall_rank: parseInt(manualEntry.overall_rank) || 0,
                communal_rank: parseInt(manualEntry.communal_rank) || 0,
                exam_tag: currentConfig.exam_tag,
                institute_id: activeInstituteId,
                is_manual_entry: true,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('external_exam_results')
                .insert([submissionData]);

            if (error) throw error;

            showToast('Result recorded successfully!', 'success');
            // Reset form
            setManualEntry({
                full_name: '', email: '', whatsapp_number: '', registration_number: '',
                dob: '', community: '', gender: '', pstm_status: false,
                paper1_part_a: '', paper1_part_b: '', paper2_marks: '', post_selected: '',
                overall_rank: '', communal_rank: ''
            });

        } catch (err) {
            showToast('Submission failed: ' + err.message, 'error');
        } finally {
            setSubmittingManual(false);
        }
    };

    const togglePostInGroup = (groupIndex, postCode) => {
        setIsDirty(true);
        setCurrentConfig(prev => {
            const updatedGroups = [...prev.groups];
            const group = updatedGroups[groupIndex];

            if (group.post_codes.includes(postCode)) {
                group.post_codes = group.post_codes.filter(c => c !== postCode);
            } else {
                group.post_codes.push(postCode);
            }
            return { ...prev, groups: updatedGroups };
        });
    };

    const addGroup = () => {
        const name = prompt("Enter Group Name (e.g., Junior Planner Group)");
        if (!name) return;

        setIsDirty(true);
        const newGroup = {
            name,
            post_codes: [],
            totals: {}
        };

        setCurrentConfig(prev => ({
            ...prev,
            groups: [...prev.groups, newGroup]
        }));
    };

    const removeGroup = (index) => {
        setConfirmAction({
            show: true,
            title: 'Delete Group',
            message: 'Are you sure you want to delete this group definition? All linked posts will be unlinked locally.',
            onConfirm: () => {
                setIsDirty(true);
                setCurrentConfig(prev => {
                    const updatedGroups = prev.groups.filter((_, i) => i !== index);
                    return { ...prev, groups: updatedGroups };
                });
            }
        });
    };

    const filteredConfigs = configs.filter(c =>
        c.exam_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-[95%] mx-auto space-y-8 font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Exam Config & Group Builder</h1>
                    <p className="text-slate-500 font-medium">Manage post libraries and dynamic recruitment groups.</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleAddNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <Plus size={18} /> New Configuration
                    </button>
                )}
            </div>

            {isEditing ? (
                /* Editor Form */
                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                <Layers size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    {currentConfig.exam_name || 'Design Architecture'}
                                </h2>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={() => handleTabChange('posts')}
                                        className={`text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${activeTab === 'posts' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                    >
                                        1. Post Library {currentConfig.posts?.length > 0 ? `(${currentConfig.posts.length})` : ''}
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('groups')}
                                        className={`text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${activeTab === 'groups' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                    >
                                        2. Group Builder {currentConfig.groups?.length > 0 ? `(${currentConfig.groups.length})` : ''}
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('manual')}
                                        className={`text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${activeTab === 'manual' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                    >
                                        3. Manual Entry
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('mappings')}
                                        className={`text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${activeTab === 'mappings' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                    >
                                        4. Mappings
                                    </button>
                                    {currentConfig?.id && (
                                        <button
                                            onClick={() => handleTabChange('candidates')}
                                            className={`text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all ${activeTab === 'candidates' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                        >
                                            5. Candidates
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {isDirty && (
                                <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse shadow-sm backdrop-blur-md">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Unsaved Changes</span>
                                </div>
                            )}
                            <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 group">
                                <Save size={18} className="transition-transform group-hover:scale-110" /> Save to Database
                            </button>
                            <button
                                onClick={() => {
                                    if (isDirty) setShowExitConfirm(true);
                                    else router.push(pathname);
                                }}
                                className="p-2.5 hover:bg-slate-200/50 rounded-full transition-all hover:rotate-90 active:scale-90"
                            >
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>
                    </div>

                    <div className="p-8">
                        {activeTab === 'posts' && (
                            /* Sub-Tab 1: Post Library */
                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                    <div className="flex gap-4">
                                        <div className="bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-blue-100/50">
                                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Total Posts: {currentConfig.posts?.length || 0}</span>
                                        </div>
                                        <div className="bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-emerald-100/50">
                                            <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Grand Total Vacancies: {
                                                (currentConfig.posts || []).reduce((acc, p) => {
                                                    let total = 0;
                                                    const communities = ['gt', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'];
                                                    const suffixes = ['_gen', '_women_gen', '_pstm', '_women_pstm'];
                                                    communities.forEach(c => {
                                                        suffixes.forEach(s => {
                                                            total += parseInt(p[`${c}${s}`]) || 0;
                                                        });
                                                    });
                                                    if (p.special_vacancies) {
                                                        p.special_vacancies.forEach(spec => {
                                                            total += parseInt(spec.seat_count) || 0;
                                                        });
                                                    }
                                                    return acc + total;
                                                }, 0)
                                            } Seats</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 p-1 rounded-xl flex">
                                        <button
                                            onClick={() => setPostMode('visual')}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${postMode === 'visual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Visual Editor
                                        </button>
                                        <button
                                            onClick={() => setPostMode('json')}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${postMode === 'json' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Raw JSON
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-6">
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Exam Tag Identifier</label>
                                        <input
                                            type="text"
                                            value={currentConfig.exam_tag}
                                            onChange={e => setCurrentConfig({ ...currentConfig, exam_tag: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
                                            placeholder="TNPSC_AE_2024"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Display Name</label>
                                        <input
                                            type="text"
                                            value={currentConfig.exam_name}
                                            onChange={e => setCurrentConfig({ ...currentConfig, exam_name: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
                                            placeholder="Combined Technical Services"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Year</label>
                                        <input
                                            type="number"
                                            value={currentConfig.year}
                                            onChange={e => setCurrentConfig({ ...currentConfig, year: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
                                            placeholder="2025"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentConfig({ ...currentConfig, is_active: !currentConfig.is_active })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${currentConfig.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${currentConfig.is_active ? 'right-1' : 'left-1'}`} />
                                    </button>
                                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                                        {currentConfig.is_active ? 'Configuration Active' : 'Configuration Disabled'}
                                    </span>

                                    <div className="h-6 w-px bg-slate-200 mx-2" />

                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Portal:</label>
                                        <select
                                            value={currentConfig.portal_category || ''}
                                            onChange={(e) => setCurrentConfig({ ...currentConfig, portal_category: e.target.value || null })}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                                        >
                                            <option value="">Unassigned</option>
                                            <option value="TNPSC_AE">TNPSC AE Portal</option>
                                            <option value="TNPSC_DIPLOMA_ITI">TNPSC Diploma/ITI Portal</option>
                                            <option value="SSC_JE">SSC JE Portal</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Notification:</label>
                                        <input
                                            type="text"
                                            value={currentConfig.notification_number || ''}
                                            onChange={(e) => { setCurrentConfig({ ...currentConfig, notification_number: e.target.value }); setIsDirty(true); }}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 w-32"
                                            placeholder="e.g. 9/2025"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Header Image:</label>
                                        {currentConfig.header_image_url ? (
                                            <div className="flex items-center gap-2">
                                                <img src={currentConfig.header_image_url} alt="Header" className="h-8 rounded border border-slate-200" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setCurrentConfig({ ...currentConfig, header_image_url: '' }); setIsDirty(true); }}
                                                    className="text-rose-500 hover:text-rose-700 text-[10px] font-bold uppercase"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <input
                                                    type="file"
                                                    id="header-image-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        const fd = new FormData();
                                                        fd.append('file', file);
                                                        fd.append('folder', 'exam-headers');
                                                        const result = await uploadImage(fd);
                                                        if (result.success) {
                                                            setCurrentConfig(prev => ({ ...prev, header_image_url: result.url }));
                                                            setIsDirty(true);
                                                            showToast('Header image uploaded!', 'success');
                                                        } else {
                                                            showToast('Upload failed: ' + result.error, 'error');
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => document.getElementById('header-image-upload').click()}
                                                    className="text-[10px] font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2 border border-blue-100/50 shadow-sm"
                                                >
                                                    Upload Image
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            id="bulk-special-input"
                                            className="hidden"
                                            accept=".csv"
                                            onChange={handleBulkSpecialUpload}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('bulk-special-input').click()}
                                            className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-100/50 shadow-sm"
                                        >
                                            <Database size={14} /> Bulk Upload Special
                                        </button>
                                    </div>
                                </div>

                                {postMode === 'json' ? (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <FileJson size={14} className="text-blue-600" /> Master Post Library (JSON)
                                        </label>
                                        <div className="flex-1">
                                            <textarea
                                                rows="15"
                                                value={currentConfig.posts_json}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setIsDirty(true);
                                                    setCurrentConfig(prev => {
                                                        let posts = prev.posts;
                                                        try { posts = JSON.parse(val); } catch (err) { }
                                                        return { ...prev, posts_json: val, posts };
                                                    });
                                                }}
                                                className={`w-full p-6 bg-slate-900 text-emerald-400 font-mono text-xs rounded-[2rem] border-4 focus:outline-none ${jsonError ? 'border-rose-500/30' : 'border-slate-800 focus:border-blue-500/30'}`}
                                            />
                                            {jsonError && <p className="text-rose-500 text-xs font-bold px-4">{jsonError}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    /* Visual Post List / Editor */
                                    <PostVisualEditor
                                        postsJson={currentConfig.posts_json}
                                        onUpdate={(json) => {
                                            setCurrentConfig({ ...currentConfig, posts_json: json });
                                            setIsDirty(true);
                                        }}
                                        editingPost={editingPost}
                                        setEditingPost={setEditingPost}
                                        tempPost={tempPost}
                                        setTempPost={setTempPost}
                                        setConfirmAction={setConfirmAction}
                                        showToast={showToast}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === 'groups' && (
                            /* Sub-Tab 2: Group Builder UI */
                            <GroupBuilderTab
                                currentConfig={currentConfig}
                                setCurrentConfig={setCurrentConfig}
                                addGroup={addGroup}
                                removeGroup={removeGroup}
                                togglePostInGroup={togglePostInGroup}
                                setIsDirty={setIsDirty}
                                calculateGroupTotals={calculateGroupTotals}
                            />
                        )}


                        {activeTab === 'manual' && (
                            /* Sub-Tab 3: Manual Entry UI */
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
                                <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-center gap-4">
                                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                        <Edit2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-blue-900">Manual Result Entry</h3>
                                        <p className="text-blue-600/70 text-sm font-medium">Add a student record directly to the database for {currentConfig.exam_name}.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    {/* Candidate Profile */}
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Candidate Profile</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={manualEntry.full_name}
                                                    onChange={e => setManualEntry({ ...manualEntry, full_name: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                                                    placeholder="Enter Student Name"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration No</label>
                                                    <input
                                                        type="text"
                                                        value={manualEntry.registration_number}
                                                        onChange={e => setManualEntry({ ...manualEntry, registration_number: e.target.value })}
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                                                        placeholder="8 digits"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                                                    <input
                                                        type="tel"
                                                        value={manualEntry.whatsapp_number}
                                                        onChange={e => setManualEntry({ ...manualEntry, whatsapp_number: e.target.value })}
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                                                        placeholder="Phone number"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                                                    <input
                                                        type="date"
                                                        value={manualEntry.dob}
                                                        onChange={e => setManualEntry({ ...manualEntry, dob: e.target.value })}
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                                    <input
                                                        type="email"
                                                        value={manualEntry.email}
                                                        onChange={e => setManualEntry({ ...manualEntry, email: e.target.value })}
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                                                        placeholder="student@example.com"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Community</label>
                                                    <select
                                                        value={manualEntry.community}
                                                        onChange={e => setManualEntry({ ...manualEntry, community: e.target.value })}
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none"
                                                    >
                                                        <option value="">Select</option>
                                                        <option value="GT">GT</option>
                                                        <option value="BC">BC</option>
                                                        <option value="BCM">BCM</option>
                                                        <option value="MBC/DC">MBC</option>
                                                        <option value="SC">SC</option>
                                                        <option value="SCA">SCA</option>
                                                        <option value="ST">ST</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                                                    <select
                                                        value={manualEntry.gender}
                                                        onChange={e => setManualEntry({ ...manualEntry, gender: e.target.value })}
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none"
                                                    >
                                                        <option value="">Select</option>
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PSTM Status</label>
                                                    <div className="flex items-center gap-4 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="pstm"
                                                                checked={manualEntry.pstm_status === true}
                                                                onChange={() => setManualEntry({ ...manualEntry, pstm_status: true })}
                                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm font-bold text-slate-700">Yes</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="pstm"
                                                                checked={manualEntry.pstm_status === false}
                                                                onChange={() => setManualEntry({ ...manualEntry, pstm_status: false })}
                                                                className="w-4 h-4 text-slate-400 focus:ring-slate-400"
                                                            />
                                                            <span className="text-sm font-bold text-slate-700">No</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Overall Rank</label>
                                                <input
                                                    type="number"
                                                    value={manualEntry.overall_rank}
                                                    onChange={e => setManualEntry({ ...manualEntry, overall_rank: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Communal Rank</label>
                                                <input
                                                    type="number"
                                                    value={manualEntry.communal_rank}
                                                    onChange={e => setManualEntry({ ...manualEntry, communal_rank: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        {/* Marks Breakdown */}
                                        <div className="space-y-6">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Marks & Performance</h4>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paper 1-A (Tamil)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={manualEntry.paper1_part_a}
                                                            onChange={e => setManualEntry({ ...manualEntry, paper1_part_a: e.target.value })}
                                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-blue-600 outline-none"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paper 1-B (GS)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={manualEntry.paper1_part_b}
                                                            onChange={e => setManualEntry({ ...manualEntry, paper1_part_b: e.target.value })}
                                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-emerald-600 outline-none"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paper 2 (Subject)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={manualEntry.paper2_marks}
                                                        onChange={e => setManualEntry({ ...manualEntry, paper2_marks: e.target.value })}
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-violet-600 outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Post Selected</label>
                                                    <select
                                                        value={manualEntry.post_selected}
                                                        onChange={e => setManualEntry({ ...manualEntry, post_selected: e.target.value })}
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none"
                                                    >
                                                        <option value="">Select Target Post</option>

                                                        {currentConfig?.groups?.length > 0 && (
                                                            <optgroup label="Analytical Groups (Unified)">
                                                                {currentConfig.groups.map(group => (
                                                                    <option key={group.name} value={group.name}>
                                                                        {group.name} (Unified Group)
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}

                                                        <optgroup label="Individual Posts">
                                                            {(function () {
                                                                try {
                                                                    const posts = JSON.parse(currentConfig.posts_json || '[]');
                                                                    return posts.map(post => (
                                                                        <option key={post.code} value={`${post.dept} (${post.code})`}>
                                                                            {post.code}: {post.dept.substring(0, 40)}...
                                                                        </option>
                                                                    ));
                                                                } catch (e) {
                                                                    return <option disabled>Invalid JSON in Post Library</option>;
                                                                }
                                                            })()}
                                                        </optgroup>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                <div className="pt-8 border-t border-slate-100 flex justify-end mt-8">
                                    <button
                                        onClick={handleManualSave}
                                        disabled={submittingManual}
                                        className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 flex items-center gap-3 transition-all active:scale-95 disabled:bg-slate-300"
                                    >
                                        {submittingManual ? (
                                            <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <CheckCircle2 size={24} />
                                        )}
                                        {submittingManual ? 'Submitting...' : 'Register Candidate Result'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'mappings' && (
                            /* Sub-Tab 4: Community Mappings UI */
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Community Alias Mapping</h3>
                                        <p className="text-xs text-slate-500 font-medium mt-1">Map incoming community names (from result) to system standard codes.</p>
                                    </div>
                                    <button
                                        onClick={() => setCurrentConfig({
                                            ...currentConfig,
                                            community_mapping: [...(currentConfig.community_mapping || []), { original: '', mapped_to: '' }]
                                        })}
                                        className="text-xs font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Add Mapping
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {(currentConfig.community_mapping || []).map((map, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Original (Result)</label>
                                                <input
                                                    type="text"
                                                    value={map.original}
                                                    onChange={e => {
                                                        const newMappings = [...currentConfig.community_mapping];
                                                        newMappings[idx].original = e.target.value;
                                                        setCurrentConfig({ ...currentConfig, community_mapping: newMappings });
                                                    }}
                                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm"
                                                    placeholder="e.g. OTHERS"
                                                />
                                            </div>
                                            <div className="text-slate-300">
                                                <ChevronRight size={20} />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mapped To (System)</label>
                                                <select
                                                    value={map.mapped_to}
                                                    onChange={e => {
                                                        const newMappings = [...currentConfig.community_mapping];
                                                        newMappings[idx].mapped_to = e.target.value;
                                                        setCurrentConfig({ ...currentConfig, community_mapping: newMappings });
                                                    }}
                                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm outline-none"
                                                >
                                                    <option value="">Select Target</option>
                                                    <option value="GT">GT</option>
                                                    <option value="BC">BC</option>
                                                    <option value="BCM">BCM</option>
                                                    <option value="MBC">MBC</option>
                                                    <option value="SC">SC</option>
                                                    <option value="SCA">SCA</option>
                                                    <option value="ST">ST</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newMappings = currentConfig.community_mapping.filter((_, i) => i !== idx);
                                                    setCurrentConfig({ ...currentConfig, community_mapping: newMappings });
                                                }}
                                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors mt-6"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!currentConfig.community_mapping || currentConfig.community_mapping.length === 0) && (
                                        <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold">
                                            No custom mappings defined. System defaults will be used.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'candidates' && (
                            <CandidatesTab
                                apps={apps}
                                loadingApps={loadingApps}
                                examName={currentConfig?.exam_name}
                                examTag={currentConfig?.exam_tag}
                                onPromote={handlePromoteCandidate}
                                fetchApps={mutateApps}
                                currentConfig={currentConfig}
                                showToast={showToast}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalCount={totalCount}
                                candidateSearch={candidateSearch}
                                setCandidateSearch={handleCandidateSearch}
                                statusFilter={statusFilter}
                                setStatusFilter={handleStatusFilter}
                                postFilter={postFilter}
                                setPostFilter={handlePostFilter}
                                sortBy={sortBy}
                                sortDir={sortDir}
                                onSort={handleSort}
                                onPageChange={handlePageChange}
                                onSearchSubmit={handleSearchSubmit}
                                stats={serverStats}
                                setConfirmAction={setConfirmAction}
                            />
                        )}
                    </div>
                </div>
            ) : (
                /* List View */
                <div className="space-y-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search architecture..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {loading ? (
                            <div className="p-20 text-center space-y-4">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
                                <p className="text-slate-400 font-bold">Fetching configurations...</p>
                            </div>
                        ) : filteredConfigs.length === 0 ? (
                            <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                                <Database className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-slate-400 font-bold text-lg">No configurations found.</p>
                                <button onClick={handleAddNew} className="mt-4 text-blue-600 font-black hover:underline">Create your first one</button>
                            </div>
                        ) : (
                            filteredConfigs.map(config => (
                                <div key={config.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
                                    <div className="flex justify-between items-center relative z-10">
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 bg-slate-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <Layers size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900">{config.exam_name}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <span className="bg-slate-100 px-3 py-1 rounded-full">{config.exam_tag}</span>
                                                    <span className="flex items-center gap-1"><Database size={10} /> {config.vacancies?.posts?.length || 0} Individual Posts</span>
                                                    <span className="flex items-center gap-1 text-blue-500"><List size={10} /> {config.vacancies?.groups?.length || 0} Analytical Groups</span>
                                                    <span className="flex items-center gap-1 text-emerald-600"><Users size={10} /> {config.result_count} Verified Students</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative group/portal">
                                                <select
                                                    value={config.portal_category || ''}
                                                    onChange={(e) => handleAssignPortal(config, e.target.value || null)}
                                                    className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all outline-none cursor-pointer ${config.portal_category === 'TNPSC_AE' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                                        config.portal_category === 'TNPSC_DIPLOMA_ITI' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                                            config.portal_category === 'SSC_JE' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                                'bg-slate-50 border-slate-200 text-slate-400'
                                                        }`}
                                                >
                                                    <option value="">No Portal</option>
                                                    <option value="TNPSC_AE">TNPSC AE</option>
                                                    <option value="TNPSC_DIPLOMA_ITI">TNPSC Diploma/ITI</option>
                                                    <option value="SSC_JE">SSC JE</option>
                                                </select>
                                                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={12} />
                                            </div>
                                            <button onClick={() => handleEdit(config)} className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(config.id)} className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )
            }
            {/* Unsaved Changes Premium Modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-500 border-2 border-amber-100/50 shadow-inner">
                                <ShieldAlert size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3">Unsaved Changes</h3>
                            <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
                                You have draft changes that haven't been saved to the database. Are you sure you want to exit?
                            </p>
                        </div>
                        <div className="bg-slate-50/50 p-6 flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowExitConfirm(false);
                                    handleSave({ preventDefault: () => { } });
                                }}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Save Now
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => router.push(pathname)}
                                    className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Discard & Exit
                                </button>
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all"
                                >
                                    Stay Here
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Confirm Modal */}
            {confirmAction.show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border-2 shadow-inner ${confirmAction.type === 'danger' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                                <ShieldAlert size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">{confirmAction.title}</h3>
                            <p className="text-slate-500 font-bold text-xs leading-relaxed px-2">
                                {confirmAction.message}
                            </p>
                        </div>
                        <div className="bg-slate-50/50 p-4 flex gap-3">
                            <button
                                onClick={() => setConfirmAction({ ...confirmAction, show: false })}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await confirmAction.onConfirm();
                                    setConfirmAction({ ...confirmAction, show: false });
                                }}
                                className={`flex-1 py-3 text-white rounded-xl font-black text-xs transition-all active:scale-[0.98] ${confirmAction.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} shadow-lg`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

const PostVisualEditor = ({ postsJson, onUpdate, editingPost, setEditingPost, tempPost, setTempPost, setConfirmAction, showToast }) => {
    let posts = [];
    let error = null;
    try {
        posts = JSON.parse(postsJson || '[]');
    } catch (e) {
        error = "Invalid JSON data found. Please fix in 'Raw JSON' mode.";
    }

    if (error) return <div className="p-8 bg-rose-50 text-rose-600 rounded-2xl font-bold text-center">{error}</div>;

    const handleSavePost = () => {
        if (!tempPost.code || !tempPost.dept) {
            showToast("Post Code and Department are required", "error");
            return;
        }

        let newPosts = [...posts];
        if (editingPost === 'new') {
            newPosts.push(tempPost);
        } else {
            // Edit mode - find index or replace
            // Assuming code might change, we replace carefully. 
            // Ideally we'd map by index but we used object ref for existing. 
            // Wait, editingPost is actually the original object or ID. 
            // Let's use index if we can, or just replace/append.
            // Simplified: If 'new', push. If existing, we need to know WHICH one to update.
            // Since we passed the object, we can find its index in the old array.
            const idx = posts.findIndex(p => p.code?.toString() === editingPost.code?.toString());
            if (idx >= 0) newPosts[idx] = tempPost;
            else newPosts.push(tempPost); // Fallback
        }

        onUpdate(JSON.stringify(newPosts, null, 2));
        setEditingPost(null);
    };

    const handleDelete = (code) => {
        setConfirmAction({
            show: true,
            title: 'Delete Post',
            message: `Are you sure you want to delete post ${code}? This will remove it from the list locally.`,
            onConfirm: () => {
                const newPosts = posts.filter(p => p.code !== code);
                onUpdate(JSON.stringify(newPosts, null, 2));
            }
        });
    };

    if (editingPost) {
        return (
            <div className="bg-slate-50 p-6 rounded-[2rem] animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-800">{editingPost === 'new' ? 'New Post' : 'Edit Post'}</h3>
                    <button onClick={() => setEditingPost(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Post Code</label>
                        <input
                            type="text"
                            value={tempPost.code || ''}
                            onChange={e => setTempPost({ ...tempPost, code: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm"
                            placeholder="e.g. 1661"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Post Name</label>
                        <input
                            type="text"
                            value={tempPost.post_name || ''}
                            onChange={e => setTempPost({ ...tempPost, post_name: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm"
                            placeholder="e.g. Assistant Engineer (Civil)"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department / Board</label>
                        <input
                            type="text"
                            value={tempPost.dept || ''}
                            onChange={e => setTempPost({ ...tempPost, dept: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm"
                            placeholder="e.g. Highways Department"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Vacancy Matrix</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['gt', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'].map(comm => (
                            <div key={comm} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2 border-b border-slate-50 pb-1">{comm}</span>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-slate-300 w-8">GEN</span>
                                        <input
                                            type="number"
                                            value={tempPost[`${comm}_gen`] || ''}
                                            onChange={e => setTempPost({ ...tempPost, [`${comm}_gen`]: parseInt(e.target.value) || 0 })}
                                            className="w-full px-2 py-1 bg-slate-50 rounded text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-pink-300 w-8">WOM</span>
                                        <input
                                            type="number"
                                            value={tempPost[`${comm}_women_gen`] || ''}
                                            onChange={e => setTempPost({ ...tempPost, [`${comm}_women_gen`]: parseInt(e.target.value) || 0 })}
                                            className="w-full px-2 py-1 bg-pink-50 rounded text-xs font-bold text-pink-700 focus:ring-2 focus:ring-pink-100 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-emerald-300 w-8">PSTM</span>
                                        <input
                                            type="number"
                                            value={tempPost[`${comm}_pstm`] || ''}
                                            onChange={e => setTempPost({ ...tempPost, [`${comm}_pstm`]: parseInt(e.target.value) || 0 })}
                                            className="w-full px-2 py-1 bg-emerald-50 rounded text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-100 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-violet-300 w-8">W-PSTM</span>
                                        <input
                                            type="number"
                                            value={tempPost[`${comm}_women_pstm`] || ''}
                                            onChange={e => setTempPost({ ...tempPost, [`${comm}_women_pstm`]: parseInt(e.target.value) || 0 })}
                                            className="w-full px-2 py-1 bg-violet-50 rounded text-xs font-bold text-violet-700 focus:ring-2 focus:ring-violet-100 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Special Reservations</h4>
                        <button
                            onClick={() => {
                                const s = tempPost.special_vacancies || [];
                                setTempPost({
                                    ...tempPost,
                                    special_vacancies: [...s, { community: 'GT', gender: 'General', is_pstm: false, special_category: '', seat_count: 0 }]
                                });
                            }}
                            className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            + Add Row
                        </button>
                    </div>
                    {(!tempPost.special_vacancies || tempPost.special_vacancies.length === 0) ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            No special categories defined (e.g. Low Vision, Ex-Servicemen)
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tempPost.special_vacancies.map((spec, sidx) => (
                                <div key={sidx} className="flex gap-3 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Community</label>
                                        <select
                                            value={spec.community}
                                            onChange={e => {
                                                const s = [...tempPost.special_vacancies];
                                                s[sidx].community = e.target.value;
                                                setTempPost({ ...tempPost, special_vacancies: s });
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none"
                                        >
                                            {['GT', 'BC', 'BCM', 'MBC/DC', 'SC', 'SCA', 'ST'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                                        <select
                                            value={spec.gender}
                                            onChange={e => {
                                                const s = [...tempPost.special_vacancies];
                                                s[sidx].gender = e.target.value;
                                                setTempPost({ ...tempPost, special_vacancies: s });
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none"
                                        >
                                            <option value="General">General</option>
                                            <option value="Women">Women</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PSTM</label>
                                        <div className="flex bg-white border border-slate-200 rounded-xl p-1">
                                            <button
                                                onClick={() => {
                                                    const s = [...tempPost.special_vacancies];
                                                    s[sidx].is_pstm = !s[sidx].is_pstm;
                                                    setTempPost({ ...tempPost, special_vacancies: s });
                                                }}
                                                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${spec.is_pstm ? 'bg-emerald-500 text-white' : 'text-slate-300'}`}
                                            >
                                                {spec.is_pstm ? 'YES' : 'NO'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-[2] space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category (e.g. Low Vision)</label>
                                        <input
                                            type="text"
                                            value={spec.special_category}
                                            onChange={e => {
                                                const s = [...tempPost.special_vacancies];
                                                s[sidx].special_category = e.target.value;
                                                setTempPost({ ...tempPost, special_vacancies: s });
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none"
                                            placeholder="Write Category..."
                                        />
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Seats</label>
                                        <input
                                            type="number"
                                            value={spec.seat_count || ''}
                                            onChange={e => {
                                                const s = [...tempPost.special_vacancies];
                                                s[sidx].seat_count = parseInt(e.target.value) || 0;
                                                setTempPost({ ...tempPost, special_vacancies: s });
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none text-blue-600"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const s = tempPost.special_vacancies.filter((_, i) => i !== sidx);
                                            setTempPost({ ...tempPost, special_vacancies: s });
                                        }}
                                        className="mb-1 p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end gap-4">
                    <button onClick={() => setEditingPost(null)} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
                    <button onClick={handleSavePost} className="px-8 py-3 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-black transition-colors shadow-lg">
                        {editingPost === 'new' ? 'Add to Local List' : 'Apply Changes to List'}
                    </button>
                </div>
            </div >
        );
    }

    const calculateTotal = (post) => {
        const communities = ['gt', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'];
        const suffixes = ['_gen', '_women_gen', '_pstm', '_women_pstm'];
        let total = 0;
        communities.forEach(c => {
            suffixes.forEach(s => {
                total += parseInt(post[`${c}${s}`]) || 0;
            });
        });

        // Add special vacancies to total
        if (post.special_vacancies && Array.isArray(post.special_vacancies)) {
            post.special_vacancies.forEach(spec => {
                total += parseInt(spec.seat_count) || 0;
            });
        }

        return total;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-xs font-bold text-slate-400">{posts.length} Posts Defined</div>
                <button
                    onClick={() => { setTempPost({}); setEditingPost('new'); }}
                    className="text-xs font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                    <Plus size={14} /> Add Post
                </button>
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2">
                {posts.map((post, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4">
                            <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg text-xs">{post.code}</span>
                            <div className="flex flex-col min-w-0">
                                <span className="font-black text-slate-900 text-sm truncate max-w-sm">
                                    {post.post_name || post.dept}
                                </span>
                                {post.post_name && (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase truncate">
                                        {post.dept}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded">
                                    Total Vacancies: {calculateTotal(post)}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => { setTempPost({ ...post }); setEditingPost(post); }}
                                className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(post.code)}
                                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {posts.length === 0 && (
                    <div className="text-center p-12 text-slate-300 font-bold text-sm bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        No posts found. Add one manually or paste JSON.
                    </div>
                )}
            </div>
        </div>
    );
};

// Sub-component for Group Builder to handle search state
const GroupBuilderTab = ({ currentConfig, setCurrentConfig, addGroup, removeGroup, togglePostInGroup, setIsDirty, calculateGroupTotals }) => {
    const [postSearch, setPostSearch] = useState('');

    const libraryPosts = React.useMemo(() => {
        try {
            return JSON.parse(currentConfig.posts_json || '[]');
        } catch (e) {
            return [];
        }
    }, [currentConfig.posts_json]);

    const handleBulkAdd = (gIdx, postsToAdd) => {
        const updatedGroups = [...currentConfig.groups];
        const group = updatedGroups[gIdx];

        // Add only ones not already there
        const newCodes = postsToAdd.map(p => p.code).filter(c => !group.post_codes.includes(c));
        group.post_codes = [...group.post_codes, ...newCodes];

        setCurrentConfig(prev => ({ ...prev, groups: updatedGroups }));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-slate-100 p-4 rounded-2xl">
                <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Current Groups</h3>
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-4 top-3 text-slate-400" />
                        <input
                            type="text"
                            value={postSearch}
                            onChange={(e) => setPostSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Search available posts to add (e.g. Fitter)..."
                        />
                    </div>
                </div>
                <button onClick={addGroup} className="text-xs font-black bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                    <Plus size={16} /> New Group
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {currentConfig.groups.map((group, gIdx) => {
                    const linkedPosts = libraryPosts.filter(p => group.post_codes.includes(p.code));
                    const availablePosts = libraryPosts.filter(p => !group.post_codes.includes(p.code) && (
                        p.code.includes(postSearch) ||
                        p.dept.toLowerCase().includes(postSearch.toLowerCase()) ||
                        p.post_name?.toLowerCase().includes(postSearch.toLowerCase())
                    ));

                    return (
                        <div key={gIdx} className="border-2 border-slate-100 rounded-[2rem] p-6 bg-white shadow-sm">
                            {/* Group Header */}
                            <div className="flex justify-between items-center mb-6 pl-2">
                                <div className="flex-1 flex items-center gap-3 min-w-0">
                                    <div className="flex-shrink-0 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">
                                        {gIdx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <input
                                            value={group.name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setIsDirty(true);
                                                setCurrentConfig(prev => {
                                                    const newGroups = [...prev.groups];
                                                    newGroups[gIdx].name = val;
                                                    return { ...prev, groups: newGroups };
                                                });
                                            }}
                                            className="w-full text-lg font-black text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none transition-colors"
                                        />
                                        <p className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-2">
                                            <span>{group.post_codes.length} Posts Linked</span>
                                            {linkedPosts.length > 0 && (
                                                <>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                    <span className="text-blue-500 font-black">
                                                        {(() => {
                                                            const totals = calculateGroupTotals(group.post_codes, libraryPosts);
                                                            const grandTotal = Object.keys(totals)
                                                                .filter(k => k !== 'post_breakdown')
                                                                .reduce((sum, comm) => sum + (totals[comm].total || 0), 0);
                                                            return `${grandTotal} Total Vacancies`;
                                                        })()}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {postSearch && availablePosts.length > 0 && (
                                        <button
                                            onClick={() => handleBulkAdd(gIdx, availablePosts)}
                                            className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors mr-2"
                                        >
                                            + Link {availablePosts.length} Matches
                                        </button>
                                    )}
                                    <button onClick={() => removeGroup(gIdx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Linked Posts Section */}
                            <div className="mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3 ml-1 flex items-center gap-2">
                                    <CheckCircle2 size={12} /> Linked Posts ({linkedPosts.length})
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                    {linkedPosts.length > 0 ? linkedPosts.map(post => (
                                        <button
                                            key={post.code}
                                            type="button"
                                            onClick={() => togglePostInGroup(gIdx, post.code)}
                                            className="px-3 py-2 rounded-lg text-xs font-bold bg-white border border-blue-200 text-slate-700 shadow-sm flex items-center gap-2 hover:border-rose-300 hover:text-rose-600 group transition-all"
                                        >
                                            <span className="font-black text-blue-600 group-hover:text-rose-500">{post.code}</span>
                                            <span className="opacity-70 truncate max-w-[150px]">{post.dept}</span>
                                            <X size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    )) : (
                                        <p className="text-xs text-slate-400 italic font-medium pl-1">No posts linked yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* Available Posts Section */}
                            <div>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1 flex items-center gap-2">
                                    <List size={12} /> Available Library ({postSearch ? availablePosts.length : 'All'})
                                </h5>
                                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto content-start pr-2 custom-scrollbar">
                                    {availablePosts.map(post => (
                                        <button
                                            key={post.code}
                                            type="button"
                                            onClick={() => togglePostInGroup(gIdx, post.code)}
                                            className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-50 border border-slate-200 text-slate-500 hover:bg-white hover:border-blue-400 hover:text-blue-600 transition-all text-left"
                                        >
                                            <span className="font-black opacity-50 mr-1.5">{post.code}</span>
                                            <span className="truncate max-w-[180px]">{post.post_name || post.dept}</span>
                                        </button>
                                    ))}
                                    {availablePosts.length === 0 && (
                                        <p className="text-xs text-slate-300 italic font-medium pl-1">
                                            {postSearch ? 'No matching posts found.' : 'All posts linked.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* Components should be declared after the main component usually, but keeping them here for consistency with original file structure */

const SearchablePostFilter = ({ value, onChange, groups, posts }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredGroups = (groups || []).filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.post_codes.some(c => c.toString().includes(searchTerm))
    );

    const groupedPostCodes = new Set((groups || []).flatMap(g => g.post_codes || []).map(c => c.toString()));

    const filteredPosts = (posts || []).filter(p => {
        // Rule: If a post is already in a group, hide it from individual posts section
        const isAlreadyInGroup = groupedPostCodes.has((p.code || '').toString());
        if (isAlreadyInGroup) return false;

        return (p.post_name || p.dept || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.code || '').toString().includes(searchTerm);
    });

    const activeItem = value === 'all'
        ? { label: 'Every Post' }
        : (groups?.find(g => g.name === value)
            ? { label: groups.find(g => g.name === value).name }
            : { label: value });

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm min-w-[200px] max-w-[250px] text-left hover:bg-slate-50 transition-all border border-transparent active:scale-95 group/btn"
            >
                <Briefcase size={16} className="text-slate-400 shrink-0 group-hover/btn:text-blue-500 transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 truncate pr-4">
                    {activeItem?.label || 'Every Post'}
                </span>
                <ChevronDown size={14} className={`text-slate-400 absolute right-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[320px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 z-[100] animate-in slide-in-from-top-2 duration-200">
                    <div className="relative mb-3">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search posts or codes..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl text-[11px] font-bold border-none outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                        <button
                            onClick={() => { onChange('all'); setIsOpen(false); setSearchTerm(''); }}
                            className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${value === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                            Every Post
                        </button>

                        {filteredGroups.length > 0 && (
                            <div className="pt-2">
                                <h6 className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50 rounded-lg mb-2">Analytical Groups</h6>
                                {filteredGroups.map(g => (
                                    <button
                                        key={g.name}
                                        onClick={() => { onChange(g.name); setIsOpen(false); setSearchTerm(''); }}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mb-1 ${value === g.name ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span>{g.name}</span>
                                            {g.post_codes?.length > 0 && (
                                                <span className={`text-[8px] opacity-50 font-bold truncate ${value === g.name ? 'text-white' : 'text-slate-400'}`}>
                                                    ({g.post_codes.join(', ')})
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredPosts.length > 0 && (
                            <div className="pt-2">
                                <h6 className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50 rounded-lg mb-2">Individual Posts</h6>
                                {filteredPosts.map(p => {
                                    const displayName = p.post_name || p.dept;
                                    const isSelected = value === displayName;
                                    return (
                                        <button
                                            key={p.code}
                                            onClick={() => { onChange(displayName); setIsOpen(false); setSearchTerm(''); }}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mb-1 flex items-center justify-between gap-4 ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            <span className="truncate leading-tight">{displayName}</span>
                                            <span className={`shrink-0 text-[10px] font-black ${isSelected ? 'text-white/70' : 'text-slate-300'}`}>{p.code}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {filteredGroups.length === 0 && filteredPosts.length === 0 && (
                            <div className="py-12 text-center">
                                <Search size={24} className="mx-auto text-slate-100 mb-2" />
                                <p className="text-slate-300 italic text-[11px] font-bold">No matching posts found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const CandidatesTab = ({
    apps, loadingApps, examName, examTag, onPromote, fetchApps, currentConfig, showToast,
    currentPage, totalPages, totalCount, candidateSearch, setCandidateSearch, statusFilter, setStatusFilter,
    postFilter, setPostFilter, sortBy, sortDir, onSort,
    onPageChange, onSearchSubmit, stats: serverStats, setConfirmAction
}) => {
    const [promotingApp, setPromotingApp] = useState(null);
    const [promoData, setPromoData] = useState({ rank: '', marks: '', department: '', post_code: '', year: new Date().getFullYear(), quote: '' });
    const currentLimit = 50;

    const getRelevantResult = (app) => {
        if (!postFilter || postFilter === 'all') return app.results?.[0] || null;
        // Search in app.results for a result that matches the postFilter
        return app.results?.find(r =>
            r.post_selected?.toLowerCase().includes(postFilter.toLowerCase())
        ) || app.results?.[0] || null;
    };

    const SortIndicator = ({ col }) => {
        if (sortBy !== col) return <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />;
    };

    const extractAllPostCodes = (str) => {
        if (!str) return [];
        const matches = str.match(/\d{4}/g);
        return matches ? Array.from(new Set(matches)) : [];
    };

    const handleRemovePromotion = async (app, postName) => {
        setConfirmAction({
            show: true,
            title: 'Remove Promotion',
            message: `Are you sure you want to cancel the promotion for ${postName}? This will remove them from the Public Gallery.`,
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/exams/applications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            memberId: app.member_id,
                            examTag: examTag,
                            examName: examName,
                            department: postName,
                            action: 'remove'
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast('Promotion cancelled.', 'success');
                        fetchApps();
                        // Update local state if modal is open
                        if (promotingApp && promotingApp.member_id === app.member_id) {
                            setPromotingApp(prev => ({
                                ...prev,
                                results: prev.results.filter(r => r.post_selected !== postName)
                            }));
                        }
                    } else {
                        showToast(data.error || 'Failed to remove', 'error');
                    }
                } catch (e) {
                    showToast('Error removing promotion', 'error');
                }
            }
        });
    };

    const handleToggleAchiever = async (app) => {
        if (!app.member_id) {
            showToast('Please register/sync this candidate first.', 'warning');
            return;
        }

        const isCurrentlyAchiever = app.members?.is_achiever;
        const action = async () => {
            try {
                const res = await fetch(`/api/admin/members/${app.member_id}/achiever`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        is_achiever: !isCurrentlyAchiever
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(isCurrentlyAchiever ? 'Achiever status removed.' : 'Achiever status added.', 'success');
                    fetchApps();
                } else {
                    showToast(data.error || 'Toggle failed', 'error');
                }
            } catch (e) {
                showToast('Error toggling achiever status', 'error');
            }
        };

        if (isCurrentlyAchiever) {
            setConfirmAction({
                show: true,
                title: 'Remove Star Badge',
                message: `Are you sure you want to remove the star badge from ${app.members?.display_name}?`,
                onConfirm: action
            });
        } else {
            action();
        }
    };

    const handleUnverify = async (app) => {
        setConfirmAction({
            show: true,
            title: 'Reset Verification',
            message: `Are you sure you want to reset the verification status for ${app.members?.display_name}? This will clear their verified rank and marks.`,
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/exams/applications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            applicationId: app.id,
                            memberId: app.member_id,
                            examTag: examTag,
                            action: 'unverify'
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast('Status reset to Applied.', 'success');
                        fetchApps();
                    } else {
                        showToast(data.error || 'Reset failed', 'error');
                    }
                } catch (e) {
                    showToast('Error resetting status', 'error');
                }
            }
        });
    };

    const handleQuickVerify = async (app) => {
        setConfirmAction({
            show: true,
            title: 'Verify Candidate',
            message: `Are you sure you want to verify ${app.members?.display_name}? This will mark their result as official.`,
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/exams/applications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            applicationId: app.id,
                            memberId: app.member_id,
                            examTag: examTag,
                            action: 'verify',
                            registrationNumber: app.registration_number,
                            rank: app.verified_rank || app.results?.[0]?.overall_rank,
                            marks: app.verified_marks || app.results?.[0]?.total_marks,
                            department: app.verified_post_selected || app.results?.[0]?.post_selected
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast('Candidate verified!', 'success');
                        fetchApps();
                    } else {
                        showToast(data.error || 'Verification failed', 'error');
                    }
                } catch (e) {
                    showToast('Error verifying candidate', 'error');
                }
            }
        });
    };

    const handleRegisterMember = async (app) => {
        // Use the first result payload to register
        const resPayload = app.results?.[0];
        if (!resPayload) {
            showToast('No result data available to register member.', 'error');
            return;
        }

        setConfirmAction({
            show: true,
            title: 'Auto-Register Member',
            message: `Create a new member account for ${resPayload.full_name} and link it to this application?`,
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/exams/applications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            applicationId: app.id,
                            memberId: null, // Since it's missing
                            examTag: examTag,
                            action: 'register',
                            email: resPayload.email,
                            whatsapp_number: resPayload.whatsapp_number,
                            full_name: resPayload.full_name,
                            dob: resPayload.dob,
                            community: resPayload.community,
                            gender: resPayload.gender,
                            registrationNumber: resPayload.registration_number
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast('Member registered and linked!', 'success');
                        fetchApps();
                    } else {
                        showToast(data.error || 'Registration failed', 'error');
                    }
                } catch (e) {
                    showToast('Error registering member', 'error');
                }
            }
        });
    };

    const startPromote = (app, existingResult = null) => {
        setPromotingApp(app);
        const res = existingResult || app.results?.[0];
        setPromoData({
            rank: res?.overall_rank || app.verified_rank || '',
            marks: res?.total_marks || app.verified_marks || '',
            department: res?.post_selected || app.verified_post_selected || '',
            post_code: res?.post_selected ? `EXT_${res.post_selected}` : '',
            year: new Date().getFullYear(),
            quote: res?.quote || ''
        });
    };

    const exportToCSV = () => {
        const headers = ["Name", "Email", "Reg No", "Status", "Rank", "Marks", "Selected Post"];
        const rows = apps.map(app => [
            `"${app.members?.display_name || "Anonymous"}"`,
            `"${app.members?.email || "N/A"}"`,
            `"${app.registration_number || "N/A"}"`,
            `"${app.status}"`,
            `"${app.verified_rank || ""}"`,
            `"${app.verified_marks || ""}"`,
            `"${app.verified_post_selected || ""}"`
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `applicants_${examTag}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const dashboardStats = [
        { label: 'Total Candidates', value: serverStats?.total ?? totalCount, color: 'bg-slate-900', icon: Users },
        { label: 'Found Result', value: totalCount, color: 'bg-blue-600', icon: Filter },
        { label: 'Verified', value: serverStats?.verified ?? '---', color: 'bg-emerald-600', icon: CheckCircle2 },
        { label: 'Not Registered', value: serverStats?.not_registered ?? '---', color: 'bg-rose-500', icon: UserX },
        { label: 'Achievers', value: serverStats?.achievers ?? '---', color: 'bg-amber-400', icon: Star }
    ];

    if (loadingApps && apps.length === 0) return (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-sm uppercase tracking-widest">Loading Candidates...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Dashboard Summary */}
            {/* Dashboard Summary */}
            <div className="grid grid-cols-5 gap-4">
                {dashboardStats.map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${stat.color} text-white flex items-center justify-center shadow-lg`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-slate-100/50 p-4 rounded-[2rem] border border-slate-100">
                <div className="relative flex-1 min-w-[300px]">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email or reg no... (Press Enter)"
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSearchSubmit();
                            }
                        }}
                        className="w-full pl-12 pr-6 py-3 bg-white rounded-2xl text-sm font-bold border-none outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm">
                    <Filter size={16} className="text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-700 outline-none border-none cursor-pointer"
                    >
                        <option value="all">Show All</option>
                        <option value="verified">Verified Only</option>
                        <option value="not_registered">Not Registered (Orphan)</option>
                        <option value="applied">Pending Only</option>
                        <option value="achiever">Star Achievers</option>
                    </select>
                </div>

                <SearchablePostFilter
                    value={postFilter}
                    onChange={setPostFilter}
                    groups={currentConfig?.groups}
                    posts={currentConfig?.posts}
                />

                <div className="flex gap-2">
                    <button
                        onClick={exportToCSV}
                        className="p-3 bg-white text-slate-600 hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm group"
                        title="Export to CSV"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={() => fetchApps()}
                        className={`px-6 py-3 bg-white text-blue-600 font-black text-xs uppercase tracking-widest hover:bg-blue-50 rounded-2xl transition-all shadow-sm flex items-center gap-2 ${loadingApps ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <RefreshCw size={14} className={loadingApps ? 'animate-spin' : ''} />
                        {loadingApps ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {promotingApp ? (
                <div className="max-w-xl mx-auto bg-slate-50 p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                                <Star size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Manage Results</h3>
                                <p className="text-sm font-medium text-slate-500">{promotingApp.members?.display_name}</p>
                            </div>
                        </div>
                        <button onClick={() => setPromotingApp(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Section 1: Existing Results */}
                    {promotingApp.results?.length > 0 && (
                        <div className="mb-8 p-4 bg-white rounded-3xl border border-slate-200">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                                <ShieldAlert size={12} className="text-amber-500" /> Currently Verified Results
                            </h4>
                            <div className="space-y-2">
                                {promotingApp.results.map((res, i) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-2xl border ${res.is_verified ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                                        <div>
                                            <p className="text-xs font-black text-slate-900">{res.post_selected}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Rank: {res.overall_rank || 'N/A'} • Marks: {res.total_marks || 'N/A'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {res.is_verified && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const codes = extractAllPostCodes(res.post_selected);
                                                            let matchedGroup = null;
                                                            let matchedPost = null;

                                                            // 1. Try Group Matching first (The "Group Builder" long-term fix)
                                                            if (currentConfig?.groups && Array.isArray(currentConfig.groups)) {
                                                                matchedGroup = currentConfig.groups.find(g =>
                                                                    g.post_codes.some(c => codes.includes(c))
                                                                );
                                                            }

                                                            // 2. Fallback to individual post matching
                                                            if (!matchedGroup) {
                                                                matchedPost = (currentConfig?.posts || []).find(p => codes.includes(p.code));
                                                            }

                                                            setPromoData({
                                                                rank: res.overall_rank || '',
                                                                marks: res.total_marks || '',
                                                                department: matchedGroup ? matchedGroup.name : (matchedPost ? (matchedPost.post_name || matchedPost.dept) : (res.post_selected || '')),
                                                                post_code: matchedGroup ? `GROUP_${matchedGroup.name}` : (matchedPost ? matchedPost.code : (codes[0] || '')),
                                                                year: new Date().getFullYear(),
                                                                quote: res.quote || ''
                                                            });
                                                        }}
                                                        className="p-2 bg-white text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm border border-blue-100"
                                                        title="Edit this result"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemovePromotion(promotingApp, res.post_selected)}
                                                        className="p-2 bg-white text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm border border-rose-100"
                                                        title="Remove this result"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section 2: Update / Add Result */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="col-span-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                                <Plus size={12} className="text-blue-500" /> Update / Add Verified Result
                            </h4>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Post / Department</label>
                            <select
                                value={promoData.post_code}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val.startsWith('GROUP_')) {
                                        const groupName = val.replace('GROUP_', '');
                                        const group = (currentConfig?.groups || []).find(g => g.name === groupName);
                                        setPromoData({
                                            ...promoData,
                                            post_code: val,
                                            department: group ? group.name : ''
                                        });
                                    } else {
                                        const selectedPost = (currentConfig?.posts || []).find(p => p.code === val);
                                        setPromoData({
                                            ...promoData,
                                            post_code: val,
                                            department: selectedPost ? (selectedPost.post_name || selectedPost.dept) : ''
                                        });
                                    }
                                }}
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none"
                            >
                                <option value="">-- Choose Position --</option>

                                {currentConfig?.groups?.length > 0 && (
                                    <optgroup label="Analytical Groups (Unified)">
                                        {currentConfig.groups.map(group => (
                                            <option key={group.name} value={`GROUP_${group.name}`}>
                                                {group.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                                <optgroup label="Individual Posts">
                                    {(currentConfig?.posts || []).map(post => (
                                        <option key={post.code} value={post.code}>
                                            {post.post_name || post.dept} ({post.code})
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rank</label>
                            <input
                                type="text"
                                value={promoData.rank}
                                onChange={e => setPromoData({ ...promoData, rank: e.target.value })}
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                                placeholder="AIR 42"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marks</label>
                            <input
                                type="text"
                                value={promoData.marks}
                                onChange={e => setPromoData({ ...promoData, marks: e.target.value })}
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                                placeholder="385.50"
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quote (Optional)</label>
                            <textarea
                                value={promoData.quote}
                                onChange={e => setPromoData({ ...promoData, quote: e.target.value })}
                                className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold min-h-[80px]"
                                placeholder="Inspiring quote for gallery..."
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => { onPromote(promotingApp, promoData, 'verify'); setPromotingApp(null); }}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <ShieldCheck size={18} />
                            Verify & Save Internally
                        </button>

                        <button
                            onClick={() => { onPromote(promotingApp, promoData, 'promote'); setPromotingApp(null); }}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Star size={18} fill="white" />
                            Publish to Gallery & Star Status
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm relative">
                    {loadingApps && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-[2.5rem]">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {/* Consolidated Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th
                                        className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer group hover:bg-slate-100/50 transition-colors"
                                        onClick={() => onSort('verified_rank')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Rank <SortIndicator col="verified_rank" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Member</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Post Code</th>
                                    <th
                                        className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer group hover:bg-slate-100/50 transition-colors"
                                        onClick={() => onSort('verified_marks')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Marks <SortIndicator col="verified_marks" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Connect</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {apps.map((app, index) => {
                                    const relevantResult = getRelevantResult(app);
                                    const rank = app.verified_rank || relevantResult?.overall_rank;
                                    const marks = app.verified_marks || relevantResult?.total_marks;

                                    const isOrphan = !app.members;
                                    console.log('App:', app.registration_number, 'Members:', app.members, 'IsOrphan:', isOrphan);

                                    return (
                                        <tr key={index} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none">
                                            <td className="px-6 py-4 w-24">
                                                <div className="flex items-center gap-2">
                                                    <Trophy size={14} className={rank ? "text-amber-500" : "text-slate-200"} />
                                                    <span className="font-black text-slate-900">{rank || '---'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative group/avatar">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                                                            {app.members?.photo_url ? (
                                                                <img src={app.members.photo_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-slate-300 font-bold text-xs">{app.members?.display_name?.[0] || '?'}</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleToggleAchiever(app)}
                                                            className={`absolute -top-1.5 -right-1.5 p-1 rounded-lg border-2 border-white transition-all shadow-lg ${app.members?.is_achiever ? 'bg-amber-400 text-white scale-100 opacity-100' : 'bg-white text-slate-200 scale-75 opacity-0 group-hover/avatar:opacity-100 group-hover/avatar:scale-90 hover:text-amber-400'}`}
                                                            title={app.members?.is_achiever ? "Remove Star Badge" : "Add Star Badge"}
                                                        >
                                                            <Star size={8} fill={app.members?.is_achiever ? "currentColor" : "none"} />
                                                        </button>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm truncate max-w-[180px] leading-tight flex items-center gap-1.5">
                                                            {app.members?.display_name || 'Anonymous User'}
                                                        </p>
                                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{app.registration_number || 'N/A'}</p>
                                                            {app.members?.birth_date && (
                                                                <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                                                    <span className="opacity-50">DOB:</span>
                                                                    <span className="text-slate-500 font-bold">{app.members.birth_date}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 p-1 px-2.5 bg-slate-100/50 rounded-lg border border-slate-100 w-fit">
                                                    <Briefcase size={10} className="text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight truncate max-w-[150px]" title={app.verified_post_selected}>
                                                        {extractAllPostCodes(app.verified_post_selected).join(', ') || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-black text-blue-600 text-sm">{marks || '---'}</td>
                                            <td className="px-6 py-4">
                                                {app.status === 'verified' ? (
                                                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit border border-emerald-100/50">
                                                        <CheckCircle2 size={10} /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit border border-blue-100/50">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`https://wa.me/${app.members?.phone_number || ''}`}
                                                        target="_blank"
                                                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all shadow-sm border border-emerald-100/50"
                                                        title="WhatsApp Student"
                                                    >
                                                        <MessageSquare size={14} />
                                                    </a>
                                                    <a
                                                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${app.members?.email || ''}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm border border-blue-100/50"
                                                        title="Email via Gmail"
                                                    >
                                                        <Mail size={14} />
                                                    </a>
                                                    {app.admit_card_url && (
                                                        <a
                                                            href={app.admit_card_url}
                                                            target="_blank"
                                                            className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-lg transition-all shadow-sm border border-slate-200"
                                                            title="View Hall Ticket"
                                                        >
                                                            <FileJson size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    {/* Sync / Register Logic - Show if orphan */}
                                                    {(!app.members || !app.member_id) && (
                                                        <button
                                                            onClick={() => handleRegisterMember(app)}
                                                            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 mb-1"
                                                            title="Auto-Register Member to Sync"
                                                        >
                                                            <UserPlus size={14} /> Sync
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => startPromote(app)}
                                                        className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-sm border ${app.status === 'verified'
                                                            ? 'bg-slate-900 text-white hover:bg-black border-black'
                                                            : 'bg-white text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100 hover:border-blue-600'
                                                            }`}
                                                    >
                                                        Manage
                                                    </button>

                                                    {app.status === 'verified' ? (
                                                        <button
                                                            onClick={() => handleUnverify(app)}
                                                            className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors px-2 mt-1"
                                                        >
                                                            Reset
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleQuickVerify(app)}
                                                            className="text-[8px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-700 transition-colors px-2 mt-1"
                                                        >
                                                            Verify
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {apps.length === 0 && !loadingApps && (
                        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 m-6">
                            <Users size={48} className="mx-auto text-slate-200 mb-4" />
                            <h4 className="text-lg font-black text-slate-400 uppercase tracking-widest">No Matches Found</h4>
                            <p className="text-slate-400/70 text-sm font-medium">Try adjusting your filters or search terms.</p>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    {totalPages > 0 && (
                        <div className="flex items-center justify-between px-8 py-6 bg-slate-50 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-400">
                                Showing <span className="text-slate-900">{((currentPage - 1) * currentLimit) + 1} - {Math.min(currentPage * currentLimit, totalCount)}</span> of <span className="text-slate-900">{totalCount}</span> candidates
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onPageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loadingApps}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-50 transition-all shadow-sm"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <div className="flex items-center gap-2 px-4 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 py-2">
                                    <span>Page</span>
                                    <select
                                        value={currentPage}
                                        onChange={(e) => onPageChange(Number(e.target.value))}
                                        className="bg-transparent outline-none cursor-pointer hover:underline"
                                    >
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                    <span>of {totalPages}</span>
                                </div>

                                <button
                                    onClick={() => onPageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || loadingApps}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white disabled:opacity-50 transition-all shadow-sm"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminExamConfig;
