'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useInstitute } from './InstituteContext';
import {
    getBatches as getBatchesAction,
    createBatch as createBatchAction,
    updateBatch as updateBatchAction,
    deleteBatch as deleteBatchAction,
    cloneBatch as cloneBatchAction,
    addMembersToBatch as addMembersToBatchAction,
    removeMembersFromBatch as removeMembersFromBatchAction,
    forceLogoutBatchMembers as forceLogoutBatchMembersAction,
    getBatchMembersAction,
    getBatchCoursesAction
} from '../app/actions/batch';
import { supabase } from '../supabaseClient'; // Keep for other lookups if needed

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
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { institute } = useInstitute();
    const { user } = useAuth();
    // Use a ref to track if we have done the initial fetch for the current institute to avoid race conditions
    const fetchedForInstitute = React.useRef(null);

    useEffect(() => {
        if (user && institute?.id) {
            // Only fetch if we haven't fetched for this institute yet OR key changes
            // Actually simpler: just fetch when institute.id changes
            console.log('BatchContext: Institute/Auth active, fetching batches for institute:', institute.id);
            fetchBatches({ instituteId: institute.id });
        }
    }, [user, institute?.id]);

    // Use current state values if arguments are not provided, allowing strict control when needed
    const fetchBatches = async ({ page = pagination.page, limit = pagination.limit, search = searchTerm, instituteId = institute?.id } = {}) => {
        try {
            if (!instituteId) {
                console.warn('fetchBatches: No instituteId provided or available in context');
                // Optional: set empty batches or return
            }

            setLoading(true);
            setError(null);
            console.log('Fetching batches via Server Action with:', { page, limit, search, instituteId });

            const result = await getBatchesAction({ page, limit, search, instituteId });

            if (!result.success) {
                throw new Error(result.error);
            }

            const { batches: data, pagination: paginationData } = result.data;

            if (!data) {
                setBatches([]);
                return;
            }

            // Map Prisma result to match existing component expectations
            const mappedBatches = data.map(batch => ({
                ...batch,
                users: batch._count?.batch_members || 0,
                courses: batch._count?.batch_courses || 0
            }));

            // Prioritize server pagination data, formatted safely
            setBatches(mappedBatches);
            setPagination({
                page: paginationData.current,
                limit: paginationData.limit,
                total: paginationData.total,
                totalPages: paginationData.pages
            });

            // Sync search term if changed externally (optional, but good for consistency)
            setSearchTerm(search);

        } catch (error) {
            console.error('Error fetching batches:', error);
            setError(error.message);
            setBatches([]);
        } finally {
            setLoading(false);
        }
    };

    const changePage = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
            fetchBatches({ page: newPage });
        }
    };

    const changeLimit = (newLimit) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
        fetchBatches({ limit: newLimit, page: 1 });
    };

    const searchBatches = (term) => {
        setSearchTerm(term);
        // Reset to page 1 for new search
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchBatches({ search: term, page: 1 });
    };

    const addBatch = async (batchData) => {
        try {
            // Ensure institute_id is passed
            const payload = { ...batchData };
            if (!payload.institute_id && institute?.id) {
                payload.institute_id = institute.id;
            }

            const result = await createBatchAction(payload);

            if (result.success) {
                // Determine if we should refetch or just pretend to add. 
                // Refetching is safer for correct ordering/pagination.
                await fetchBatches();
                return { success: true, batch: result.data };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error adding batch:', error.message);
            return { success: false, error: error.message };
        }
    };

    const updateBatch = async (id, updatedData) => {
        try {
            const result = await updateBatchAction(id, updatedData);

            if (result.success) {
                setBatches(prev => prev.map(batch =>
                    String(batch.id) === String(id) ? { ...batch, ...updatedData } : batch
                ));
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error updating batch:', error.message);
        }
    };

    const deleteBatch = async (id) => {
        try {
            const result = await deleteBatchAction(id);

            if (result.success) {
                // Deleting might change total pages, refetch usually best
                await fetchBatches();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error deleting batch:', error.message);
        }
    };

    const getBatch = (id) => {
        return batches.find(batch => batch.id === id);
    };

    const cloneBatch = async (id) => {
        try {
            const result = await cloneBatchAction(id);

            if (result.success) {
                await fetchBatches(); // Refresh list to get accurate counts
                return result.data;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error cloning batch:', error.message);
            throw error;
        }
    };

    const addMembersToBatch = async (batchId, memberIds, expiryDate = null) => {
        try {
            const result = await addMembersToBatchAction(batchId, memberIds, expiryDate, institute?.id);
            if (!result.success) throw new Error(result.error);
            await fetchBatches();
        } catch (error) {
            console.error('Error adding members to batch:', error.message);
            throw error;
        }
    };

    const removeMembersFromBatch = async (batchId, memberIds) => {
        try {
            const result = await removeMembersFromBatchAction(batchId, memberIds);
            if (!result.success) throw new Error(result.error);
            await fetchBatches();
        } catch (error) {
            console.error('Error removing members from batch:', error.message);
            throw error;
        }
    };

    // Client-side implementation for course management inside batch (less critical, keeping for now or can migrate later)
    // Note: To be fully consistent, these should also be migrated, but user request focused on Batches list and main actions.
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
            const result = await forceLogoutBatchMembersAction(batchId);
            if (!result.success) throw new Error(result.error);
            return { count: 1 }; // Placeholder, or return actual count from intent
        } catch (error) {
            console.error('Error forcing logout for batch members:', error.message);
            throw error;
        }
    };

    // Keep helper lookups as is for now, or migrate if needed. 
    // Usually these are triggered on modal open, so client-side fetch is okay-ish, but safer to move.
    // For now, let's keep the getBatchMembers and getBatchCourses client-side as they are read-only details 
    // and might not face the same strict RLS issues as the main list if RLS is set to "authenticated can read own data".
    // But if RLS is blocking everything, these will fail too.
    // Let's plan to migrate them if the main list fix works.

    const getBatchMembers = async (batchId) => {
        try {
            const result = await getBatchMembersAction(batchId);
            if (!result.success) {
                console.error('Error fetching batch members:', result.error);
                return [];
            }
            return result.data || [];
        } catch (error) {
            console.error('Error fetching batch members:', error);
            return [];
        }
    };

    const getBatchCourses = async (batchId) => {
        try {
            const result = await getBatchCoursesAction(batchId);
            if (!result.success) {
                console.error('Error fetching batch courses:', result.error);
                return [];
            }
            return result.data || [];
        } catch (error) {
            console.error('Error fetching batch courses:', error);
            return [];
        }
    };

    return (
        <BatchContext.Provider value={{
            batches,
            pagination,
            searchTerm,
            loading,
            error,
            fetchBatches, // Exposed to allow manual refreshes or params
            changePage,
            changeLimit,
            searchBatches,
            addBatch,
            updateBatch,
            deleteBatch,
            getBatch,
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
