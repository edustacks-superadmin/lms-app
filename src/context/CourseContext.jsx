import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const CourseContext = createContext();

export const useCourses = () => useContext(CourseContext);

export const CourseProvider = ({ children }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select(`
                    *,
                    course_tags(tag_id),
                    batch_courses(batch_id)
                `)
                .order('order', { ascending: true });

            if (error) throw error;

            const mappedData = (data || []).map(course => ({
                ...course,
                tags: course.course_tags?.map(ct => ct.tag_id) || [],
                accessControl: course.is_public ? 'Public' : 'Private',
                allowedBatches: course.batch_courses?.map(bc => bc.batch_id) || course.allowed_batches || [],
                allowedProducts: course.allowed_products || [],
                allowedDevices: course.platform_availability || {
                    web: course.allowed_platforms?.includes('web') || false,
                    mobile: course.allowed_platforms?.includes('mobile') || true,
                    desktop: course.allowed_platforms?.includes('desktop') || false
                },
                videoWatchCount: course.max_video_views || '',
                videoWatchTimeLimit: course.watch_time_multiplier ? `${course.watch_time_multiplier}x` : 'Unlimited'
            }));

            setCourses(mappedData);
        } catch (error) {
            console.error('Error fetching courses:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addCourse = async (courseData) => {
        try {
            const newCourse = {
                title: courseData.title,
                description: courseData.description || '',
                image: courseData.image || 'https://via.placeholder.com/60?text=New',
                // Default values for fields not yet in the form but in the DB schema or UI
                category: 'General',
                level: 'Beginner',
                duration: '0h',
            };

            const { data, error } = await supabase
                .from('courses')
                .insert([newCourse])
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
                setCourses(prev => [...prev, { ...data, tags: courseData.tags || [] }]);
            }
        } catch (error) {
            console.error('Error adding course:', error.message);
            alert('Error adding course: ' + error.message);
        }
    };

    const uploadCourseImage = async (file) => {
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
            console.error('Error uploading image:', err);
            return { success: false, error: err.message };
        }
    };

    const updateCourse = async (id, updatedData, imageFile) => {
        try {
            let imageUrl = updatedData.image;

            if (imageFile) {
                const uploadResult = await uploadCourseImage(imageFile);
                if (!uploadResult.success) {
                    throw new Error('Image upload failed: ' + uploadResult.error);
                }
                imageUrl = uploadResult.url;
            }

            // Map frontend fields to backend schema
            const dbData = { ...updatedData };
            if (imageUrl) dbData.image = imageUrl;

            // Handle access control (is_public boolean)
            if (updatedData.accessControl !== undefined) {
                dbData.is_public = updatedData.accessControl === 'Public';
            }

            // Handle allowed batches & products
            if (updatedData.allowedBatches !== undefined) {
                dbData.allowed_batches = updatedData.allowedBatches;
            }
            if (updatedData.allowedProducts !== undefined) {
                dbData.allowed_products = updatedData.allowedProducts;
            }

            // Handle devices / platforms
            if (updatedData.allowedDevices !== undefined) {
                dbData.platform_availability = updatedData.allowedDevices;
                const platforms = [];
                if (updatedData.allowedDevices.web) platforms.push('web');
                if (updatedData.allowedDevices.mobile) platforms.push('mobile');
                if (updatedData.allowedDevices.desktop) platforms.push('desktop');
                dbData.allowed_platforms = platforms;
            }

            // Handle video views and watch time
            if (updatedData.videoWatchCount !== undefined) {
                dbData.max_video_views = updatedData.videoWatchCount === '' ? null : parseInt(updatedData.videoWatchCount);
            }
            if (updatedData.videoWatchTimeLimit !== undefined) {
                const multiplier = parseFloat(updatedData.videoWatchTimeLimit);
                dbData.watch_time_multiplier = isNaN(multiplier) ? null : multiplier;
            }

            // Remove non-existent or unneeded columns
            delete dbData.accessControl;
            delete dbData.access_control;
            delete dbData.allowedBatches;
            delete dbData.allowedProducts;
            delete dbData.allowedNetwork;
            delete dbData.allowed_network;
            delete dbData.allowedDevices;
            delete dbData.allowed_devices;
            delete dbData.videoWatchCount;
            delete dbData.video_watch_count;
            delete dbData.videoWatchTimeLimit;
            delete dbData.video_watch_time_limit;
            delete dbData.tags;
            delete dbData.course_tags;
            delete dbData.batch_courses;

            const { error } = await supabase
                .from('courses')
                .update(dbData)
                .eq('id', id);

            if (error) throw error;

            // Handle tags if provided
            if (updatedData.tags !== undefined) {
                // Delete existing tags
                await supabase
                    .from('course_tags')
                    .delete()
                    .eq('course_id', id);

                // Insert new tags
                if (updatedData.tags.length > 0) {
                    const tagInserts = updatedData.tags.map(tagId => ({
                        course_id: id,
                        tag_id: tagId
                    }));

                    await supabase
                        .from('course_tags')
                        .insert(tagInserts);
                }
            }

            setCourses(prev => prev.map(course =>
                course.id === id ? { ...course, ...updatedData } : course
            ));
            return { success: true };
        } catch (error) {
            console.error('Error updating course:', error.message);
            return { success: false, error: error.message };
        }
    };

    const deleteCourse = async (id) => {
        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setCourses(prev => prev.filter(course => course.id !== id));
        } catch (error) {
            console.error('Error deleting course:', error.message);
        }
    };

    // Reordering is complex with a DB, we'll keep it local for now or implement a 'order' column later
    const reorderCourses = (startIndex, endIndex) => {
        const result = Array.from(courses);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        setCourses(result);
    };

    const getCourse = useCallback((id) => {
        return courses.find(course => course.id == id);
    }, [courses]);

    return (
        <CourseContext.Provider value={{ courses, loading, addCourse, updateCourse, deleteCourse, reorderCourses, getCourse }}>
            {children}
        </CourseContext.Provider>
    );
};
