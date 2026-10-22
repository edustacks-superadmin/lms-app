import React, { useState, useMemo } from 'react';
import { Lock, Clock, CheckCircle, List, Search, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExams } from '../context/ExamContext';
import ExamList from './ExamList';

const ExamsPage = () => {
    const navigate = useNavigate();
    const { status } = useParams(); // Get status from route params
    const { exams } = useExams();
    const activeTab = status || 'running'; // Default to 'running' if no status in route
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [courseSearch, setCourseSearch] = useState('');

    // Get exam status based on dates
    const getExamStatus = (exam) => {
        const now = new Date();
        const startDate = exam.start_date ? new Date(exam.start_date) : null;
        const endDate = exam.end_date ? new Date(exam.end_date) : null;

        if (!startDate) return 'running';

        if (endDate && now > endDate) {
            return 'completed';
        } else if (now < startDate) {
            return 'upcoming';
        } else {
            return 'running';
        }
    };

    // Get counts for each category
    const examCounts = useMemo(() => {
        const counts = { running: 0, upcoming: 0, completed: 0 };
        exams.forEach(exam => {
            const status = getExamStatus(exam);
            counts[status]++;
        });
        return counts;
    }, [exams]);

    // Get unique courses from all exams
    const allCourses = useMemo(() => {
        const coursesMap = new Map();
        exams.forEach(exam => {
            if (exam.course_exams && exam.course_exams.length > 0) {
                exam.course_exams.forEach(ce => {
                    if (ce.courses && ce.courses.id) {
                        coursesMap.set(ce.courses.id, ce.courses.title || 'Untitled Course');
                    }
                });
            }
        });
        return Array.from(coursesMap, ([id, title]) => ({ id, title }))
            .sort((a, b) => a.title.localeCompare(b.title));
    }, [exams]);

    // Filter courses based on search query
    const visibleCourses = useMemo(() => {
        if (!courseSearch.trim()) return allCourses;
        const q = courseSearch.toLowerCase();
        return allCourses.filter(c => c.title?.toLowerCase().includes(q));
    }, [allCourses, courseSearch]);

    // Get unique tags from all exams
    const allTags = useMemo(() => {
        const tagsSet = new Set();
        exams.forEach(exam => {
            if (exam.tags && Array.isArray(exam.tags)) {
                exam.tags.forEach(tag => {
                    if (tag) tagsSet.add(tag);
                });
            }
        });
        return Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
    }, [exams]);

    const toggleCourse = (courseId) => {
        setSelectedCourses(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <>
            {/* Sidebar */}
            <aside style={{ width: '250px', flexShrink: 0, padding: '20px 16px 20px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        className="btn btn-success"
                        style={{ justifyContent: 'center', width: '100%', marginBottom: '16px' }}
                        onClick={() => navigate('/exams/create')}
                    >
                        <List size={18} /> Create Exam
                    </button>

                    <button
                        className={activeTab === 'running' ? 'btn btn-primary' : 'btn'}
                        style={{
                            justifyContent: 'flex-start',
                            width: '100%',
                            color: activeTab === 'running' ? 'white' : 'var(--primary-color)',
                            background: activeTab === 'running' ? 'var(--primary-color)' : 'transparent'
                        }}
                        onClick={() => navigate('/exams/running')}
                    >
                        <Lock size={16} /> Running ({examCounts.running})
                    </button>
                    <button
                        className={activeTab === 'upcoming' ? 'btn btn-primary' : 'btn'}
                        style={{
                            justifyContent: 'flex-start',
                            width: '100%',
                            color: activeTab === 'upcoming' ? 'white' : 'var(--primary-color)',
                            background: activeTab === 'upcoming' ? 'var(--primary-color)' : 'transparent'
                        }}
                        onClick={() => navigate('/exams/upcoming')}
                    >
                        <Clock size={16} /> Upcoming ({examCounts.upcoming})
                    </button>
                    <button
                        className={activeTab === 'completed' ? 'btn btn-primary' : 'btn'}
                        style={{
                            justifyContent: 'flex-start',
                            width: '100%',
                            color: activeTab === 'completed' ? 'white' : 'var(--primary-color)',
                            background: activeTab === 'completed' ? 'var(--primary-color)' : 'transparent'
                        }}
                        onClick={() => navigate('/exams/completed')}
                    >
                        <CheckCircle size={16} /> Completed ({examCounts.completed})
                    </button>
                </div>

                {/* Filter by Tags */}
                {allTags.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Filter by tags
                                </h3>
                                {selectedTags.length > 0 && (
                                    <span style={{
                                        fontSize: '11px',
                                        backgroundColor: '#dbeafe',
                                        color: '#1d4ed8',
                                        padding: '1px 6px',
                                        borderRadius: '10px',
                                        fontWeight: 600
                                    }}>
                                        {selectedTags.length}
                                    </span>
                                )}
                            </div>
                            {selectedTags.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedTags([])}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2563eb',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 500,
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div
                            style={{
                                maxHeight: '160px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                paddingRight: '4px',
                                scrollbarWidth: 'thin'
                            }}
                        >
                            {allTags.map(tag => {
                                const isChecked = selectedTags.includes(tag);
                                return (
                                    <label
                                        key={tag}
                                        title={tag}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '5px 8px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                                            color: isChecked ? '#1d4ed8' : '#475569',
                                            transition: 'background 0.15s ease',
                                            userSelect: 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isChecked) e.currentTarget.style.backgroundColor = '#f1f5f9';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleTag(tag)}
                                            style={{
                                                margin: 0,
                                                accentColor: 'var(--primary-color)',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        />
                                        <span
                                            style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontWeight: isChecked ? 500 : 400
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Filter by Courses */}
                {allCourses.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Filter by Courses
                                </h3>
                                {selectedCourses.length > 0 && (
                                    <span style={{
                                        fontSize: '11px',
                                        backgroundColor: '#dbeafe',
                                        color: '#1d4ed8',
                                        padding: '1px 6px',
                                        borderRadius: '10px',
                                        fontWeight: 600
                                    }}>
                                        {selectedCourses.length}
                                    </span>
                                )}
                            </div>
                            {selectedCourses.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedCourses([])}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#2563eb',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 500,
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {allCourses.length > 5 && (
                            <div style={{ position: 'relative', marginBottom: '8px' }}>
                                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    value={courseSearch}
                                    onChange={(e) => setCourseSearch(e.target.value)}
                                    placeholder="Search courses..."
                                    style={{
                                        width: '100%',
                                        padding: '5px 24px 5px 26px',
                                        fontSize: '12px',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {courseSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setCourseSearch('')}
                                        style={{
                                            position: 'absolute',
                                            right: '6px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            padding: 2,
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        title="Clear search"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        )}

                        <div
                            style={{
                                maxHeight: '260px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                paddingRight: '4px',
                                scrollbarWidth: 'thin'
                            }}
                        >
                            {visibleCourses.map(course => {
                                const isChecked = selectedCourses.includes(course.id);
                                return (
                                    <label
                                        key={course.id}
                                        title={course.title}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '5px 8px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                                            color: isChecked ? '#1d4ed8' : '#475569',
                                            transition: 'background 0.15s ease',
                                            userSelect: 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isChecked) e.currentTarget.style.backgroundColor = '#f1f5f9';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleCourse(course.id)}
                                            style={{
                                                margin: 0,
                                                accentColor: 'var(--primary-color)',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        />
                                        <span
                                            style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontWeight: isChecked ? 500 : 400
                                            }}
                                        >
                                            {course.title}
                                        </span>
                                    </label>
                                );
                            })}
                            {visibleCourses.length === 0 && (
                                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '12px 8px', textAlign: 'center' }}>
                                    No courses found
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(selectedCourses.length > 0 || selectedTags.length > 0) && (
                    <button
                        className="btn btn-outline"
                        style={{ marginTop: '20px', width: '100%' }}
                        onClick={() => {
                            setSelectedCourses([]);
                            setSelectedTags([]);
                        }}
                    >
                        Clear Filters
                    </button>
                )}
            </aside>

            {/* Main Content */}
            <div className="content-area">
                <ExamList
                    activeTab={activeTab}
                    selectedCourses={selectedCourses}
                    selectedTags={selectedTags}
                />
            </div>
        </>
    );
};

export default ExamsPage;
