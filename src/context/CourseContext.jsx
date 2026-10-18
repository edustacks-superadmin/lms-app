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
                accessControl: course.access_control,
                allowedBatches: course.batch_courses?.map(bc => bc.batch_id) || [],
                allowedProducts: course.allowed_products,
                allowedNetwork: course.allowed_network,
                allowedDevices: course.allowed_devices,
                videoWatchCount: course.video_watch_count,
                videoWatchTimeLimit: course.video_watch_time_limit
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

            // Map frontend camelCase to backend snake_case
            const dbData = {
                ...updatedData,
                image: imageUrl,
                access_control: updatedData.accessControl,
                allowed_batches: updatedData.allowedBatches,
                allowed_products: updatedData.allowedProducts,
                allowed_network: updatedData.allowedNetwork,
                allowed_devices: updatedData.allowedDevices,
                video_watch_count: updatedData.videoWatchCount,
                video_watch_time_limit: updatedData.videoWatchTimeLimit
            };

            // Remove camelCase keys and tags to avoid errors
            delete dbData.accessControl;
            delete dbData.allowedBatches;
            delete dbData.allowedProducts;
            delete dbData.allowedNetwork;
            delete dbData.allowedDevices;
            delete dbData.videoWatchCount;
            delete dbData.videoWatchTimeLimit;
            delete dbData.tags;
            delete dbData.course_tags;

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
