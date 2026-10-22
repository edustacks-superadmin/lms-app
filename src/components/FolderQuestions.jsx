import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Plus, X, ChevronDown, ChevronUp, Edit, Upload, Folder, Tag } from 'lucide-react';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import { useQuestions } from '../context/QuestionContext';
import MathText from './MathText';

const FolderQuestions = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { folders, getFolderQuestions, removeQuestionFromFolder, addQuestionToFolder, reorderFolderQuestions, bulkRemoveQuestionsFromFolder, getQuestionsUsage } = useQuestionFolders();
    const { questions: allQuestions, fetchQuestions } = useQuestions();

    const [folder, setFolder] = useState(null);
    const [folderQuestions, setFolderQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());

    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [expandedQuestionIds, setExpandedQuestionIds] = useState(new Set());
    const [questionUsage, setQuestionUsage] = useState({});

    useEffect(() => {
        if (folders.length === 0) {
            fetchFolders();
        }
    }, [folders.length]);

    useEffect(() => {
        if (folders.length > 0) {
            const found = folders.find(f => f.id === id);
            setFolder(found);
        }
    }, [folders, id]);

    useEffect(() => {
        loadFolderQuestions();
    }, [id]);

    const loadFolderQuestions = async () => {
        setLoading(true);
        const result = await getFolderQuestions(id);
        if (result.success) {
            setFolderQuestions(result.data);
            setSelectedQuestionIds(new Set()); // Reset selection on load

            // Fetch usage
            if (result.data && result.data.length > 0) {
                const questionIds = result.data.map(q => q.question_id);
                const usageResult = await getQuestionsUsage(questionIds);

                if (usageResult.success && usageResult.data) {
                    const usageMap = {};
                    usageResult.data.forEach(item => {
                        if (!usageMap[item.question_id]) {
                            usageMap[item.question_id] = [];
                        }
                        usageMap[item.question_id].push(item);
                    });
                    setQuestionUsage(usageMap);
                }
            } else {
                setQuestionUsage({});
            }
        }
        setLoading(false);
    };

    const handleRemoveQuestion = async (questionId) => {
        if (window.confirm('Remove this question from the folder?')) {
            const result = await removeQuestionFromFolder(questionId, id);
            if (result.success) {
                loadFolderQuestions();
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedQuestionIds.size === 0) return;

        if (window.confirm(`Are you sure you want to remove ${selectedQuestionIds.size} questions from this folder?`)) {
            const result = await bulkRemoveQuestionsFromFolder(Array.from(selectedQuestionIds), id);
            if (result.success) {
                loadFolderQuestions();
            }
        }
    };

    const toggleSelectAll = () => {
        if (selectedQuestionIds.size === filteredQuestions.length) {
            setSelectedQuestionIds(new Set());
        } else {
            setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.question_id)));
        }
    };

    const toggleSelectQuestion = (qId) => {
        setSelectedQuestionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(qId)) {
                newSet.delete(qId);
            } else {
                newSet.add(qId);
            }
            return newSet;
        });
    };

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const reordered = [...folderQuestions];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(dragOverIndex, 0, removed);

        setFolderQuestions(reordered);
        setDraggedIndex(null);
        setDragOverIndex(null);

        // Update positions in database
        await reorderFolderQuestions(id, reordered);
    };

    const toggleExpand = (qId) => {
        setExpandedQuestionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(qId)) {
                newSet.delete(qId);
            } else {
                newSet.add(qId);
            }
            return newSet;
        });
    };

    const filteredQuestions = folderQuestions.filter(item =>
        item.questions?.question_text?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ flex: 1, padding: '0', marginTop: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <button
                    onClick={() => navigate('/questions/folders')}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <ArrowLeft size={24} color="#333" />
                </button>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '400', margin: 0, color: '#1a1a1a' }}>
                        {folder ? folder.name : 'Loading...'}
                    </h1>
                    {folder?.description && (
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                            {folder.description}
                        </div>
                    )}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                    {selectedQuestionIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none'
                            }}
                        >
                            <Trash2 size={18} />
                            Delete Selected ({selectedQuestionIds.size})
                        </button>
                    )}
                    <button
                        onClick={() => navigate(`/questions/folders/${id}/bulk-upload`)}
                        className="btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        <Upload size={18} />
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => navigate(`/questions/create?folderId=${id}`)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                    >
                        <Plus size={18} />
                        Create New Question
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                    >
                        <Plus size={18} />
                        Add Existing Questions
                    </button>
                </div>
            </div>

            {/* Search and Select All */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ position: 'relative', width: '400px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                    <input
                        type="text"
                        placeholder="Search questions in this folder"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 40px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                </div>
                {filteredQuestions.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            checked={selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                            onChange={toggleSelectAll}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            id="select-all"
                        />
                        <label htmlFor="select-all" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '14px', fontWeight: '500' }}>
                            Select All
                        </label>
                    </div>
                )}
            </div>

            {/* Questions List */}
            {loading ? (
                <p>Loading questions...</p>
            ) : (
                <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                    {filteredQuestions.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                            {searchTerm ? 'No questions found matching your search.' : 'No questions in this folder yet.'}
                        </div>
                    ) : (
                        filteredQuestions.map((item, index) => (
                            <div
                                key={item.question_id}
                                draggable={!searchTerm}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                style={{
                                    padding: '16px 24px',
                                    borderBottom: index < filteredQuestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: searchTerm ? 'default' : 'move',
                                    backgroundColor: draggedIndex === index ? '#f5f5f5' : 'white'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedQuestionIds.has(item.question_id)}
                                            onChange={() => toggleSelectQuestion(item.question_id)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
                                        {/* Position Number */}
                                        <div style={{
                                            minWidth: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            backgroundColor: '#2196f3',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '600',
                                            fontSize: '16px'
                                        }}>
                                            #{item.position}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <span
                                                    style={{
                                                        fontSize: '12px',
                                                        padding: '2px 8px',
                                                        backgroundColor: '#e3f2fd',
                                                        color: '#1976d2',
                                                        borderRadius: '4px',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    {item.questions?.question_type || 'MCQ'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '15px', lineHeight: '1.5', color: '#333', fontWeight: '500' }}>
                                                <MathText>{item.questions?.question_text}</MathText>
                                            </div>

                                            {/* Options */}
                                            <div style={{ marginTop: '12px' }}>
                                                {item.questions?.options && item.questions.options.map((option) => (
                                                    <div
                                                        key={option.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '8px',
                                                            padding: '8px 0',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: '500', minWidth: '20px' }}>
                                                            {option.option_label})
                                                        </span>
                                                        <span style={{ color: option.is_correct ? '#4caf50' : '#333' }}>
                                                            <MathText>{option.option_text}</MathText>
                                                        </span>
                                                        {option.is_correct && (
                                                            <div
                                                                style={{
                                                                    width: '20px',
                                                                    height: '20px',
                                                                    backgroundColor: '#4caf50',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '12px',
                                                                    color: 'white',
                                                                    fontWeight: 'bold'
                                                                }}
                                                            >
                                                                ✓
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Explanation */}
                                            {item.questions?.explanation && (
                                                <div className="explanation-container" style={{ marginTop: '12px', padding: '14px 20px', backgroundColor: '#f5f9ff', borderLeft: '4px solid #2196f3', borderRadius: '4px' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1976d2', marginBottom: '6px' }}>
                                                        Explanation:
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6' }} className="explanation-content">
                                                        <MathText>{item.questions.explanation}</MathText>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subject Info */}
                                            {(item.questions?.subject || item.questions?.subjects) && (
                                                <div style={{ marginTop: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <strong style={{ color: '#475569' }}>Subject:</strong>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        padding: '2px 8px',
                                                        backgroundColor: '#eff6ff',
                                                        border: '1px solid #bfdbfe',
                                                        borderRadius: '12px',
                                                        color: '#1d4ed8',
                                                        fontSize: '12px',
                                                        fontWeight: '500'
                                                    }}>
                                                        {item.questions.subject || item.questions.subjects?.name}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Tags */}
                                            {item.questions?.tags && item.questions.tags.length > 0 && (
                                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {item.questions.tags.map(tag => (
                                                        <span
                                                            key={tag.id}
                                                            style={{
                                                                fontSize: '12px',
                                                                padding: '3px 10px',
                                                                backgroundColor: '#f5f5f5',
                                                                borderRadius: '12px',
                                                                color: '#666'
                                                            }}
                                                        >
                                                            {tag.tag_name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Metadata */}
                                            <div style={{ marginTop: '12px', fontSize: '12px', color: '#999', display: 'flex', gap: '16px' }}>
                                                {item.questions?.created_at && <span>Created on {new Date(item.questions.created_at).toLocaleDateString()}</span>}
                                                {item.questions?.percentage_correct !== null && item.questions?.percentage_correct !== undefined && <span>Percentage correct: {item.questions.percentage_correct}%</span>}
                                            </div>

                                            {/* List Usage */}
                                            {questionUsage[item.question_id] && questionUsage[item.question_id].length > 0 && (
                                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Folder size={12} />
                                                        Used in:
                                                    </span>
                                                    {questionUsage[item.question_id].map((usageItem, idx) => (
                                                        <span
                                                            key={idx}
                                                            style={{
                                                                fontSize: '11px',
                                                                padding: '2px 8px',
                                                                backgroundColor: usageItem.type === 'exam' ? '#e3f2fd' : '#fff3e0',
                                                                color: usageItem.type === 'exam' ? '#1565c0' : '#e65100',
                                                                border: `1px solid ${usageItem.type === 'exam' ? '#bbdefb' : '#ffe0b2'}`,
                                                                borderRadius: '10px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            {usageItem.type === 'exam' ? 'Exam: ' : 'Folder: '}
                                                            {usageItem.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => toggleExpand(item.question_id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                color: '#666',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {expandedQuestionIds.has(item.question_id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                        <button
                                            onClick={() => navigate(`/questions/edit/${item.question_id}`)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                color: '#2196f3',
                                                opacity: 0.7
                                            }}
                                            title="Edit Question"
                                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveQuestion(item.question_id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                color: '#f44336',
                                                opacity: 0.7
                                            }}
                                            title="Remove from folder"
                                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedQuestionIds.has(item.question_id) && (
                                    <div style={{ marginTop: '16px', paddingLeft: '52px' }}>
                                        {/* Options */}
                                        {item.questions?.options && item.questions.options.length > 0 && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>OPTIONS</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {item.questions.options
                                                        .sort((a, b) => a.option_label.localeCompare(b.option_label))
                                                        .map(opt => (
                                                            <div key={opt.id} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                padding: '8px 12px',
                                                                backgroundColor: opt.is_correct ? '#e8f5e9' : '#f9f9f9',
                                                                border: `1px solid ${opt.is_correct ? '#c8e6c9' : '#eee'}`,
                                                                borderRadius: '4px'
                                                            }}>
                                                                <div style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: opt.is_correct ? '#4caf50' : '#e0e0e0',
                                                                    color: opt.is_correct ? 'white' : '#555',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '12px',
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    {opt.option_label}
                                                                </div>
                                                                <div style={{ fontSize: '14px', color: '#333' }}>
                                                                    {opt.option_text}
                                                                </div>
                                                                {opt.is_correct && (
                                                                    <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#4caf50', fontWeight: '600' }}>
                                                                        Correct Answer
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Explanation */}
                                        {item.questions?.explanation && (
                                            <div style={{ backgroundColor: '#fff8e1', padding: '12px', borderRadius: '4px', border: '1px solid #ffecb3' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#f57c00', marginBottom: '4px' }}>EXPLANATION</div>
                                                <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.5' }}>
                                                    {item.questions.explanation}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add Questions Modal */}
            {showAddModal && (
                <AddQuestionsModal
                    folderId={id}
                    existingQuestionIds={folderQuestions.map(q => q.question_id)}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadFolderQuestions();
                    }}
                />
            )}
        </div>
    );
};

const AddQuestionsModal = ({ folderId, existingQuestionIds, onClose, onSuccess }) => {
    const { questions, fetchQuestions, totalCount } = useQuestions();
    const { addQuestionToFolder } = useQuestionFolders();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [adding, setAdding] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchQuestions({ page, perPage: 50, search: searchTerm });
    }, [page, searchTerm]);

    const handleAdd = async () => {
        setAdding(true);
        for (const qId of selectedIds) {
            await addQuestionToFolder(qId, folderId);
        }
        setAdding(false);
        onSuccess();
    };

    // Filter out already added questions
    const availableQuestions = questions.filter(q => !existingQuestionIds.includes(q.id));

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '24px',
                    width: '90%',
                    maxWidth: '800px',
                    height: '80vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>Add Questions to Folder</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <input
                        type="text"
                        placeholder="Search questions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px', marginBottom: '16px' }}>
                    {availableQuestions.map(question => (
                        <label
                            key={question.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '12px',
                                borderBottom: '1px solid #f5f5f5',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#f9f9f9'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(question.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedIds([...selectedIds, question.id]);
                                    } else {
                                        setSelectedIds(selectedIds.filter(id => id !== question.id));
                                    }
                                }}
                                style={{ marginTop: '4px' }}
                            />
                            <div>
                                <div style={{ fontSize: '14px', marginBottom: '4px' }}>{question.question_text}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{question.question_type}</div>
                            </div>
                        </label>
                    ))}
                    {availableQuestions.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            No questions found.
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                        {selectedIds.length} questions selected
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                border: '1px solid #ddd',
                                background: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={selectedIds.length === 0 || adding}
                            className="btn btn-success"
                            style={{ padding: '10px 20px' }}
                        >
                            {adding ? 'Adding...' : 'Add Selected'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FolderQuestions;
