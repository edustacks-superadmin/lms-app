import React, { useState, useEffect } from 'react';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import { X } from 'lucide-react';
import MathText from './MathText';

const FolderQuestionSelector = ({ onQuestionsSelected, onClose }) => {
    const { folders, fetchFolders, getFolderQuestions } = useQuestionFolders();
    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [folderQuestions, setFolderQuestions] = useState([]);
    const [rangeInput, setRangeInput] = useState('');
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchFolders();
    }, []);

    useEffect(() => {
        if (selectedFolderId) {
            loadFolderQuestions();
        }
    }, [selectedFolderId]);

    const loadFolderQuestions = async () => {
        const result = await getFolderQuestions(selectedFolderId);
        if (result.success) {
            setFolderQuestions(result.data);
        }
    };

    const parseRange = (rangeStr) => {
        const numbers = new Set();
        const parts = rangeStr.split(',').map(p => p.trim());

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (isNaN(start) || isNaN(end) || start > end) {
                    throw new Error(`Invalid range: ${part}`);
                }
                for (let i = start; i <= end; i++) {
                    numbers.add(i);
                }
            } else {
                const num = parseInt(part);
                if (isNaN(num)) {
                    throw new Error(`Invalid number: ${part}`);
                }
                numbers.add(num);
            }
        }

        return Array.from(numbers).sort((a, b) => a - b);
    };

    const handlePreview = () => {
        setError('');
        setSelectedQuestions([]);

        if (!selectedFolderId) {
            setError('Please select a folder');
            return;
        }

        if (!rangeInput.trim()) {
            setError('Please enter question numbers');
            return;
        }

        try {
            const positions = parseRange(rangeInput);
            const maxPosition = Math.max(...folderQuestions.map(q => q.position));

            // Check if any position is out of range
            const outOfRange = positions.filter(p => p < 1 || p > maxPosition);
            if (outOfRange.length > 0) {
                setError(`Questions ${outOfRange.join(', ')} are out of range (1-${maxPosition})`);
                return;
            }

            // Get questions by position
            const selected = positions
                .map(pos => folderQuestions.find(q => q.position === pos))
                .filter(q => q !== undefined);

            setSelectedQuestions(selected);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddToExam = () => {
        let questionsToAdd = [];

        // If questions are already selected via preview, use them
        if (selectedQuestions.length > 0) {
            questionsToAdd = selectedQuestions;
        }
        // If range input is provided, parse and select
        else if (rangeInput.trim()) {
            try {
                const positions = parseRange(rangeInput);
                const maxPosition = Math.max(...folderQuestions.map(q => q.position));

                // Check if any position is out of range
                const outOfRange = positions.filter(p => p < 1 || p > maxPosition);
                if (outOfRange.length > 0) {
                    setError(`Questions ${outOfRange.join(', ')} are out of range (1-${maxPosition})`);
                    return;
                }

                questionsToAdd = positions
                    .map(pos => folderQuestions.find(q => q.position === pos))
                    .filter(q => q !== undefined);
            } catch (err) {
                setError(err.message);
                return;
            }
        }
        // If no range input, select ALL
        else {
            questionsToAdd = folderQuestions;
        }

        if (questionsToAdd.length === 0) {
            setError('No questions found to add');
            return;
        }

        // Return the full question objects
        onQuestionsSelected(questionsToAdd.map(item => item.questions));
        onClose();
    };

    const selectedFolder = folders.find(f => f.id === selectedFolderId);

    const getButtonText = () => {
        if (selectedQuestions.length > 0) {
            return `Add ${selectedQuestions.length} Selected Question${selectedQuestions.length !== 1 ? 's' : ''}`;
        }
        if (rangeInput.trim()) {
            return 'Add Specified Questions';
        }
        return `Add All ${folderQuestions.length} Questions`;
    };

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
                    maxWidth: '700px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>Select Questions from Folder</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div style={{ padding: '10px', marginBottom: '16px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '14px' }}>
                        {error}
                    </div>
                )}

                {/* Folder Selection */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                        Select Folder
                    </label>
                    <select
                        value={selectedFolderId}
                        onChange={(e) => setSelectedFolderId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    >
                        <option value="">Choose a folder...</option>
                        {folders.map(folder => (
                            <option key={folder.id} value={folder.id}>
                                {folder.name} ({folder.questionCount} questions)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Range Input */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                        Question Numbers (Optional)
                    </label>
                    <input
                        type="text"
                        value={rangeInput}
                        onChange={(e) => {
                            setRangeInput(e.target.value);
                            // Clear preview if input changes
                            if (selectedQuestions.length > 0) setSelectedQuestions([]);
                        }}
                        placeholder="Leave empty to add all questions"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Leave empty to add all questions, or enter specific numbers (e.g., "1-5, 8, 10")
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
                        onClick={handleAddToExam}
                        disabled={!selectedFolderId}
                        className="btn btn-success"
                        style={{ padding: '10px 20px' }}
                    >
                        {getButtonText()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FolderQuestionSelector;
