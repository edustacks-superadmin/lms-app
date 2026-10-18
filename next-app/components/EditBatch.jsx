'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Save, X, Users, Calendar, Clock, BookOpen, Link as LinkIcon, Loader, AlertTriangle } from 'lucide-react';

const EditBatch = () => {
    const { id } = useParams();
    const router = useRouter();
    const { getBatch, updateBatch, fetchBatches } = useBatches();
    const { courses } = useCourses();

    const [batch, setBatch] = useState(null);
    const [batchName, setBatchName] = useState('');
    const [assignedCourses, setAssignedCourses] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBatchData();
    }, [id]);

    const loadBatchData = async () => {
        try {
            const batchData = getBatch(id);
            if (batchData) {
                setBatch(batchData);
                setBatchName(batchData.name);
            }

            // Fetch assigned courses
            const { data, error } = await supabase
                .from('batch_courses')
                .select(`
                    id,
                    course_id,
                    courses (
                        id,
                        title,
                        description
                    )
                `)
                .eq('batch_id', id);

            if (error) throw error;
            setAssignedCourses(data || []);
        } catch (error) {
            console.error('Error loading batch data:', error);
            alert('Error loading batch data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateName = async () => {
        if (batchName.trim()) {
            await updateBatch(id, { name: batchName });
            alert('Batch name updated successfully');
        }
    };

    const handleAddCourse = async (courseId) => {
        try {
            const { error } = await supabase
                .from('batch_courses')
                .insert([{
                    batch_id: id,
                    course_id: courseId
                }]);

            if (error) {
                if (error.code === '23505') {
                    alert('This course is already assigned to this batch');
                } else {
                    throw error;
                }
                return;
            }

            // Reload assigned courses
            await loadBatchData();
            await fetchBatches(); // Refresh batch counts
            alert('Batch updated successfully!');
            router.push(`/batches/${id}`);
        } catch (error) {
            console.error('Error adding course:', error);
            alert('Error adding course: ' + error.message);
        }
    };

    const handleRemoveCourse = async (batchCourseId) => {
        if (!window.confirm('Remove this course from the batch?')) return;

        try {
            const { error } = await supabase
                .from('batch_courses')
                .delete()
                .eq('id', batchCourseId);

            if (error) throw error;

            // Reload assigned courses
            await loadBatchData();
            await fetchBatches(); // Refresh batch counts
            alert('Course removed successfully');
        } catch (error) {
            console.error('Error removing course:', error);
            alert('Error removing course: ' + error.message);
        }
    };

    const availableCourses = courses.filter(course =>
        !assignedCourses.some(ac => ac.courses?.id === course.id) &&
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    if (!batch) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Batch not found</div>;
    }

    return (
        <div style={{ flex: 1 }}>
            {/* Header */}
            <div style={{ padding: '30px 40px', borderBottom: '1px solid #e0e0e0' }}>
                <button
                    onClick={() => router.push('/batches')}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#666',
                        marginBottom: '16px',
                        padding: '0'
                    }}
                >
                    <ArrowLeft size={20} />
                    Back to Batches
                </button>
                <h2 style={{ fontSize: '24px', fontWeight: '400', margin: 0 }}>Edit Batch</h2>
            </div>

            <div style={{ padding: '30px 40px' }}>
                {/* Batch Name */}
                <div style={{ marginBottom: '40px', maxWidth: '500px' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>
                        Batch Name
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            value={batchName}
                            onChange={(e) => setBatchName(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '14px'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => router.push(`/batches/${id}`)}
                            style={{
                                backgroundColor: '#00bfa5',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Update Name
                        </button>
                    </div>
                </div>

                {/* Assigned Courses */}
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                        Assigned Courses ({assignedCourses.length})
                    </h3>
                    {assignedCourses.length === 0 ? (
                        <div style={{
                            padding: '40px',
                            textAlign: 'center',
                            background: '#f5f5f5',
                            borderRadius: '8px',
                            color: '#666'
                        }}>
                            No courses assigned yet. Add courses from the list below.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {assignedCourses.map((ac) => (
                                <div
                                    key={ac.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'white',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '500', color: '#333', marginBottom: '4px' }}>
                                            {ac.courses?.title}
                                        </div>
                                        {ac.courses?.description && (
                                            <div style={{ fontSize: '13px', color: '#666' }}>
                                                {ac.courses.description}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveCourse(ac.id)}
                                        style={{
                                            background: '#ffebee',
                                            color: '#d32f2f',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '13px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <X size={16} /> Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Available Courses */}
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                        Add Courses
                    </h3>

                    {/* Search */}
                    <div style={{ marginBottom: '16px', position: 'relative', maxWidth: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 40px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    {availableCourses.length === 0 ? (
                        <div style={{
                            padding: '40px',
                            textAlign: 'center',
                            background: '#f5f5f5',
                            borderRadius: '8px',
                            color: '#666'
                        }}>
                            {searchQuery ? 'No courses match your search' : 'All courses are already assigned'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {availableCourses.map((course) => (
                                <div
                                    key={course.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'white',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '500', color: '#333', marginBottom: '4px' }}>
                                            {course.title}
                                        </div>
                                        {course.description && (
                                            <div style={{ fontSize: '13px', color: '#666' }}>
                                                {course.description}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleAddCourse(course.id)}
                                        style={{
                                            background: '#e8f5f3',
                                            color: '#00bfa5',
                                            border: '1px solid #00bfa5',
                                            borderRadius: '4px',
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '13px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <Plus size={16} /> Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditBatch;
