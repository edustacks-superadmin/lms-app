import React, { useState, useEffect } from 'react';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import { X, Search, ChevronDown, Check } from 'lucide-react';
import MathText from './MathText';

const FolderQuestionSelector = ({ onQuestionsSelected, onClose }) => {
    const { folders, fetchFolders, getFolderQuestions } = useQuestionFolders();
    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [folderQuestions, setFolderQuestions] = useState([]);
    const [rangeInput, setRangeInput] = useState('');
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchFolders(1, '', 1000);
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

    const filteredFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg p-6 w-[90%] max-w-[700px] max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-5">
                    <h2 className="m-0 text-xl">Select Questions from Folder</h2>
                    <button onClick={onClose} className="bg-transparent border-none cursor-pointer">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="p-2.5 mb-4 bg-red-50 text-red-800 rounded text-sm">
                        {error}
                    </div>
                )}

                {/* Folder Selection */}
                <div className="mb-4 relative">
                    <label className="block mb-2 font-medium text-sm">
                        Select Folder
                    </label>
                    <div className="relative">
                        <div
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-full p-2.5 border border-gray-300 rounded text-sm bg-white flex justify-between items-center cursor-pointer hover:border-blue-500 transition-colors"
                        >
                            <span className={selectedFolder ? "text-gray-900" : "text-gray-500"}>
                                {selectedFolder ? `${selectedFolder.name} (${selectedFolder.questionCount} questions)` : "Choose a folder..."}
                            </span>
                            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1010] flex flex-col max-h-[300px]">
                                <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search folders..."
                                            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1 py-1">
                                    {filteredFolders.length > 0 ? (
                                        filteredFolders.map(folder => (
                                            <div
                                                key={folder.id}
                                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex justify-between items-center ${selectedFolderId === folder.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                                                onClick={() => {
                                                    setSelectedFolderId(folder.id);
                                                    setIsOpen(false);
                                                    setSearchTerm('');
                                                }}
                                            >
                                                <span>{folder.name} ({folder.questionCount})</span>
                                                {selectedFolderId === folder.id && <Check size={14} />}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-4 text-center text-gray-400 text-xs">
                                            No folders found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Click outside to close */}
                    {isOpen && (
                        <div
                            className="fixed inset-0 z-[1005]"
                            onClick={() => setIsOpen(false)}
                        />
                    )}
                </div>

                {/* Range Input */}
                <div className="mb-4">
                    <label className="block mb-2 font-medium text-sm">
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
                        className="w-full p-2.5 border border-gray-300 rounded text-sm"
                    />
                    <div className="text-xs text-gray-600 mt-1">
                        Leave empty to add all questions, or enter specific numbers (e.g., "1-5, 8, 10")
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="py-2.5 px-5 border border-gray-300 bg-white rounded cursor-pointer hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddToExam}
                        disabled={!selectedFolderId}
                        className="btn btn-success py-2.5 px-5"
                    >
                        {getButtonText()}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FolderQuestionSelector;
