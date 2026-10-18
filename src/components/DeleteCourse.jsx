import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCourses } from '../context/CourseContext';
import { X } from 'lucide-react';

const DeleteCourse = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { getCourse, deleteCourse } = useCourses();
    const course = getCourse(id);

    if (!course) {
        return <div>Course not found</div>;
    }

    const handleDelete = () => {
        deleteCourse(id);
        navigate('/courses');
    };

    return (
        <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '20px' }}>
                <span style={{ color: 'var(--primary-color)', fontSize: '14px' }}>Courses</span>
                <span style={{ color: '#999', margin: '0 8px' }}>/</span>
                <span style={{ color: '#666', fontSize: '14px' }}>{course.title}</span>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: '400', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                Delete - {course.title}
            </h2>

            <div style={{ maxWidth: '800px' }}>
                <p style={{ fontSize: '16px', color: '#333', marginBottom: '20px' }}>
                    Are you sure you want to delete the course "{course.title}"?
                </p>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>
                    This will delete all the chapters from the current course.
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#e0e0e0', color: '#333', border: '1px solid #ccc' }}
                        onClick={() => navigate('/courses')}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#d32f2f', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={handleDelete}
                    >
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={12} color="#d32f2f" strokeWidth={3} />
                        </div>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteCourse;
