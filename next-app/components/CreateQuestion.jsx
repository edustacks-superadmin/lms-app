'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, X, Save, CheckCircle, Eye, Code, Tag } from 'lucide-react';
import { useQuestions } from '../context/QuestionContext';
import { useSubjects } from '../context/SubjectContext';
import { useQuestionFolders } from '../context/QuestionFolderContext';
import MathText from './MathText';
import RichTextEditor from './RichTextEditor';
import TagSelector from './TagSelector';
import { useTags } from '../context/TagContext';

const CreateQuestion = ({ questionId }) => {
    const params = useParams();
    const id = questionId || params?.id;
    const router = useRouter();
    const searchParams = useSearchParams();
    const folderId = searchParams.get('folderId');

    const { addQuestion, updateQuestion, fetchQuestionById, questions, fetchQuestions } = useQuestions();
    const { subjects, fetchSubjects } = useSubjects();
    const { folders, fetchFolders, addQuestionToFolder, removeQuestionFromFolder, getQuestionUsage } = useQuestionFolders();
    const { tags: allTags, fetchTags: fetchSystemTags } = useTags();

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


    useEffect(() => {
        fetchSubjects();
        fetchFolders();
        fetchSystemTags();
    }, []);

    useEffect(() => {
        if (folderId && folders.length > 0) {
            setSelectedFolders([folderId]);
        }
    }, [folderId, folders]);

    useEffect(() => {
        const loadQuestionData = async () => {
            if (id) {
                setLoading(true);
                const result = await fetchQuestionById(id);
                if (result.success && result.data) {
                    const question = result.data;
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
                            is_correct: opt.is_correct,
                            id: opt.id
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
                setLoading(false);
            }
        };
        loadQuestionData();
    }, [id]);

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
                router.push(`/questions/folders/${folderId}`);
            } else {
                router.push('/questions');
            }
        } else {
            setError(result.error);
        }

        setSubmitting(false);
    };

    if (loading) {
        return <div className="p-10 text-center text-gray-500">Loading question...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto p-6 pb-20">
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors bg-transparent border-none cursor-pointer"
                >
                    <ArrowLeft size={20} /> Back
                </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 m-0">
                    {id ? 'Edit Question' : 'Add New Question'}
                </h1>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Save size={18} />
                    {submitting ? 'Saving...' : 'Save Question'}
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8">
                    {error && (
                        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm flex items-center gap-2">
                            <X size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Question Text */}
                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Question Text *
                            </label>
                            <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <RichTextEditor
                                    value={formData.question_text}
                                    onChange={(content) => setFormData({ ...formData, question_text: content })}
                                    placeholder="Enter your question here..."
                                    height="150px"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Question Type */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Question Type
                                </label>
                                <select
                                    className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={formData.question_type}
                                    onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                                >
                                    <option value="MCQ, Single Correct Question">MCQ, Single Correct Question</option>
                                    <option value="MCQ, Multiple Correct Questions">MCQ, Multiple Correct Questions</option>
                                </select>
                            </div>

                            {/* Difficulty Level */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Difficulty Level
                                </label>
                                <select
                                    className="w-full p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                        <div className="mb-10">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Subject
                            </label>
                            <select
                                className="w-full md:w-1/2 p-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                        <div className="mb-10 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                            <label className="block text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
                                Answer Options <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">Click circle to mark correct</span>
                            </label>

                            <div className="space-y-4">
                                {options.map((option, index) => (
                                    <div key={index} className="group">
                                        <div className="flex gap-4 items-start">
                                            <button
                                                type="button"
                                                className={`
                                                    w-10 h-10 min-w-[2.5rem] rounded-full flex items-center justify-center font-bold text-lg transition-all shadow-sm
                                                    ${option.is_correct
                                                        ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-500 ring-offset-2'
                                                        : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300 hover:text-gray-600'}
                                                `}
                                                onClick={() => handleOptionChange(index, 'is_correct', !option.is_correct)}
                                                title="Click to mark as correct"
                                            >
                                                {option.option_label.toUpperCase()}
                                            </button>

                                            <div className="flex-1 border border-gray-200 rounded-lg bg-white overflow-hidden group-focus-within:ring-2 group-focus-within:ring-blue-500/20 group-focus-within:border-blue-500 transition-all">
                                                <RichTextEditor
                                                    value={option.option_text}
                                                    onChange={(content) => handleOptionChange(index, 'option_text', content)}
                                                    placeholder={`Option ${option.option_label.toUpperCase()}`}
                                                    height="60px"
                                                />
                                            </div>

                                            <div className="w-8 flex justify-center pt-2">
                                                {option.is_correct && (
                                                    <CheckCircle className="text-emerald-500 animate-in fade-in zoom-in duration-200" size={24} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Explanation */}
                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Explanation (Optional)
                            </label>
                            <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <RichTextEditor
                                    value={formData.explanation}
                                    onChange={(content) => setFormData({ ...formData, explanation: content })}
                                    placeholder="Explain why the answer is correct..."
                                    height="100px"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Tags
                                </label>

                                <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                                        Select from System Tags
                                    </label>
                                    <TagSelector
                                        type="question"
                                        showSelected={false}
                                        selectedTags={allTags && tags ? tags.map(tName => allTags.find(t => t.name === tName)?.id).filter(id => id !== undefined) : []}
                                        onChange={(newIds) => {
                                            const selectedNames = newIds.map(id => allTags.find(t => t.id === id)?.name).filter(Boolean);
                                            const currentCustomTags = tags.filter(tName => !allTags.some(t => t.name === tName));
                                            setTags([...currentCustomTags, ...selectedNames]);
                                        }}
                                    />
                                </div>

                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="Add a tag..."
                                        className="flex-1 p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        className="px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200"
                                        >
                                            <Tag size={12} className="text-gray-400" />
                                            {tag}
                                            <X
                                                size={14}
                                                className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                                                onClick={() => removeTag(tag)}
                                            />
                                        </span>
                                    ))}
                                    {tags.length === 0 && <span className="text-gray-400 text-sm italic">No tags added</span>}
                                </div>
                            </div>

                            {/* Folders */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Add to Folders
                                </label>
                                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-gray-50/50 p-2">
                                    {folders.length === 0 ? (
                                        <div className="text-sm text-gray-400 text-center py-4">
                                            No folders available.
                                        </div>
                                    ) : (
                                        folders.map(folder => (
                                            <label
                                                key={folder.id}
                                                className="flex items-center gap-3 p-2 rounded-md hover:bg-white hover:shadow-sm cursor-pointer transition-all mb-1 last:mb-0"
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
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{folder.name}</span>
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
