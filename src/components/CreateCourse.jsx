import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bold, Italic, Underline, List, Image, Link, FileText, Book } from 'lucide-react';
import { useCourses } from '../context/CourseContext';
import TagSelector from './TagSelector';
import IconPicker from './IconPicker';

const CreateCourse = () => {
    const navigate = useNavigate();
    const { addCourse } = useCourses();
    const fileInputRef = useRef(null);

    const [fileName, setFileName] = useState('No file chosen');
    const [selectedFile, setSelectedFile] = useState(null);
    const [showIconPicker, setShowIconPicker] = useState(false);

    const [courseData, setCourseData] = useState({
        title: '',
        description: '',
        image: '',
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

    const handleIconSelect = (iconUrl) => {
        setCourseData(prev => ({
            ...prev,
            image: iconUrl
        }));
        setSelectedFile(null);
        setFileName('From Preloaded Icons');
    };

    const handleCreate = () => {
        if (!courseData.title.trim()) {
            alert('Please enter a course title');
            return;
        }
        addCourse(courseData, selectedFile);
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
                    <div
                        onClick={() => setShowIconPicker(true)}
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            border: '1px solid #0088cc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            backgroundColor: courseData.image ? 'transparent' : '#f0f0f0',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                        title="Click to choose from preloaded icons"
                    >
                        {courseData.image ? (
                            <img src={courseData.image} alt="Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <Book size={20} color="#666" />
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowIconPicker(true)}
                        style={{
                            marginLeft: '12px',
                            padding: '4px 10px',
                            border: '1px solid #0088cc',
                            background: '#f0f9ff',
                            color: '#0088cc',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                        }}
                    >
                        Choose Icon
                    </button>
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
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
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
                            selectedTags={courseData.tags}
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
                        onClick={handleCreate}
                    >
                        Save
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

            {/* Icon Picker Modal */}
            <IconPicker
                isOpen={showIconPicker}
                onClose={() => setShowIconPicker(false)}
                onSelect={handleIconSelect}
                currentIcon={courseData.image}
            />
        </div>
    );
};

export default CreateCourse;
