'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    MessageSquare, Plus, Trash2, GripVertical, Star,
    AlignLeft, Search, Download, Calendar, Filter, X,
    ChevronDown, Check, Settings, List, BarChart3, Edit2, AlertCircle, Save
} from 'lucide-react';

const TRIGGER_TYPES = [
    { value: 'completion', label: 'On Course Completion', description: 'Request feedback when learners reach a specific course completion percentage.' },
    { value: 'content', label: 'On a Content Completion', description: 'Gather feedback after learners complete a specific content module.' },
    { value: 'scheduled', label: 'Scheduled Availability', description: 'Enable feedback collection during a defined date range.' },
    { value: 'attendance', label: 'Attendance-Based Availability', description: 'Collect feedback once the student has actively learned for a minimum number of days.' },
    { value: 'content_count', label: 'Content Completion Count', description: 'Gather feedback after learners complete a specified number of content modules.' }
];

const QUESTION_TYPES = [
    { value: 'text', label: 'Text Response', icon: AlignLeft },
    { value: 'rating', label: 'Star Rating', icon: Star }
];

const CourseFeedbackPage = () => {
    const router = useRouter();
    const { id } = useParams();

    const [activeTab, setActiveTab] = useState('questions');
    const [form, setForm] = useState(null);
    const [course, setCourse] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Content fetching
    const [contents, setContents] = useState([]);
    const [showContentDropdown, setShowContentDropdown] = useState(false);
    const [fetchedContents, setFetchedContents] = useState(false);
    const [contentSearch, setContentSearch] = useState('');

    // Question modal
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [questionForm, setQuestionForm] = useState({ type: 'text', text: '', required: false });

    // Response filters
    const [searchQuery, setSearchQuery] = useState('');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [responsesPage, setResponsesPage] = useState(1);
    const [totalResponses, setTotalResponses] = useState(0);

    // Fetch contents
    const fetchContents = async () => {
        if (fetchedContents) return;
        try {
            const response = await fetch(`/api/admin/courses/${id}/contents`);
            if (response.ok) {
                const data = await response.json();
                setContents(data.contents || []);
                setFetchedContents(true);
            }
        } catch (error) {
            console.error('Error fetching contents:', error);
        }
    };

    // Fetch feedback form
    const fetchFeedbackForm = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/courses/${id}/feedback`);
            if (response.ok) {
                const data = await response.json();
                setForm(data.form);
                setCourse(data.course);
                setQuestions(data.form?.feedback_questions || []);
            }
        } catch (error) {
            console.error('Error fetching feedback form:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch responses
    const fetchResponses = async () => {
        try {
            const params = new URLSearchParams({
                page: responsesPage.toString(),
                limit: '20',
                search: searchQuery,
                rating: ratingFilter
            });
            const response = await fetch(`/api/admin/courses/${id}/feedback/responses?${params}`);
            if (response.ok) {
                const data = await response.json();
                setResponses(data.responses || []);
                setTotalResponses(data.total || 0);
            }
        } catch (error) {
            console.error('Error fetching responses:', error);
        }
    };

    useEffect(() => {
        if (id) fetchFeedbackForm();
    }, [id]);

    useEffect(() => {
        if (id && activeTab === 'responses') fetchResponses();
        if (id && activeTab === 'settings') fetchContents();
    }, [id, activeTab, responsesPage, searchQuery, ratingFilter]);

    // Toggle enabled
    const handleToggleEnabled = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/admin/courses/${id}/feedback`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_enabled: !form.is_enabled })
            });
            if (response.ok) {
                const data = await response.json();
                setForm({ ...form, ...data.form });
            }
        } catch (error) {
            console.error('Error toggling feedback:', error);
        } finally {
            setSaving(false);
        }
    };

    // Update trigger settings
    const handleUpdateSettings = async (updates) => {
        setSaving(true);
        try {
            const response = await fetch(`/api/admin/courses/${id}/feedback`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (response.ok) {
                const data = await response.json();
                setForm({ ...form, ...data.form });
            }
        } catch (error) {
            console.error('Error updating settings:', error);
        } finally {
            setSaving(false);
        }
    };

    // Add/Edit question
    const handleSaveQuestion = async () => {
        if (!questionForm.text.trim()) return;

        setSaving(true);
        try {
            const url = editingQuestion
                ? `/api/admin/courses/${id}/feedback/questions`
                : `/api/admin/courses/${id}/feedback/questions`;

            const method = editingQuestion ? 'PUT' : 'POST';
            const body = editingQuestion
                ? { question_id: editingQuestion.id, question_type: questionForm.type, question_text: questionForm.text, is_required: questionForm.required }
                : { question_type: questionForm.type, question_text: questionForm.text, is_required: questionForm.required };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const data = await response.json();
                if (editingQuestion) {
                    setQuestions(questions.map(q => q.id === editingQuestion.id ? data.question : q));
                } else {
                    setQuestions([...questions, data.question]);
                }
            }
            setShowQuestionModal(false);
            setEditingQuestion(null);
            setQuestionForm({ type: 'text', text: '', required: false });
        } catch (error) {
            console.error('Error saving question:', error);
        } finally {
            setSaving(false);
        }
    };

    // Delete question
    const handleDeleteQuestion = async (questionId) => {
        if (!confirm('Delete this question?')) return;

        try {
            const response = await fetch(`/api/admin/courses/${id}/feedback/questions?question_id=${questionId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setQuestions(questions.filter(q => q.id !== questionId));
            }
        } catch (error) {
            console.error('Error deleting question:', error);
        }
    };

    const openEditQuestion = (question) => {
        setEditingQuestion(question);
        setQuestionForm({
            type: question.question_type,
            text: question.question_text,
            required: question.is_required
        });
        setShowQuestionModal(true);
    };

    const renderStars = (rating) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                        key={i}
                        size={14}
                        className={i <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
        );
    }

    const filteredContents = contents.filter(c => c.title.toLowerCase().includes(contentSearch.toLowerCase()));

    return (
        <div className="w-full max-w-6xl mx-auto pb-20 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                        <span onClick={() => router.push('/courses')} className="hover:text-blue-600 cursor-pointer transition-colors">Courses</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900 font-medium">{course?.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <MessageSquare className="text-blue-600" size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Feedback Form</h1>
                    </div>
                    <p className="text-slate-500 mt-1 ml-12">Configure and manage student feedback for this course.</p>
                </div>
            </div>

            {/* Enable Toggle Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
                <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">Enable Feedback Collection</h3>
                    <p className="text-sm text-slate-500 max-w-xl">
                        When enabled, students will be prompted to submit feedback based on the trigger settings below.
                        Disabling this will pause all feedback collection.
                    </p>
                </div>
                <button
                    onClick={handleToggleEnabled}
                    disabled={saving}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                        ${form?.is_enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                    <span
                        className={`absolute top-0.5 left-0.5 block w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 
                        ${form?.is_enabled ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex gap-6">
                    {[
                        { id: 'questions', label: 'Questions', icon: List },
                        { id: 'settings', label: 'Trigger Settings', icon: Settings },
                        { id: 'responses', label: 'Responses', icon: BarChart3 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 pb-4 pt-2 text-sm font-medium border-b-2 transition-colors
                                ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {/* QUESTIONS TAB */}
                {activeTab === 'questions' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-semibold text-slate-800">Form Questions</h3>
                                <p className="text-xs text-slate-500 mt-1">Customize the questions students will answer.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingQuestion(null);
                                    setQuestionForm({ type: 'text', text: '', required: false });
                                    setShowQuestionModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                            >
                                <Plus size={16} /> Add Question
                            </button>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {questions.length === 0 ? (
                                <div className="py-16 text-center text-slate-500">
                                    <MessageSquare size={48} className="mx-auto text-slate-300 mb-3" />
                                    <p className="font-medium">No questions yet</p>
                                    <p className="text-sm">Add questions to start collecting feedback.</p>
                                </div>
                            ) : (
                                questions.map((q, idx) => (
                                    <div key={q.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors group">
                                        <div className="mt-1 text-slate-300 cursor-grab active:cursor-grabbing">
                                            <GripVertical size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
                                                {q.is_required && <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-medium">Required</span>}
                                                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium capitalize flex items-center gap-1">
                                                    {q.question_type === 'rating' ? <Star size={10} /> : <AlignLeft size={10} />}
                                                    {q.question_type}
                                                </span>
                                            </div>
                                            <p className="text-slate-900 font-medium">{q.question_text}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEditQuestion(q)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h3 className="font-semibold text-slate-900 mb-4">When should feedback be requested?</h3>
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-6 flex gap-3 items-start border border-blue-100">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <p>Choose a trigger condition to determine when the feedback modal appears for students. Only one trigger type can be active at a time.</p>
                            </div>

                            <div className="space-y-4">
                                {TRIGGER_TYPES.map(type => (
                                    <div
                                        key={type.value}
                                        onClick={() => handleUpdateSettings({ trigger_type: type.value })}
                                        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex gap-4
                                            ${form?.trigger_type === type.value
                                                ? 'border-blue-600 bg-blue-50/30'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center
                                            ${form?.trigger_type === type.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                                            {form?.trigger_type === type.value && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <div>
                                            <h4 className={`font-semibold ${form?.trigger_type === type.value ? 'text-blue-900' : 'text-slate-900'}`}>
                                                {type.label}
                                            </h4>
                                            <p className="text-sm text-slate-500 mt-1">{type.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trigger Specific Settings */}
                        {form?.trigger_type === 'completion' && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in fade-in slide-in-from-top-4">
                                <h3 className="font-semibold text-slate-900 mb-4">Completion Threshold</h3>
                                <div className="max-w-xs">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Percentage (%)</label>
                                    <input
                                        type="number"
                                        min="0" max="100"
                                        value={form.trigger_config?.min_percentage || ''}
                                        onChange={(e) => handleUpdateSettings({ trigger_config: { ...form.trigger_config, min_percentage: e.target.value } })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        placeholder="e.g. 100"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Feedback will appear when the learner completes this percentage of the course.</p>
                                </div>
                            </div>
                        )}

                        {form?.trigger_type === 'scheduled' && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in fade-in slide-in-from-top-4">
                                <h3 className="font-semibold text-slate-900 mb-4">Availability Window</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
                                        <input
                                            type="date"
                                            value={form.trigger_config?.start_date || ''}
                                            onChange={(e) => handleUpdateSettings({ trigger_config: { ...form.trigger_config, start_date: e.target.value } })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
                                        <input
                                            type="date"
                                            value={form.trigger_config?.end_date || ''}
                                            onChange={(e) => handleUpdateSettings({ trigger_config: { ...form.trigger_config, end_date: e.target.value } })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Feedback form will only be accessible during this period.</p>
                            </div>
                        )}

                        {form?.trigger_type === 'attendance' && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in fade-in slide-in-from-top-4">
                                <h3 className="font-semibold text-slate-900 mb-4">Attendance Requirement</h3>
                                <div className="max-w-xs">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Minimum Days Active</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.trigger_config?.min_days || ''}
                                        onChange={(e) => handleUpdateSettings({ trigger_config: { ...form.trigger_config, min_days: e.target.value } })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        placeholder="e.g. 7"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Feedback will appear after the student has accessed the course for this many distinct days.</p>
                                </div>
                            </div>
                        )}

                        {(form?.trigger_type === 'content' || form?.trigger_type === 'content_count') && (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in fade-in slide-in-from-top-4">
                                <h3 className="font-semibold text-slate-900 mb-4">
                                    {form.trigger_type === 'content' ? 'Select Content Item' : 'Content Count'}
                                </h3>

                                {form.trigger_type === 'content_count' ? (
                                    <div className="max-w-xs">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Items</label>
                                        <input
                                            type="number"
                                            value={form.trigger_config?.content_count || ''}
                                            onChange={(e) => handleUpdateSettings({ trigger_config: { ...form.trigger_config, content_count: e.target.value } })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                            placeholder="e.g. 5"
                                        />
                                    </div>
                                ) : (
                                    <div className="relative max-w-md">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Trigger Content</label>
                                        <div
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors"
                                            onClick={() => setShowContentDropdown(!showContentDropdown)}
                                        >
                                            <span className={form.trigger_config?.content_id ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                                                {form.trigger_config?.content_id
                                                    ? (contents.find(c => c.id.toString() === form.trigger_config.content_id)?.title || 'Unknown Content')
                                                    : 'Select a content item...'}
                                            </span>
                                            <ChevronDown size={16} className="text-slate-400" />
                                        </div>

                                        {showContentDropdown && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-10 overflow-hidden">
                                                <div className="p-2 border-b border-slate-100">
                                                    <div className="relative">
                                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-lg text-sm border-none focus:ring-1 focus:ring-blue-500"
                                                            placeholder="Search content..."
                                                            value={contentSearch}
                                                            onChange={(e) => setContentSearch(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto p-1">
                                                    {filteredContents.map(c => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => {
                                                                handleUpdateSettings({ trigger_config: { ...form.trigger_config, content_id: c.id.toString() } });
                                                                setShowContentDropdown(false);
                                                            }}
                                                            className={`px-3 py-2 text-sm rounded-lg cursor-pointer flex items-center justify-between
                                                                ${form.trigger_config?.content_id === c.id.toString() ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                                                        >
                                                            <span className="truncate">{c.title}</span>
                                                            {form.trigger_config?.content_id === c.id.toString() && <Check size={14} />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* RESPONSES TAB */}
                {activeTab === 'responses' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-white">
                            <div className="relative w-full sm:w-72">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search feedback..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-blue-500"
                                    value={ratingFilter}
                                    onChange={(e) => setRatingFilter(e.target.value)}
                                >
                                    <option value="all">All Ratings</option>
                                    <option value="5">5 Stars</option>
                                    <option value="4">4 Stars</option>
                                    <option value="3">3 Stars</option>
                                    <option value="2">2 Stars</option>
                                    <option value="1">1 Star</option>
                                </select>
                                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                                    <Download size={16} /> Export
                                </button>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {responses.length === 0 ? (
                                <div className="py-20 text-center text-slate-500">
                                    <p>No responses found matching your filters.</p>
                                </div>
                            ) : (
                                responses.map((r) => (
                                    <div key={r.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                    {(r.student?.display_name?.[0] || 'U').toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{r.student?.display_name || 'Anonymous'}</div>
                                                    <div className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {/* Calculate average rating if multiple rating questions existed, currently just logic placeholder for display */}
                                            </div>
                                        </div>

                                        <div className="space-y-3 pl-11">
                                            {r.answers?.map((ans, idx) => {
                                                const question = questions.find(q => q.id === ans.question_id);
                                                return (
                                                    <div key={idx} className="text-sm">
                                                        <div className="text-slate-500 text-xs mb-0.5">{question?.question_text || 'Question'}</div>
                                                        {question?.question_type === 'rating' ? (
                                                            renderStars(parseInt(ans.answer_text))
                                                        ) : (
                                                            <div className="text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block min-w-[200px]">
                                                                {ans.answer_text}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Question Modal */}
            {showQuestionModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-900">{editingQuestion ? 'Edit Question' : 'New Question'}</h3>
                            <button onClick={() => setShowQuestionModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Question Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {QUESTION_TYPES.map(type => (
                                        <div
                                            key={type.value}
                                            onClick={() => setQuestionForm({ ...questionForm, type: type.value })}
                                            className={`cursor-pointer p-3 border rounded-xl flex flex-col items-center gap-2 transition-all
                                                ${questionForm.type === type.value
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <type.icon size={20} />
                                            <span className="text-sm font-medium">{type.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Question Text</label>
                                <textarea
                                    value={questionForm.text}
                                    onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm resize-none h-24"
                                    placeholder="e.g. How would you rate the course content?"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="required"
                                    checked={questionForm.required}
                                    onChange={(e) => setQuestionForm({ ...questionForm, required: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="required" className="text-sm text-slate-700 select-none">Mark as required</label>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowQuestionModal(false)} className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                            <button
                                onClick={handleSaveQuestion}
                                disabled={!questionForm.text.trim()}
                                className="px-4 py-2 bg-slate-900 text-white font-medium text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/10"
                            >
                                Save Question
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseFeedbackPage;
