import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const BatchContext = createContext();

export const useBatches = () => {
    const context = useContext(BatchContext);
    if (!context) {
        throw new Error('useBatches must be used within a BatchProvider');
    }
    return context;
};

export const BatchProvider = ({ children }) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Skip heavy background data fetching on public auth pages
        const publicAuthPaths = ['/login', '/student/signup', '/forgot-password', '/reset-password'];
        if (publicAuthPaths.includes(window.location.pathname)) {
            setLoading(false);
            return;
        }
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            // 1. Fetch batches
            const { data, error } = await supabase
                .from('batches')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                setBatches([]);
                return;
            }

            // 2. Fetch all counts in 2 single batch queries (instead of 486 individual queries)
            const [{ data: allBatchMembers }, { data: allBatchCourses }] = await Promise.all([
                supabase.from('batch_members').select('batch_id'),
                supabase.from('batch_courses').select('batch_id')
            ]);

            const memberCountMap = {};
            (allBatchMembers || []).forEach(row => {
                memberCountMap[row.batch_id] = (memberCountMap[row.batch_id] || 0) + 1;
            });

            const courseCountMap = {};
            (allBatchCourses || []).forEach(row => {
                courseCountMap[row.batch_id] = (courseCountMap[row.batch_id] || 0) + 1;
            });

            const batchesWithCounts = data.map(batch => ({
                ...batch,
                users: memberCountMap[batch.id] || 0,
                courses: courseCountMap[batch.id] || 0
            }));

            setBatches(batchesWithCounts);
        } catch (error) {
            console.error('Error fetching batches:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addBatch = async (batchData) => {
        try {
            const newBatch = {
                name: batchData.name,
                // Optional fields from Testpress import
                url: batchData.url || null,
                modified: batchData.modified || null,
                is_local: batchData.is_local !== undefined ? batchData.is_local : true,
            };

            // If ID is provided (from import), include it
            if (batchData.id) {
                newBatch.id = batchData.id;
            }

            const { data, error } = await supabase
                .from('batches')
                .insert([newBatch])
                .select();

            if (error) throw error;

            if (data) {
                const createdBatch = { ...data[0], users: 0, courses: 0 };
                setBatches(prev => [createdBatch, ...prev]);
                return { success: true, batch: createdBatch };
            }
        } catch (error) {
            console.error('Error adding batch:', error.message);
            return { success: false, error: error.message };
        }
    };

    const updateBatch = async (id, updatedData) => {
        try {
            const { error } = await supabase
                .from('batches')
                .update({ name: updatedData.name })
                .eq('id', id);

            if (error) throw error;

            setBatches(prev => prev.map(batch =>
                String(batch.id) === String(id) ? { ...batch, ...updatedData } : batch
            ));
        } catch (error) {
            console.error('Error updating batch:', error.message);
        }
    };

    const deleteBatch = async (id) => {
        try {
            const { error } = await supabase
                .from('batches')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setBatches(prev => prev.filter(batch => String(batch.id) !== String(id)));
        } catch (error) {
            console.error('Error deleting batch:', error.message);
        }
    };

    const getBatch = (id) => {
        return batches.find(batch => String(batch.id) === String(id));
    };

    const cloneBatch = async (id) => {
        try {
            const originalBatch = batches.find(batch => batch.id === id);
            if (!originalBatch) throw new Error('Batch not found');

            const { data: newBatchData, error: batchError } = await supabase
                .from('batches')
                .insert([{ name: `${originalBatch.name} (Copy)` }])
                .select();

            if (batchError) throw batchError;

            const newBatchId = newBatchData[0].id;

            const { data: members, error: membersError } = await supabase
                .from('batch_members')
                .select('member_id')
                .eq('batch_id', id);

            if (membersError) throw membersError;

            if (members && members.length > 0) {
                const memberInserts = members.map(m => ({
                    batch_id: newBatchId,
                    member_id: m.member_id
                }));

                const { error: insertMembersError } = await supabase
                    .from('batch_members')
                    .insert(memberInserts);

                if (insertMembersError) throw insertMembersError;
            }

            const { data: courses, error: coursesError } = await supabase
                .from('batch_courses')
                .select('course_id')
                .eq('batch_id', id);

            if (coursesError) throw coursesError;

            if (courses && courses.length > 0) {
                const courseInserts = courses.map(c => ({
                    batch_id: newBatchId,
                    course_id: c.course_id
                }));

                const { error: insertCoursesError } = await supabase
                    .from('batch_courses')
                    .insert(courseInserts);

                if (insertCoursesError) throw insertCoursesError;
            }

            await fetchBatches();

            return newBatchData[0];
        } catch (error) {
            console.error('Error cloning batch:', error.message);
            throw error;
        }
    };

    const addMembersToBatch = async (batchId, memberIds) => {
        try {
            let apiSuccess = false;

            // 1. Try via backend API route (bypasses RLS using service role)
            try {
                const res = await fetch('/api/batch-members', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batchId, memberIds, instituteId: 10 })
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        apiSuccess = true;
                    }
                }
            } catch (apiErr) {
                console.warn('API /api/batch-members not available, falling back to direct insert:', apiErr);
            }

            // 2. Direct Supabase insert fallback
            if (!apiSuccess) {
                const inserts = memberIds.map(memberId => ({
                    batch_id: parseInt(batchId),
                    member_id: parseInt(memberId),
                    institute_id: 10
                }));

                const { error } = await supabase
                    .from('batch_members')
                    .insert(inserts);

                if (error) throw error;
            }

            await fetchBatches();
        } catch (error) {
            console.error('Error adding members to batch:', error.message);
            throw error;
        }
    };

    const removeMembersFromBatch = async (batchId, memberIds) => {
        try {
            let apiSuccess = false;

            // 1. Try via backend API route (bypasses RLS using service role)
            try {
                const res = await fetch('/api/batch-members', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batchId, memberIds })
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        apiSuccess = true;
                    }
                }
            } catch (apiErr) {
                console.warn('API /api/batch-members delete not available, falling back:', apiErr);
            }

            // 2. Direct Supabase delete fallback
            if (!apiSuccess) {
                const { error } = await supabase
                    .from('batch_members')
                    .delete()
                    .eq('batch_id', parseInt(batchId))
                    .in('member_id', memberIds.map(id => parseInt(id)));

                if (error) throw error;
            }

            await fetchBatches();
        } catch (error) {
            console.error('Error removing members from batch:', error.message);
            throw error;
        }
    };

    const removeCoursesFromBatch = async (batchId, courseIds) => {
        try {
            const { error } = await supabase
                .from('batch_courses')
                .delete()
                .eq('batch_id', batchId)
                .in('course_id', courseIds);

            if (error) throw error;

            await fetchBatches();
        } catch (error) {
            console.error('Error removing courses from batch:', error.message);
            throw error;
        }
    };

    const addCoursesToBatch = async (batchId, courseIds) => {
        try {
            const inserts = courseIds.map(courseId => ({
                batch_id: batchId,
                course_id: courseId
            }));

            const { error } = await supabase
                .from('batch_courses')
                .insert(inserts);

            if (error) throw error;

            await fetchBatches();
        } catch (error) {
            console.error('Error adding courses to batch:', error.message);
            throw error;
        }
    };

    const forceLogoutBatchMembers = async (batchId) => {
        try {
            // 1. Try via backend API (runs with service role to delete sessions and notify Realtime)
            try {
                const res = await fetch('/api/batch-members', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batchId, action: 'force-logout' })
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        return { count: json.count || 0 };
                    }
                }
            } catch (apiErr) {
                console.warn('API force-logout call failed, attempting direct fallback:', apiErr);
            }

            // 2. Direct database fallback
            const { data: batchMembers, error: fetchError } = await supabase
                .from('batch_members')
                .select('member_id')
                .eq('batch_id', parseInt(batchId));

            if (fetchError) throw fetchError;

            if (!batchMembers || batchMembers.length === 0) {
                return { count: 0 };
            }

            const memberIds = batchMembers.map(m => m.member_id);

            // Fetch auth_user_id and id to delete active sessions
            const { data: membersList, error: mError } = await supabase
                .from('members')
                .select('id, auth_user_id, custom_data')
                .in('id', memberIds);

            if (mError) throw mError;

            const allUserIds = [];
            (membersList || []).forEach(m => {
                if (m.auth_user_id) allUserIds.push(m.auth_user_id);
                if (m.id) allUserIds.push(String(m.id));
            });

            // Delete user_sessions (triggers Realtime remote logout on all devices)
            if (allUserIds.length > 0) {
                try {
                    await supabase
                        .from('user_sessions')
                        .delete()
                        .in('user_id', allUserIds);
                } catch (sessErr) {
                    console.warn('Error deleting user_sessions:', sessErr);
                }
            }

            // Clear custom_data.active_sessions
            for (const member of (membersList || [])) {
                const existingCustomData = member.custom_data || {};
                if (existingCustomData.active_sessions && existingCustomData.active_sessions.length > 0) {
                    try {
                        await supabase
                            .from('members')
                            .update({
                                custom_data: {
                                    ...existingCustomData,
                                    active_sessions: []
                                }
                            })
                            .eq('id', member.id);
                    } catch (cdErr) {
                        console.warn('Error clearing active_sessions in custom_data:', cdErr);
                    }
                }
            }

            return { count: memberIds.length };
        } catch (error) {
            console.error('Error forcing logout for batch members:', error.message);
            throw error;
        }
    };

    const getBatchMembers = async (batchId) => {
        try {
            console.log('Fetching members for batch:', batchId);

            // First get batch_members entries
            const { data: batchMembersData, error: batchMembersError } = await supabase
                .from('batch_members')
                .select('member_id')
                .eq('batch_id', batchId);

            if (batchMembersError) {
                console.error('Error fetching batch_members:', batchMembersError);
                throw batchMembersError;
            }

            console.log('Batch members data:', batchMembersData);

            if (!batchMembersData || batchMembersData.length === 0) {
                return [];
            }

            // Then get member details
            const memberIds = batchMembersData.map(bm => bm.member_id);
            const { data: membersData, error: membersError } = await supabase
                .from('members')
                .select('*')
                .in('id', memberIds);

            if (membersError) {
                console.error('Error fetching members:', membersError);
                throw membersError;
            }

            console.log('Members data:', membersData);

            // Combine the data
            return membersData.map(member => {
                return {
                    ...member,
                    joined_at: null // No timestamp available in batch_members table
                };
            });
        } catch (error) {
            console.error('Error fetching batch members:', error);
            return [];
        }
    };

    const getBatchCourses = async (batchId) => {
        try {
            console.log('Fetching courses for batch:', batchId);

            // First get batch_courses entries
            const { data: batchCoursesData, error: batchCoursesError } = await supabase
                .from('batch_courses')
                .select('course_id')
                .eq('batch_id', batchId);

            if (batchCoursesError) {
                console.error('Error fetching batch_courses:', batchCoursesError);
                throw batchCoursesError;
            }

            console.log('Batch courses data:', batchCoursesData);

            if (!batchCoursesData || batchCoursesData.length === 0) {
                return [];
            }

            // Then get course details
            const courseIds = batchCoursesData.map(bc => bc.course_id);
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('*')
                .in('id', courseIds);

            if (coursesError) {
                console.error('Error fetching courses:', coursesError);
                throw coursesError;
            }

            console.log('Courses data:', coursesData);

            // Fetch additional details for each course
            const coursesWithDetails = await Promise.all(coursesData.map(async (course) => {
                const batchCourse = batchCoursesData.find(bc => bc.course_id === course.id);

                // Fetch chapters
                const { data: chapters } = await supabase
                    .from('chapter_contents')
                    .select('*')
                    .eq('course_id', course.id)
                    .order('position');

                // Fetch exams
                const { data: courseExams } = await supabase
                    .from('course_exams')
                    .select('exam_id')
                    .eq('course_id', course.id);

                let exams = [];
                if (courseExams && courseExams.length > 0) {
                    const examIds = courseExams.map(ce => ce.exam_id);
                    const { data: examsData } = await supabase
                        .from('exams')
                        .select('*')
                        .in('id', examIds);
                    exams = examsData || [];
                }

                return {
                    ...course,
                    assigned_at: null, // No timestamp available in batch_courses table
                    chapters: chapters || [],
                    exams: exams
                };
            }));

            return coursesWithDetails;
        } catch (error) {
            console.error('Error fetching batch courses:', error);
            return [];
        }
    };

    return (
        <BatchContext.Provider value={{
            batches,
            loading,
            addBatch,
            updateBatch,
            deleteBatch,
            getBatch,
            fetchBatches,
            cloneBatch,
            addMembersToBatch,
            removeMembersFromBatch,
            addCoursesToBatch,
            removeCoursesFromBatch,
            forceLogoutBatchMembers,
            getBatchMembers,
            getBatchCourses
        }}>
            {children}
        </BatchContext.Provider>
    );
};
