import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, CheckCircle, Eye, Code } from 'lucide-react';
import { useQuestions } from '../context/QuestionContext';
import { useSubjects } from '../context/SubjectContext';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import MathText from './MathText';

const CreateQuestion = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const folderId = searchParams.get('folderId');

    const { addQuestion, updateQuestion, questions, fetchQuestions } = useQuestions();
    const { subjects, fetchSubjects } = useSubjects();
    const { folders, fetchFolders, addQuestionToFolder, removeQuestionFromFolder, getQuestionUsage } = useQuestionFolders();

    const [formData, setFormData] = useState({
        question_text: '',
        question_type: 'MCQ, Single Correct Question',
        subject_id: '',
        difficulty_level: '',
        explanation: ''
    });

    const [options, setOptions] = useState([
        { option_label: 'a', option_text: '', is_correct: false },
        { option_label: 'b', option_text: '', is_correct: false },
        { option_label: 'c', option_text: '', is_correct: false },
        { option_label: 'd', option_text: '', is_correct: false }
    ]);

    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [selectedFolders, setSelectedFolders] = useState([]);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState(true); // Default to preview mode

    useEffect(() => {
        fetchSubjects();
        fetchFolders();
    }, []);

    useEffect(() => {
        if (folderId && folders.length > 0) {
            setSelectedFolders([folderId]);
        }
    }, [folderId, folders]);

    useEffect(() => {
        const loadQuestion = async () => {
            if (id) {
                setLoading(true);
                await fetchQuestions({ page: 1, perPage: 1000 });
                setLoading(false);
            }
        };
        loadQuestion();
    }, [id]);

    useEffect(() => {
        const loadQuestionData = async () => {
            if (id && questions.length > 0) {
                const question = questions.find(q => q.id === id);
                if (question) {
                    setFormData({
                        question_text: question.question_text || '',
                        question_type: question.question_type || 'MCQ, Single Correct Question',
                        subject_id: question.subject_id || '',
                        difficulty_level: question.difficulty_level || '',
                        explanation: question.explanation || ''
                    });

                    if (question.options && question.options.length > 0) {
                        setOptions(question.options.map(opt => ({
                            option_label: opt.option_label,
                            option_text: opt.option_text,
                            is_correct: opt.is_correct
                        })));
                    }

                    if (question.tags && question.tags.length > 0) {
                        setTags(question.tags.map(t => t.tag_name));
                    }

                    const usageResult = await getQuestionUsage(id);
                    if (usageResult.success && usageResult.data) {
                        setSelectedFolders(usageResult.data.map(item => item.folder_id));
                    }
                }
            }
        };
        loadQuestionData();
    }, [id, questions]);

    const handleOptionChange = (index, field, value) => {
        const newOptions = [...options];
        if (field === 'is_correct' && value) {
            newOptions.forEach(opt => opt.is_correct = false);
        }
        newOptions[index][field] = value;
        setOptions(newOptions);
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        const hasCorrectAnswer = options.some(opt => opt.is_correct);
        if (!hasCorrectAnswer) {
            setError('Please mark at least one correct answer.');
            setSubmitting(false);
            return;
        }

        const result = id
            ? await updateQuestion(id, formData, options, tags)
            : await addQuestion(formData, options, tags);

        if (result.success) {
            const questionId = id || result.data.id;

            const currentUsage = await getQuestionUsage(questionId);
            const currentFolders = currentUsage.success ? currentUsage.data.map(item => item.folder_id) : [];

            for (const fId of selectedFolders) {
                if (!currentFolders.includes(fId)) {
                    await addQuestionToFolder(questionId, fId);
                }
            }

            for (const fId of currentFolders) {
                if (!selectedFolders.includes(fId)) {
                    await removeQuestionFromFolder(questionId, fId);
                }
            }

            // alert(id ? 'Question updated successfully!' : 'Question added successfully!');

            if (folderId && !id) {
                navigate(`/questions/folders/${folderId}`);
            } else {
                navigate('/questions');
            }
        } else {
            setError(result.error);
        }

        setSubmitting(false);
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading question...</div>;
    }

    return (
        <div className="container" style={{ maxWidth: '900px', padding: 0 }}>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="btn btn-ghost"
                    style={{ paddingLeft: 0 }}
                >
                    <ArrowLeft size={20} /> Back
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-color)', margin: 0 }}>
                    {id ? 'Edit Question' : 'Add New Question'}
                </h1>
                <button
                    onClick={handleSubmit}
                    className="btn btn-primary"
                    disabled={submitting}
                >
                    <Save size={18} />
                    {submitting ? 'Saving...' : 'Save Question'}
                </button>
            </div>

            <div className="card">
                <div className="card-body">
                    {error && (
                        <div style={{ padding: '12px', marginBottom: '24px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: 'var(--radius-md)', fontSize: '14px', border: '1px solid #ef9a9a' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Question Text */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontWeight: '500', fontSize: '14px', margin: 0 }}>
                                    Question Text *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setPreviewMode(!previewMode)}
                                    className="btn btn-outline"
                                    style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    {previewMode ? (
                                        <>
                                            <Code size={16} />
                                            Edit HTML
                                        </>
                                    ) : (
                                        <>
                                            <Eye size={16} />
                                            Preview
                                        </>
                                    )}
                                </button>
                            </div>
                            {previewMode ? (
                                <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => setFormData({ ...formData, question_text: e.target.innerHTML })}
                                    dangerouslySetInnerHTML={{ __html: formData.question_text }}
                                    style={{
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '12px',
                                        minHeight: '100px',
                                        backgroundColor: '#fff',
                                        fontSize: '15px',
                                        lineHeight: '1.6',
                                        cursor: 'text',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary-color)';
                                        e.target.style.backgroundColor = '#fafbfc';
                                    }}
                                    onBlurCapture={(e) => {
                                        e.target.style.borderColor = 'var(--border-color)';
                                        e.target.style.backgroundColor = '#fff';
                                    }}
                                />
                            ) : (
                                <textarea
                                    className="form-control"
                                    value={formData.question_text}
                                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                                    required
                                    rows={4}
                                    placeholder="Enter your question here..."
                                    style={{ resize: 'vertical', minHeight: '100px', fontFamily: 'monospace', fontSize: '13px' }}
                                />
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            {/* Question Type */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                    Question Type
                                </label>
                                <select
                                    className="form-control"
                                    value={formData.question_type}
                                    onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                                >
                                    <option value="MCQ, Single Correct Question">MCQ, Single Correct Question</option>
                                    <option value="MCQ, Multiple Correct Questions">MCQ, Multiple Correct Questions</option>
                                </select>
                            </div>

                            {/* Difficulty Level */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                    Difficulty Level
                                </label>
                                <select
                                    className="form-control"
                                    value={formData.difficulty_level}
                                    onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                                >
                                    <option value="">Select difficulty</option>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        {/* Subject */}
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                Subject
                            </label>
                            <select
                                className="form-control"
                                value={formData.subject_id}
                                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                            >
                                <option value="">Select a subject</option>
                                {subjects.map(subject => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Options */}
                        <div style={{ marginBottom: '32px', background: '#f9fafb', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'block', marginBottom: '16px', fontWeight: '600', fontSize: '15px' }}>
                                Answer Options
                            </label>
                            {options.map((option, index) => (
                                <div key={index} style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                minWidth: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: option.is_correct ? 'var(--secondary-color)' : '#e0e0e0',
                                                color: option.is_correct ? 'white' : '#666',
                                                borderRadius: '50%',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onClick={() => handleOptionChange(index, 'is_correct', !option.is_correct)}
                                            title="Click to mark as correct"
                                        >
                                            {option.option_label.toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            {previewMode ? (
                                                <div
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => handleOptionChange(index, 'option_text', e.target.innerHTML)}
                                                    dangerouslySetInnerHTML={{ __html: option.option_text }}
                                                    style={{
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: 'var(--radius-md)',
                                                        padding: '10px',
                                                        backgroundColor: '#fff',
                                                        fontSize: '14px',
                                                        minHeight: '40px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        cursor: 'text',
                                                        outline: 'none'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = 'var(--primary-color)';
                                                        e.target.style.backgroundColor = '#fafbfc';
                                                    }}
                                                    onBlurCapture={(e) => {
                                                        e.target.style.borderColor = 'var(--border-color)';
                                                        e.target.style.backgroundColor = '#fff';
                                                    }}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={option.option_text}
                                                    onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                                                    placeholder={`Option ${option.option_label.toUpperCase()}`}
                                                    required
                                                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                                                />
                                            )}
                                        </div>
                                        {option.is_correct && <CheckCircle size={20} color="var(--secondary-color)" style={{ marginTop: '10px' }} />}
                                    </div>
                                </div>
                            ))}
                            <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '12px', marginLeft: '52px' }}>
                                Click on the circle (A, B, C, D) to mark the correct answer.
                            </p>
                        </div>

                        {/* Explanation */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontWeight: '500', fontSize: '14px', margin: 0 }}>
                                    Explanation (Optional)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setPreviewMode(!previewMode)}
                                    className="btn btn-outline"
                                    style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    {previewMode ? (
                                        <>
                                            <Code size={16} />
                                            Edit HTML
                                        </>
                                    ) : (
                                        <>
                                            <Eye size={16} />
                                            Preview
                                        </>
                                    )}
                                </button>
                            </div>
                            {previewMode ? (
                                <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => setFormData({ ...formData, explanation: e.target.innerHTML })}
                                    dangerouslySetInnerHTML={{ __html: formData.explanation || '<span style="color: #999; font-style: italic;">Click to add explanation...</span>' }}
                                    style={{
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '12px',
                                        minHeight: '80px',
                                        backgroundColor: '#fff',
                                        fontSize: '14px',
                                        lineHeight: '1.6',
                                        cursor: 'text',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary-color)';
                                        e.target.style.backgroundColor = '#fafbfc';
                                        // Clear placeholder if present
                                        if (!formData.explanation) {
                                            e.target.innerHTML = '';
                                        }
                                    }}
                                    onBlurCapture={(e) => {
                                        e.target.style.borderColor = 'var(--border-color)';
                                        e.target.style.backgroundColor = '#fff';
                                    }}
                                />
                            ) : (
                                <textarea
                                    className="form-control"
                                    value={formData.explanation}
                                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                                    rows={3}
                                    placeholder="Explain why the answer is correct..."
                                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
                                />
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Tags */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                    Tags
                                </label>
                                <div className="input-group" style={{ marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="Add a tag..."
                                    />
                                    <button type="button" onClick={addTag} style={{ color: 'var(--primary-color)', fontWeight: '500' }}>
                                        Add
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="badge badge-gray"
                                            style={{ padding: '6px 10px', gap: '6px' }}
                                        >
                                            {tag}
                                            <X
                                                size={14}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => removeTag(tag)}
                                            />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Folders */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                    Add to Folders
                                </label>
                                <div style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '12px',
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                    background: '#fff'
                                }}>
                                    {folders.length === 0 ? (
                                        <div style={{ fontSize: '13px', color: 'var(--text-light)', textAlign: 'center' }}>
                                            No folders available.
                                        </div>
                                    ) : (
                                        folders.map(folder => (
                                            <label
                                                key={folder.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '6px',
                                                    cursor: 'pointer',
                                                    borderRadius: '4px',
                                                    fontSize: '14px'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#f5f7f8'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFolders.includes(folder.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedFolders([...selectedFolders, folder.id]);
                                                        } else {
                                                            setSelectedFolders(selectedFolders.filter(id => id !== folder.id));
                                                        }
                                                    }}
                                                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                                                />
                                                <span>{folder.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateQuestion;
