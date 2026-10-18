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
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            const { data, error } = await supabase
                .from('batches')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const batchesWithCounts = await Promise.all(data.map(async (batch) => {
                const { count: userCount } = await supabase
                    .from('batch_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('batch_id', batch.id);

                const { count: courseCount } = await supabase
                    .from('batch_courses')
                    .select('*', { count: 'exact', head: true })
                    .eq('batch_id', batch.id);

                return {
                    ...batch,
                    users: userCount || 0,
                    courses: courseCount || 0
                };
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
                batch.id === id ? { ...batch, ...updatedData } : batch
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

            setBatches(prev => prev.filter(batch => batch.id !== id));
        } catch (error) {
            console.error('Error deleting batch:', error.message);
        }
    };

    const getBatch = (id) => {
        return batches.find(batch => batch.id === id);
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
            const inserts = memberIds.map(memberId => ({
                batch_id: batchId,
                member_id: memberId
            }));

            const { error } = await supabase
                .from('batch_members')
                .insert(inserts);

            if (error) throw error;

            await fetchBatches();
        } catch (error) {
            console.error('Error adding members to batch:', error.message);
            throw error;
        }
    };

    const removeMembersFromBatch = async (batchId, memberIds) => {
        try {
            const { error } = await supabase
                .from('batch_members')
                .delete()
                .eq('batch_id', batchId)
                .in('member_id', memberIds);

            if (error) throw error;

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
            const { data: batchMembers, error: fetchError } = await supabase
                .from('batch_members')
                .select('member_id')
                .eq('batch_id', batchId);

            if (fetchError) throw fetchError;

            if (!batchMembers || batchMembers.length === 0) {
                return { count: 0 };
            }

            const memberIds = batchMembers.map(m => m.member_id);

            const { error: updateError } = await supabase
                .from('members')
                .update({ force_logout_at: new Date().toISOString() })
                .in('id', memberIds);

            if (updateError) throw updateError;

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
