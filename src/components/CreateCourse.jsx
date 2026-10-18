import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bold, Italic, Underline, List, Image, Link, FileText } from 'lucide-react';
import { useCourses } from '../context/CourseContext';
import TagSelector from './TagSelector';

const CreateCourse = () => {
    const navigate = useNavigate();
    const { addCourse } = useCourses();

    const [courseData, setCourseData] = useState({
        title: '',
        description: '',
        showScheduledContent: true,
        enableProgressiveLock: false,
        courseLayout: 'List',
        tags: []
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCourseData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCreate = () => {
        if (!courseData.title.trim()) {
            alert('Please enter a course title');
            return;
        }
        addCourse(courseData);
        navigate('/courses');
    };

    return (
        <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '20px' }}>
                <span style={{ color: 'var(--primary-color)', fontSize: '14px' }}>Courses</span>
                <span style={{ color: '#999', margin: '0 8px' }}>/</span>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: '400', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                Create course
            </h2>

            <div style={{ maxWidth: '800px' }}>
                {/* Title */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>Title:</label>
                    <input
                        type="text"
                        name="title"
                        value={courseData.title}
                        onChange={handleChange}
                        className="form-control"
                        style={{ flex: 1 }}
                    />
                </div>

                {/* Description (Rich Text Mock) */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', marginTop: '8px' }}>Description:</label>
                    <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '4px' }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid #eee', display: 'flex', gap: '10px', background: '#f9f9f9' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#666' }}><FileText size={14} /> Source</span>
                            <div style={{ width: '1px', height: '20px', background: '#ddd' }}></div>
                            <Bold size={16} color="#666" />
                            <Italic size={16} color="#666" />
                            <Underline size={16} color="#666" />
                            <div style={{ width: '1px', height: '20px', background: '#ddd' }}></div>
                            <List size={16} color="#666" />
                            <div style={{ width: '1px', height: '20px', background: '#ddd' }}></div>
                            <Link size={16} color="#666" />
                            <Image size={16} color="#666" />
                        </div>
                        <textarea
                            style={{ width: '100%', height: '150px', border: 'none', padding: '10px', resize: 'vertical', outline: 'none' }}
                            name="description"
                            value={courseData.description}
                            onChange={handleChange}
                        ></textarea>
                    </div>
                </div>

                {/* Icon */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>Icon:</label>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#00bcd4' }}>
                        <span style={{ color: 'white', fontSize: '20px' }}>📚</span>
                    </div>
                </div>

                {/* Thumbnail Image */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', marginTop: '5px' }}>Thumbnail Image:</label>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button style={{ padding: '4px 10px', border: '1px solid #ccc', background: '#eee', borderRadius: '3px', cursor: 'pointer' }}>Choose File</button>
                            <span style={{ fontSize: '13px', color: '#666' }}>No file chosen</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Thumbnail image for the course (1:1 aspect ratio, up to 2 MB).</div>
                    </div>
                </div>

                {/* Show Scheduled Content */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>Show scheduled content:</label>
                    <input
                        type="checkbox"
                        name="showScheduledContent"
                        checked={courseData.showScheduledContent}
                        onChange={handleChange}
                    />
                </div>

                {/* Enable Progressive Lock */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>Enable Progressive Lock:</label>
                    <div>
                        <input
                            type="checkbox"
                            name="enableProgressiveLock"
                            checked={courseData.enableProgressiveLock}
                            onChange={handleChange}
                        />
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Users cannot access the next test, if the current test is not completed</div>
                    </div>
                </div>

                {/* Course Layout */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', marginTop: '5px' }}>Course Layout:</label>
                    <div style={{ flex: 1 }}>
                        <select
                            name="courseLayout"
                            value={courseData.courseLayout}
                            onChange={handleChange}
                            className="form-control"
                            style={{ width: '150px' }}
                        >
                            <option value="List">List</option>
                            <option value="Grid">Grid</option>
                        </select>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>The layout in which the course's contents are displayed in the learner's UI</div>
                    </div>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', marginTop: '5px' }}>Tags:</label>
                    <div style={{ flex: 1 }}>
                        <TagSelector
                            selectedTags={courseData.tags || []}
                            onChange={(tags) => setCourseData(prev => ({ ...prev, tags }))}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginLeft: '200px' }}>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#00bfa5', color: 'white', border: 'none' }}
                        onClick={handleCreate}
                    >
                        Create course
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

export default CreateCourse;
