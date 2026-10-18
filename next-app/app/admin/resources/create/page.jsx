'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInstitute } from '../../../../context/InstituteContext';
import { supabase } from '../../../../supabaseClient';
import { ChevronLeft, Upload, Link as LinkIcon, Save, Settings, AlertCircle, FileText, Plus as PlusIcon, X as XIcon } from 'lucide-react';
import Link from 'next/link';
import ResourceSettingsModal from '../../../../components/ResourceSettingsModal';

export default function CreateResourcePage() {
    const router = useRouter();
    const { institute } = useInstitute();

    // Form State
    const [title, setTitle] = useState('');
    const [examName, setExamName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Syllabus');
    const [resourceType, setResourceType] = useState('file'); // 'file' or 'link'
    const [fileUrl, setFileUrl] = useState('');
    const [file, setFile] = useState(null);

    // Structured Metadata for Syllabus
    const [posts, setPosts] = useState([{ name: '', code: '', dept: '' }]);
    const [paper, setPaper] = useState('');
    const [standard, setStandard] = useState('');
    const [subjectCode, setSubjectCode] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Hardcoded categories as per schema
    const categories = ['Syllabus', 'Previous Year Papers', 'Notification', 'Other'];

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const addPostRow = () => {
        setPosts([...posts, { name: '', code: '', dept: '' }]);
    };

    const removePostRow = (index) => {
        if (posts.length > 1) {
            setPosts(posts.filter((_, i) => i !== index));
        }
    };

    const updatePostField = (index, field, value) => {
        const newPosts = [...posts];
        newPosts[index][field] = value;
        setPosts(newPosts);
    };

    const uploadFile = async () => {
        if (!file) return null;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `resources/${fileName}`;

        try {
            setUploading(true);
            const { data, error } = await supabase.storage
                .from('public') // Assuming 'public' bucket exists and is public
                .upload(filePath, file);

            if (error) throw error;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('public')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err) {
            console.error('Upload Error:', err);
            throw new Error('Failed to upload file. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title) {
            setError('Title is required');
            return;
        }
        if (!institute?.id) {
            setError('Institute context missing');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let finalUrl = fileUrl;

            // Handle File Upload if selected
            if (resourceType === 'file' && file) {
                finalUrl = await uploadFile();
            } else if (resourceType === 'file' && !file) {
                // If no file selected but type is file, maybe error?
                // For now required
                if (!finalUrl) { // if not already set (e.g. edit mode, but this is create)
                    throw new Error('Please select a file to upload');
                }
            }

            const res = await fetch('/api/admin/resources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    category,
                    resource_type: resourceType,
                    file_url: finalUrl,
                    institute_id: institute.id,
                    is_active: true,
                    exam_name: examName,
                    metadata: category === 'Syllabus' ? {
                        posts: posts.filter(p => p.name.trim() !== ''),
                        paper: paper,
                        standard: standard,
                        subject_code: subjectCode
                    } : null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create resource');
            }

            router.push('/admin/resources');

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
                >
                    <ChevronLeft size={16} /> Back to Resources
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Add New Resource</h1>
                        <p className="text-sm text-slate-500 mt-1">Upload files or add links for students.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3">
                            <AlertCircle size={20} className="shrink-0" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Resource Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            placeholder="e.g. UPSC Syllabus 2025"
                            required
                        />
                    </div>

                    {/* Exam Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Exam / Board Name <span className="text-slate-400 font-normal normal-case">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            value={examName}
                            onChange={(e) => setExamName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            placeholder="e.g. TNPSC, RRB, SSC"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Category */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Category
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                >
                                    <Settings size={10} /> Customize Labels
                                </button>
                            </div>
                            <div className="relative">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:bg-white"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDownIcon />
                                </div>
                            </div>
                        </div>

                        {/* Resource Type */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Resource Type
                            </label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setResourceType('file')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${resourceType === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Upload size={16} /> File Upload
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setResourceType('link')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${resourceType === 'link' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <LinkIcon size={16} /> External Link
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Structured Syllabus Fields */}
                    {category === 'Syllabus' && (
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <FileText size={18} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Syllabus Details</h3>
                                </div>
                            </div>

                            {/* Multiple Associated Posts */}
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Associated Posts & Departments</label>
                                {posts.map((post, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                                        <div className="md:col-span-4">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Post Name</label>
                                            <input
                                                type="text"
                                                value={post.name}
                                                onChange={(e) => updatePostField(index, 'name', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:bg-white"
                                                placeholder="e.g. Assistant Engineer"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Post Code</label>
                                            <input
                                                type="text"
                                                value={post.code}
                                                onChange={(e) => updatePostField(index, 'code', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:bg-white"
                                                placeholder="1611"
                                            />
                                        </div>
                                        <div className="md:col-span-5">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Department / Organization</label>
                                            <input
                                                type="text"
                                                value={post.dept}
                                                onChange={(e) => updatePostField(index, 'dept', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm transition-all focus:bg-white"
                                                placeholder="e.g. Highways Department"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex justify-center pb-0.5">
                                            <button
                                                type="button"
                                                onClick={() => removePostRow(index)}
                                                disabled={posts.length === 1}
                                                className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                                            >
                                                <XIcon size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addPostRow}
                                    className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-lg transition-all"
                                >
                                    <PlusIcon size={14} /> Add Another Post Association
                                </button>
                            </div>

                            <div className="h-px bg-slate-200 my-2" />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Paper / Subject Name</label>
                                    <input
                                        type="text"
                                        value={paper}
                                        onChange={(e) => setPaper(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        placeholder="e.g. Civil Engineering"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Standard</label>
                                    <input
                                        type="text"
                                        value={standard}
                                        onChange={(e) => setStandard(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        placeholder="e.g. Degree Std."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Subject Code</label>
                                    <input
                                        type="text"
                                        value={subjectCode}
                                        onChange={(e) => setSubjectCode(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        placeholder="e.g. 443"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File Upload / Link Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            {resourceType === 'file' ? 'Upload Document' : 'Resource URL'}
                        </label>

                        {resourceType === 'file' ? (
                            <div className={`
                                border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative group
                                ${file ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                            `}>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <>
                                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                                            <FileText size={24} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">{file.name}</p>
                                        <p className="text-xs text-slate-500 mt-1">Click to replace</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">Click to upload file</p>
                                        <p className="text-xs text-slate-500 mt-1">PDF, DOCX, ZIP (Max 50MB)</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <LinkIcon size={18} />
                                </div>
                                <input
                                    type="url"
                                    value={fileUrl}
                                    onChange={(e) => setFileUrl(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="https://example.com/resource"
                                />
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Description <span className="text-slate-400 font-normal normal-case">(Optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none placeholder:text-slate-400"
                            placeholder="Brief description of the resource..."
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 flex items-center justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uploading}
                            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {(loading || uploading) ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {uploading ? 'Uploading...' : 'Saving...'}
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Create Resource
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <ResourceSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
}

// Helper icon
const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
    </svg>
);
