import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, UserMinus, X, ChevronDown, ChevronUp, Plus, Check } from 'lucide-react';
import { useBatches } from '../context/BatchContext';
import { useUsers } from '../context/UserContext';
import { useCourses } from '../context/CourseContext';

const BatchDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { batches, getBatch, getBatchMembers, getBatchCourses, removeMembersFromBatch, removeCoursesFromBatch, addMembersToBatch, addCoursesToBatch } = useBatches();
    const { users } = useUsers();
    const { courses: allCourses } = useCourses();

    const [activeTab, setActiveTab] = useState('overview');
    const [batch, setBatch] = useState(null);
    const [members, setMembers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCourses, setExpandedCourses] = useState({});
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);

    useEffect(() => {
        loadBatchDetails();
    }, [id]);

    const loadBatchDetails = async () => {
        try {
            setLoading(true);
            const batchData = getBatch(id);
            setBatch(batchData);

            const [membersData, coursesData] = await Promise.all([
                getBatchMembers(id),
                getBatchCourses(id)
            ]);

            setMembers(membersData || []);
            setCourses(coursesData || []);
        } catch (error) {
            console.error('Error loading batch details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (confirm('Remove this member from the batch?')) {
            try {
                await removeMembersFromBatch(id, [memberId]);
                await loadBatchDetails();
            } catch (error) {
                alert('Error removing member');
            }
        }
    };

    const handleRemoveCourse = async (courseId) => {
        try {
            await removeCoursesFromBatch(id, [courseId]);
            await loadBatchDetails();
        } catch (error) {
            console.error('Error removing course:', error);
            alert('Error removing course from batch');
        }
    };

    const handleAddMembers = async (selectedMemberIds) => {
        try {
            await addMembersToBatch(id, selectedMemberIds);
            await loadBatchDetails();
            setIsAddMemberModalOpen(false);
        } catch (error) {
            console.error('Error adding members:', error);
            alert('Error adding members to batch');
        }
    };

    const handleAddCourses = async (selectedCourseIds) => {
        try {
            await addCoursesToBatch(id, selectedCourseIds);
            await loadBatchDetails();
            setIsAddCourseModalOpen(false);
        } catch (error) {
            console.error('Error adding courses:', error);
            alert('Error adding courses to batch');
        }
    };


    const toggleCourseExpanded = (courseId) => {
        setExpandedCourses(prev => ({
            ...prev,
            [courseId]: !prev[courseId]
        }));
    };

    const filteredMembers = members.filter(member =>
        member.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    if (!batch) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Batch not found</div>;
    }

    return (
        <div style={{ flex: 1, padding: '30px 40px' }}>
            {/* Header */}
            <div style={{ marginBottom: '30px' }}>
                <button
                    onClick={() => navigate('/batches')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-color)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '16px'
                    }}
                >
                    <ChevronLeft size={16} /> Back to Batches
                </button>
                <h2 style={{ fontSize: '24px', fontWeight: '400', margin: 0 }}>{batch.name}</h2>
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: '1px solid #e0e0e0', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '32px' }}>
                    {['overview', 'members', 'courses'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '12px 0',
                                fontSize: '15px',
                                cursor: 'pointer',
                                color: activeTab === tab ? 'var(--primary-color)' : '#666',
                                borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                                textTransform: 'capitalize',
                                fontWeight: activeTab === tab ? '500' : '400'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Members</div>
                            <div style={{ fontSize: '32px', fontWeight: '500', color: 'var(--primary-color)' }}>{batch.users}</div>
                        </div>
                        <div style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Courses</div>
                            <div style={{ fontSize: '32px', fontWeight: '500', color: 'var(--primary-color)' }}>{batch.courses}</div>
                        </div>
                        <div style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Created</div>
                            <div style={{ fontSize: '16px', fontWeight: '400', color: '#333' }}>
                                {batch.created_at ? new Date(batch.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '24px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '16px' }}>Batch Information</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <span style={{ fontWeight: '500', color: '#666' }}>Batch Name: </span>
                                <span>{batch.name}</span>
                            </div>
                            <div>
                                <span style={{ fontWeight: '500', color: '#666' }}>Batch ID: </span>
                                <span>{batch.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'members' && (
                <div>
                    {/* Search */}
                    <div style={{ marginBottom: '20px' }}>
                        <div className="input-group" style={{ width: '400px', position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingRight: '40px' }}
                            />
                            <Search size={18} color="#999" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button
                            onClick={() => setIsAddMemberModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            <Plus size={18} /> Add Member
                        </button>
                    </div>

                    {/* Members Table */}
                    <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9f9f9' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#666' }}>Name</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#666' }}>Email</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#666' }}>Status</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#666' }}>Joined</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '500', color: '#666' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.length > 0 ? (
                                    filteredMembers.map(member => (
                                        <tr key={member.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {member.photo_url && (
                                                        <img src={member.photo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                                    )}
                                                    <span>{member.display_name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#666' }}>{member.email}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    backgroundColor: member.status === 'Student' ? '#e3f2fd' : '#f5f5f5',
                                                    color: member.status === 'Student' ? '#1976d2' : '#666'
                                                }}>
                                                    {member.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#666' }}>
                                                {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#d32f2f',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        marginLeft: 'auto'
                                                    }}
                                                >
                                                    <UserMinus size={16} /> Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                                            {searchQuery ? 'No members found' : 'No members in this batch'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'courses' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                        <button
                            onClick={() => setIsAddCourseModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            <Plus size={18} /> Add Course
                        </button>
                    </div>
                    {courses.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {courses.map(course => (
                                <div key={course.id} style={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    backgroundColor: '#fff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
                                        {course.title || course.name || course.course_name || 'Untitled Course'}
                                    </h3>
                                    {course.description && (
                                        <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: '1.5' }}>
                                            {course.description}
                                        </p>
                                    )}
                                    {course.assigned_at && (
                                        <div style={{ fontSize: '12px', color: '#999' }}>
                                            Assigned: {new Date(course.assigned_at).toLocaleDateString()}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                        <button
                                            onClick={() => navigate(`/courses/${course.id}/chapters`)}
                                            style={{
                                                flex: 1,
                                                padding: '8px 16px',
                                                backgroundColor: '#1976d2',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: '500'
                                            }}
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Remove "${course.title || course.name || 'this course'}" from batch?`)) {
                                                    handleRemoveCourse(course.id);
                                                }
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                backgroundColor: '#fff',
                                                color: '#d32f2f',
                                                border: '1px solid #d32f2f',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#999', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                            No courses assigned to this batch
                        </div>
                    )}
                </div>
            )}
            {isAddMemberModalOpen && (
                <AddModal
                    title="Add Members to Batch"
                    items={users}
                    existingItems={members}
                    onClose={() => setIsAddMemberModalOpen(false)}
                    onAdd={handleAddMembers}
                    itemKey="id"
                    displayKey="displayName"
                    subDisplayKey="email"
                    searchPlaceholder="Search members..."
                />
            )}
            {isAddCourseModalOpen && (
                <AddModal
                    title="Add Courses to Batch"
                    items={allCourses}
                    existingItems={courses}
                    onClose={() => setIsAddCourseModalOpen(false)}
                    onAdd={handleAddCourses}
                    itemKey="id"
                    displayKey="title"
                    subDisplayKey="category"
                    searchPlaceholder="Search courses..."
                />
            )}
        </div>
    );
};

export default BatchDetail;

const AddModal = ({ title, items, existingItems, onClose, onAdd, itemKey, displayKey, subDisplayKey, searchPlaceholder }) => {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);

    // Filter out items that are already in the batch
    const availableItems = items.filter(item =>
        !existingItems.some(existing => existing[itemKey] === item[itemKey])
    );

    const filteredItems = availableItems.filter(item => {
        const displayVal = item[displayKey] || '';
        const subDisplayVal = item[subDisplayKey] || '';
        const searchLower = search.toLowerCase();
        return displayVal.toLowerCase().includes(searchLower) || subDisplayVal.toLowerCase().includes(searchLower);
    });

    const toggleSelect = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                width: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <div style={{ padding: '20px' }}>
                    <div className="input-group" style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                        {filteredItems.length > 0 ? (
                            filteredItems.map(item => (
                                <div
                                    key={item[itemKey]}
                                    onClick={() => toggleSelect(item[itemKey])}
                                    style={{
                                        padding: '12px',
                                        borderBottom: '1px solid #eee',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: selected.includes(item[itemKey]) ? '#f0f9ff' : 'white'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{item[displayKey] || 'Untitled'}</div>
                                        {subDisplayKey && <div style={{ fontSize: '12px', color: '#666' }}>{item[subDisplayKey]}</div>}
                                    </div>
                                    {selected.includes(item[itemKey]) && <Check size={16} color="var(--primary-color)" />}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No items found</div>
                        )}
                    </div>
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button
                        onClick={() => onAdd(selected)}
                        disabled={selected.length === 0}
                        style={{
                            padding: '8px 16px',
                            background: selected.length === 0 ? '#ccc' : 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selected.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Add Selected ({selected.length})
                    </button>
                </div>
            </div>
        </div>
    );
};
