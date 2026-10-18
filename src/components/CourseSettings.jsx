import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Image, Link, Type, FileText, Book } from 'lucide-react';
import { useCourses } from '../context/CourseContext';
import TagSelector from './TagSelector';

const CourseSettings = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { getCourse, updateCourse } = useCourses();

    const [courseData, setCourseData] = useState(null);
    const fileInputRef = useRef(null);
    const [fileName, setFileName] = useState('No file chosen');
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        const data = getCourse(id);
        if (data) {
            setCourseData(data);
        } else {
            navigate('/courses');
        }
    }, [id, getCourse, navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCourseData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
            setSelectedFile(file);
            const imageUrl = URL.createObjectURL(file);
            setCourseData(prev => ({
                ...prev,
                image: imageUrl
            }));
        }
    };

    const handleChooseFileClick = () => {
        fileInputRef.current.click();
    };

    const handleUpdate = async () => {
        const result = await updateCourse(id, courseData, selectedFile);
        if (result.success) {
            navigate('/courses');
        } else {
            alert('Failed to update course: ' + result.error);
        }
    };

    if (!courseData) return <div>Loading...</div>;

    return (
        <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '20px' }}>
                <span style={{ color: 'var(--primary-color)', fontSize: '14px' }}>Courses</span>
                <span style={{ color: '#999', margin: '0 8px' }}>/</span>
                <span style={{ color: '#666', fontSize: '14px' }}>{courseData.title}</span>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: '400', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                Edit - {courseData.title}
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
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: courseData.image ? 'transparent' : '#f0f0f0' }}>
                        {courseData.image ? (
                            <img src={courseData.image} alt="Icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <Book size={20} color="#666" />
                        )}
                    </div>
                </div>

                {/* Thumbnail Image */}
                <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px', marginTop: '5px' }}>Thumbnail Image:</label>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                accept="image/*"
                            />
                            <button
                                onClick={handleChooseFileClick}
                                style={{ padding: '4px 10px', border: '1px solid #ccc', background: '#eee', borderRadius: '3px', cursor: 'pointer' }}
                            >
                                Choose File
                            </button>
                            <span style={{ fontSize: '13px', color: '#666' }}>{fileName}</span>
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

                {/* Course Certificate */}
                <div style={{ display: 'flex', marginBottom: '30px', alignItems: 'center' }}>
                    <label style={{ width: '180px', fontWeight: 'bold', color: '#555', textAlign: 'right', marginRight: '20px' }}>Course certificate:</label>
                    <div style={{ fontSize: '14px' }}>
                        To set-up, click <a href="#" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>here</a>.
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginLeft: '200px' }}>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#00bfa5', color: 'white', border: 'none' }}
                        onClick={handleUpdate}
                    >
                        Update course
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

export default CourseSettings;
