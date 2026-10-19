import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const CourseContext = createContext();

export const useCourses = () => useContext(CourseContext);

export const CourseProvider = ({ children }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const { institute } = useInstitute();

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit, setLimit] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [showArchived, setShowArchived] = useState(false);

    // Auto-fetch disabled: CourseList handles this explicitly
    /*
    useEffect(() => {
        if (institute) {
            fetchCourses();
        }
    }, [institute]);
    */

    const fetchCourses = async (newPage = page, newSearch = searchQuery, newLimit = limit, newTags = selectedTags, archived = showArchived) => {
        if (!institute?.id) {
            console.log('CourseContext: No institute ID, skipping fetch');
            return;
        }
        console.log('CourseContext: Fetching courses for institute ID:', institute.id.toString(), 'Tags:', newTags, 'Archived:', archived);
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: newPage.toString(),
                limit: newLimit.toString(),
                search: newSearch,
                institute_id: institute.id.toString(),
                archived: archived ? 'true' : 'false'
            });

            // Add tags filter if any are selected
            if (newTags && newTags.length > 0) {
                queryParams.set('tags', newTags.join(','));
            }

            const response = await fetch(`/api/admin/courses?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch courses');

            const result = await response.json();

            console.log('CourseContext: Fetch result:', { count: result.data?.length, totalCount: result.count });

            const mappedData = (result.data || []).map(course => ({
                ...course,
                tags: course.course_tags ? course.course_tags.map(ct => ct.tag_id) : [],
                accessControl: course.access_control,
                allowedBatches: [], // course.batch_courses?.map(bc => bc.batch_id) || [],
                allowedProducts: course.allowed_products,
                allowedNetwork: course.allowed_network,
                allowedDevices: course.allowed_devices,
                videoWatchCount: course.video_watch_count,
                videoWatchTimeLimit: course.video_watch_time_limit,
                isPublic: course.is_public
            }));

            setCourses(mappedData);
            setTotalPages(result.totalPages);
            setTotalItems(result.count);
            setPage(newPage);
            setSearchQuery(newSearch);
            setLimit(newLimit);
            setSelectedTags(newTags);
        } catch (error) {
            console.error('Error fetching courses:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addCourse = async (courseData, imageFile) => {
        try {
            let imageUrl = courseData.image || 'https://via.placeholder.com/60?text=New';

            if (imageFile) {
                const uploadResult = await uploadCourseImage(imageFile);
                if (!uploadResult.success) {
                    throw new Error('Image upload failed: ' + uploadResult.error);
                }
                imageUrl = uploadResult.url;
            }

            const newCourse = {
                title: courseData.title,
                description: courseData.description || '',
                image: imageUrl,
                // Default values for fields not yet in the form but in the DB schema or UI
                category: 'General',
                level: 'Beginner',
                duration: '0h',
                is_public: courseData.isPublic // Ensure public flag is matched
            };

            console.log('CourseContext: Adding course with institute_id:', institute?.id?.toString());
            const { data, error } = await supabase
                .from('courses')
                .insert([{ ...newCourse, institute_id: institute?.id?.toString() }])
                .select()
                .single();

            if (error) throw error;

            // Handle tags if provided
            if (data && courseData.tags && courseData.tags.length > 0) {
                const tagInserts = courseData.tags.map(tagId => ({
                    course_id: data.id,
                    tag_id: tagId
                }));

                await supabase
                    .from('course_tags')
                    .insert(tagInserts);
            }

            if (data) {
                // Refetch courses from API to show the new course in the paginated list
                await fetchCourses();
                return { success: true, data };
            }
        } catch (error) {
            console.error('Error adding course:', error.message);
            // alert('Error adding course: ' + error.message);
            return { success: false, error: error.message };
        }
    };

    const uploadCourseImage = async (file, oldUrl = null) => {
        try {
            // Upload to Cloudflare R2 via Server Action
            const { uploadImage, replaceImage } = await import('../app/actions/images');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'icons/Custom');

            let result;
            if (oldUrl) {
                formData.append('oldUrl', oldUrl);
                result = await replaceImage(formData);
            } else {
                result = await uploadImage(formData);
            }

            if (result && result.success) {
                return { success: true, url: result.url };
            }
            throw new Error(result?.error || 'R2 upload failed');
        } catch (r2Err) {
            console.warn('R2 upload failed, falling back to Supabase Storage:', r2Err);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { data, error } = await supabase.storage
                    .from('course-images')
                    .upload(filePath, file);

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('course-images')
                    .getPublicUrl(filePath);

                return { success: true, url: publicUrl };
            } catch (err) {
                console.error('Error uploading image to Supabase:', err);
                return { success: false, error: err.message };
            }
        }
    };

    const updateCourse = async (id, updatedData, imageFile) => {
        try {
            let imageUrl = updatedData.image;

            if (imageFile) {
                const uploadResult = await uploadCourseImage(imageFile, updatedData.image);
                if (!uploadResult.success) {
                    throw new Error('Image upload failed: ' + uploadResult.error);
                }
                imageUrl = uploadResult.url;
            }

            // Map frontend camelCase to backend snake_case
            const dbData = {
                title: updatedData.title,
                description: updatedData.description,
                image: imageUrl,
                access_control: updatedData.accessControl || updatedData.access_control,
                allowed_batches: updatedData.allowedBatches || updatedData.allowed_batches,
                allowed_products: updatedData.allowedProducts || updatedData.allowed_products,
                allowed_network: updatedData.allowedNetwork || updatedData.allowed_network,
                allowed_devices: updatedData.allowedDevices || updatedData.allowed_devices,
                video_watch_count: updatedData.videoWatchCount || updatedData.video_watch_count,
                video_watch_time_limit: updatedData.videoWatchTimeLimit || updatedData.video_watch_time_limit,
                is_public: updatedData.isPublic !== undefined ? updatedData.isPublic : updatedData.is_public,
                tags: updatedData.tags // Pass tags to API
            };

            // Use API route to update course (bypasses RLS)
            const response = await fetch(`/api/admin/courses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update course');
            }

            // Refetch courses from API to show the updated course in the paginated list
            await fetchCourses();
            return { success: true };
        } catch (error) {
            console.error('Error updating course:', error.message);
            return { success: false, error: error.message };
        }
    };

    // Soft delete - Archive course
    const archiveCourse = async (id) => {
        try {
            const response = await fetch(`/api/admin/courses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_archived: true,
                    archived_at: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to archive course');
            }

            // Refetch courses from API to get updated paginated data
            await fetchCourses();
            return { success: true };
        } catch (error) {
            console.error('Error archiving course:', error.message);
            return { success: false, error: error.message };
        }
    };

    // Restore archived course
    const restoreCourse = async (id) => {
        try {
            const response = await fetch(`/api/admin/courses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_archived: false,
                    archived_at: null
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to restore course');
            }

            // Refetch courses from API to get updated paginated data
            await fetchCourses();
            return { success: true };
        } catch (error) {
            console.error('Error restoring course:', error.message);
            return { success: false, error: error.message };
        }
    };

    // Permanently delete course (use with caution)
    const permanentlyDeleteCourse = async (id) => {
        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Refetch courses from API to get updated paginated data
            await fetchCourses();
            return { success: true };
        } catch (error) {
            console.error('Error permanently deleting course:', error.message);
            return { success: false, error: error.message };
        }
    };

    // Alias for backward compatibility - now archives instead of permanently deleting
    const deleteCourse = archiveCourse;

    // Reorder courses within the current page and persist to database
    const reorderCourses = async (startIndex, endIndex) => {
        const result = Array.from(courses);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        // Optimistically update local state
        setCourses(result);

        try {
            // Calculate the actual order values based on current page
            // For page 1 with limit 10: indices 0-9 have order 0-9
            // For page 2 with limit 10: indices 0-9 have order 10-19
            const baseOrder = (page - 1) * limit;

            // Update order for all items on current page
            const updates = result.map((course, index) => ({
                id: course.id,
                order: baseOrder + index
            }));

            // 1. Try atomic RPC first
            const { error: rpcError } = await supabase.rpc('reorder_courses', { course_orders: updates });
            if (!rpcError) {
                console.log('Course order updated successfully via RPC');
                return;
            }

            console.warn('RPC reorder failed, falling back to API route:', rpcError);

            // 2. Try API route fallback
            try {
                const res = await fetch('/api/admin/courses/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates })
                });
                if (res.ok) {
                    console.log('Course order updated successfully via API');
                    return;
                }
            } catch (apiErr) {
                console.warn('API reorder failed, falling back to direct update:', apiErr);
            }

            // 3. Update each course's order in the database fallback
            const updatePromises = updates.map(({ id, order }) =>
                supabase
                    .from('courses')
                    .update({ order })
                    .eq('id', id)
            );

            await Promise.all(updatePromises);
            console.log('Course order updated successfully');
        } catch (error) {
            console.error('Error updating course order:', error);
            // Revert to original order on error
            fetchCourses();
        }
    };

    const toggleCoursePublicStatus = async (id) => {
        try {
            const course = courses.find(c => c.id === id);
            if (!course) return;

            const newStatus = !course.is_public;

            // Update local state optimistically
            setCourses(prev => prev.map(c =>
                c.id === id ? { ...c, is_public: newStatus, isPublic: newStatus } : c
            ));

            const response = await fetch(`/api/admin/courses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_public: newStatus })
            });

            if (!response.ok) {
                // Revert on failure
                setCourses(prev => prev.map(c =>
                    c.id === id ? { ...c, is_public: !newStatus, isPublic: !newStatus } : c
                ));
                const data = await response.json();
                throw new Error(data.error || 'Failed to toggle status');
            }

            return { success: true, status: newStatus };
        } catch (error) {
            console.error('Error toggling course status:', error.message);
            return { success: false, error: error.message };
        }
    };

    const getCourse = useCallback((id) => {
        return courses.find(course => course.id === id);
    }, [courses]);

    const goToPage = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchCourses(newPage, searchQuery, limit, selectedTags);
        }
    };

    const searchCourses = (query) => {
        fetchCourses(1, query, limit, selectedTags); // Reset to page 1 on search
    };

    const changeItemsPerPage = (newLimit) => {
        fetchCourses(1, searchQuery, newLimit, selectedTags); // Reset to page 1 when changing page size
    };

    const filterByTags = (tags) => {
        fetchCourses(1, searchQuery, limit, tags, showArchived); // Reset to page 1 on tag filter change
    };

    // Toggle between active and archived courses
    const toggleShowArchived = (showArchivedCourses) => {
        setShowArchived(showArchivedCourses);
        fetchCourses(1, searchQuery, limit, selectedTags, showArchivedCourses);
    };

    return (
        <CourseContext.Provider value={{
            courses,
            loading,
            addCourse,
            updateCourse,
            deleteCourse,
            archiveCourse,
            restoreCourse,
            permanentlyDeleteCourse,
            reorderCourses,
            getCourse,
            goToPage,
            searchCourses,
            changeItemsPerPage,
            filterByTags,
            toggleShowArchived,
            toggleCoursePublicStatus,
            showArchived,
            page,
            totalPages,
            totalItems,
            limit,
            selectedTags,
            fetchCourses
        }}>
            {children}
        </CourseContext.Provider>
    );
};
