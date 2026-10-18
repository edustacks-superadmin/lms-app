import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCourses } from '../context/CourseContext';
import { useBatches } from '../context/BatchContext';
import { useProducts } from '../context/ProductContext';
import { Plus, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CourseAccessControl = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { getCourse, updateCourse } = useCourses();
    const { batches, fetchBatches } = useBatches();
    const { products, fetchProducts } = useProducts();

    const [courseData, setCourseData] = useState(null);
    const [accessControl, setAccessControl] = useState('Private');
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [allowedNetwork, setAllowedNetwork] = useState('');
    const [allowedDevices, setAllowedDevices] = useState({
        web: false,
        mobile: true,
        desktop: true
    });
    const [videoWatchCount, setVideoWatchCount] = useState('');
    const [videoWatchTimeLimit, setVideoWatchTimeLimit] = useState('Unlimited');
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            let data = getCourse ? getCourse(id) : null;

            // If not found in context (e.g. direct load or refresh), fetch directly from Supabase
            if (!data && id) {
                try {
                    const { data: dbCourse, error: cError } = await supabase
                        .from('courses')
                        .select(`
                            *,
                            course_tags(tag_id),
                            batch_courses(batch_id)
                        `)
                        .eq('id', id)
                        .single();

                    if (!cError && dbCourse) {
                        data = {
                            ...dbCourse,
                            tags: dbCourse.course_tags?.map(ct => ct.tag_id) || [],
                            accessControl: dbCourse.access_control,
                            allowedBatches: dbCourse.batch_courses?.map(bc => bc.batch_id) || [],
                            allowedProducts: dbCourse.allowed_products,
                            allowedNetwork: dbCourse.allowed_network,
                            allowedDevices: dbCourse.allowed_devices,
                            videoWatchCount: dbCourse.video_watch_count,
                            videoWatchTimeLimit: dbCourse.video_watch_time_limit
                        };
                    }
                } catch (e) {
                    console.error('Error fetching course directly:', e);
                }
            }

            if (data) {
                setCourseData(data);
                setAccessControl(data.accessControl || 'Private');
                setSelectedProducts(data.allowedProducts || []);
                setAllowedNetwork(data.allowedNetwork || '');
                if (data.allowedDevices) {
                    setAllowedDevices(data.allowedDevices);
                }
                setVideoWatchCount(data.videoWatchCount || '');
                setVideoWatchTimeLimit(data.videoWatchTimeLimit || 'Unlimited');

                // Fetch latest batch assignments from DB to ensure freshness
                try {
                    const { data: batchCourses, error } = await supabase
                        .from('batch_courses')
                        .select('batch_id')
                        .eq('course_id', id);

                    if (!error && batchCourses) {
                        const latestAllowedBatches = batchCourses.map(bc => bc.batch_id);
                        setSelectedBatches(latestAllowedBatches);
                    } else {
                        setSelectedBatches(data.allowedBatches || []);
                    }
                } catch (err) {
                    console.error('Error fetching batch courses:', err);
                    setSelectedBatches(data.allowedBatches || []);
                }
            }
        };

        loadData();
        fetchProducts();
        if (fetchBatches) fetchBatches();
    }, [id, getCourse]);

    const handleUpdate = async () => {
        const updatedData = {
            accessControl,
            allowedBatches: selectedBatches,
            allowedProducts: selectedProducts,
            allowedNetwork,
            allowedDevices,
            videoWatchCount: videoWatchCount === '' ? null : parseInt(videoWatchCount),
            videoWatchTimeLimit
        };
        const result = await updateCourse(id, updatedData);

        if (result && result.success) {
            // Sync with batch_courses junction table
            try {
                // First, delete all existing batch_courses entries for this course
                await supabase
                    .from('batch_courses')
                    .delete()
                    .eq('course_id', id);

                // Then, insert the new selections
                if (selectedBatches.length > 0) {
                    const batchCourseEntries = selectedBatches.map(batchId => ({
                        batch_id: batchId,
                        course_id: id
                    }));

                    const { error: insertError } = await supabase
                        .from('batch_courses')
                        .insert(batchCourseEntries);

                    if (insertError) {
                        console.error('Error syncing batch_courses:', insertError);
                    }
                }

                // Refresh batch counts
                if (fetchBatches) {
                    await fetchBatches();
                }
            } catch (error) {
                console.error('Error syncing batch assignments:', error);
            }

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate('/courses');
            }, 2000);
        } else {
            alert('Failed to update course: ' + (result?.error || 'Unknown error'));
        }
    };

    const toggleDevice = (device) => {
        setAllowedDevices(prev => ({
            ...prev,
            [device]: !prev[device]
        }));
    };

    if (!courseData) return <div style={{ padding: '20px' }}>Loading...</div>;

    return (
        <div style={{ flex: 1, paddingBottom: '50px' }}>
            {/* Success Notification */}
            {showSuccess && (
                <div style={{
                    position: 'fixed',
                    top: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#00bfa5',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    ✓ Updated successfully!
                </div>
            )}
            <div style={{ marginBottom: '20px' }}>
                <span style={{ color: 'var(--primary-color)', fontSize: '14px' }}>Courses</span>
                <span style={{ color: '#999', margin: '0 8px' }}>/</span>
                <span style={{ color: '#666', fontSize: '14px' }}>{courseData.title}</span>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: '400', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                {courseData.title}'s Access Control
            </h2>

            <div style={{ maxWidth: '800px' }}>
                {/* Access Control Dropdown */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>Access control</label>
                    <div style={{ flex: 1 }}>
                        <select
                            className="form-control"
                            style={{ width: '200px' }}
                            value={accessControl}
                            onChange={(e) => setAccessControl(e.target.value)}
                        >
                            <option value="Public">Public</option>
                            <option value="Private">Private</option>
                        </select>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                            {accessControl === 'Private'
                                ? 'Private is accessible only by approved members.'
                                : 'Public is accessible by all members.'}
                        </div>
                    </div>
                </div>

                {accessControl === 'Private' && (
                    <>
                        {/* Batches */}
                        <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'flex-start' }}>
                            <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', marginTop: '8px' }}>Batches</label>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <select
                                    className="form-control"
                                    style={{ flex: 1 }}
                                    onChange={(e) => {
                                        if (e.target.value && !selectedBatches.includes(e.target.value)) {
                                            setSelectedBatches([...selectedBatches, e.target.value]);
                                        }
                                    }}
                                    value=""
                                >
                                    <option value="">Select Batch</option>
                                    {batches.map(batch => (
                                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                                    ))}
                                </select>
                                <Plus
                                    size={20}
                                    color="green"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate('/batches/create')}
                                />
                            </div>
                        </div>
                        {/* Selected Batches Display */}
                        {selectedBatches.length > 0 && (
                            <div style={{ display: 'flex', marginBottom: '20px', marginLeft: '200px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {selectedBatches.map(batchId => {
                                        const batch = batches.find(b => b.id === batchId);
                                        return (
                                            <span key={batchId} style={{ background: '#e0e0e0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                {batch ? batch.name : batchId}
                                                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedBatches(selectedBatches.filter(id => id !== batchId))} />
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Products */}
                        <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'flex-start' }}>
                            <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', marginTop: '8px' }}>Products</label>
                            <div style={{ flex: 1 }}>
                                <select
                                    className="form-control"
                                    style={{ width: '100%' }}
                                    onChange={(e) => {
                                        if (e.target.value && !selectedProducts.includes(e.target.value)) {
                                            setSelectedProducts([...selectedProducts, e.target.value]);
                                        }
                                    }}
                                    value=""
                                >
                                    <option value="">Select Product</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>{product.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Selected Products Display */}
                        {selectedProducts.length > 0 && (
                            <div style={{ display: 'flex', marginBottom: '20px', marginLeft: '200px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {selectedProducts.map(productId => {
                                        const product = products.find(p => p.id === productId);
                                        return (
                                            <span key={productId} style={{ background: '#e0e0e0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                {product ? product.title : productId}
                                                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedProducts(selectedProducts.filter(id => id !== productId))} />
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Allowed Network */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', marginTop: '8px' }}>Allowed network</label>
                    <textarea
                        className="form-control"
                        style={{ flex: 1, height: '80px' }}
                        value={allowedNetwork}
                        onChange={(e) => setAllowedNetwork(e.target.value)}
                    ></textarea>
                </div>

                {/* Allowed Devices */}
                <div style={{ display: 'flex', marginBottom: '30px', alignItems: 'flex-start' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>Allowed Devices</label>
                    <div>
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={allowedDevices.web} onChange={() => toggleDevice('web')} />
                                Web
                            </label>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={allowedDevices.mobile} onChange={() => toggleDevice('mobile')} />
                                Mobile App
                            </label>
                        </div>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={allowedDevices.desktop} onChange={() => toggleDevice('desktop')} />
                                Desktop App
                            </label>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
                            Select devices that are allowed to access this course.
                        </div>
                    </div>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '10px', color: '#333' }}>Video Restrictions</h3>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                    Restrict video watching based on views and duration. If both views and duration restrictions are enabled, the video will be blocked if anyone of the limit is exhausted.
                </div>

                {/* Video Watch Count */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center' }}>
                    <label style={{ width: '250px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>
                        Set the number of times a student can watch a video
                    </label>
                    <div style={{ flex: 1 }}>
                        <input
                            type="number"
                            className="form-control"
                            style={{ width: '100%' }}
                            value={videoWatchCount}
                            onChange={(e) => setVideoWatchCount(e.target.value)}
                        />
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Leave blank for unlimited views</div>
                    </div>
                </div>

                {/* Video Watch Time Limit */}
                <div style={{ display: 'flex', marginBottom: '30px', alignItems: 'center' }}>
                    <label style={{ width: '250px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>
                        Limit video based on watch minutes w.r.t course's total watch minutes
                    </label>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <select
                                className="form-control"
                                style={{ flex: 1 }}
                                value={videoWatchTimeLimit}
                                onChange={(e) => setVideoWatchTimeLimit(e.target.value)}
                            >
                                <option value="Unlimited">Unlimited</option>
                                <option value="1x">1x</option>
                                <option value="2x">2x</option>
                                <option value="3x">3x</option>
                            </select>
                            <a href="#" style={{ color: 'var(--primary-color)', fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>View Video Stats</a>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                            E.g. Let's assume you have 10 videos in the course that amount to total 60 minutes of watch time. If you select 2, users will be able to watch 120 minutes of video in the course.
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginLeft: '270px' }}>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#00bfa5', color: 'white', border: 'none' }}
                        onClick={handleUpdate}
                    >
                        Update
                    </button>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#e0e0e0', color: '#333', border: '1px solid #ccc' }}
                        onClick={() => navigate('/courses')}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseAccessControl;
