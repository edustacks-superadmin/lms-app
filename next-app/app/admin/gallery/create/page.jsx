'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInstitute } from '../../../../context/InstituteContext';
import { supabase } from '../../../../supabaseClient';
import { uploadImage } from '../../../../app/actions/images';
import { ChevronLeft, Upload, Link as LinkIcon, Save, AlertCircle, Image as ImageIcon, Video } from 'lucide-react';

export default function CreateGalleryItemPage() {
    const router = useRouter();
    const { institute } = useInstitute();

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('image'); // 'image' or 'video'
    const [url, setUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [file, setFile] = useState(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const uploadFile = async () => {
        if (!file) return null;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'gallery');

            const result = await uploadImage(formData);

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            return result.url;
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

        setLoading(true);
        setError('');

        try {
            let finalUrl = url;

            if (type === 'image' && file) {
                finalUrl = await uploadFile();
            } else if (type === 'image' && !finalUrl) {
                throw new Error('Please select an image to upload');
            } else if (type === 'video' && !finalUrl) {
                throw new Error('Please enter a video URL');
            }

            const res = await fetch('/api/admin/gallery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    type,
                    url: finalUrl,
                    thumbnail_url: thumbnailUrl,
                    is_active: true
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create item');
            }

            router.push('/admin/gallery');

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
                    <ChevronLeft size={16} /> Back to Gallery
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Add Gallery Item</h1>
                        <p className="text-sm text-slate-500 mt-1">Upload photos or add video links.</p>
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
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            placeholder="e.g. Annual Sports Day"
                            required
                        />
                    </div>

                    {/* Type Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Item Type
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setType('image')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${type === 'image' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <ImageIcon size={16} /> Photo
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('video')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${type === 'video' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Video size={16} /> Video
                            </button>
                        </div>
                    </div>

                    {/* File/Link Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            {type === 'image' ? 'Upload Photo' : 'Video URL'}
                        </label>

                        {type === 'image' ? (
                            <div className={`
                                border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative group
                                ${file ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                            `}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <>
                                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                                            <ImageIcon size={24} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">{file.name}</p>
                                        <p className="text-xs text-slate-500 mt-1">Click to replace</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                            <Upload size={24} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">Click to upload photo</p>
                                        <p className="text-xs text-slate-500 mt-1">JPG, PNG (Max 5MB)</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        <LinkIcon size={18} />
                                    </div>
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="https://youtube.com/watch?v=..."
                                    />
                                </div>
                                {/* Thumbnail URL for Video */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Thumbnail URL <span className="text-slate-400 font-normal normal-case">(Optional)</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={thumbnailUrl}
                                        onChange={(e) => setThumbnailUrl(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="https://example.com/thumbnail.jpg"
                                    />
                                </div>
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
                            placeholder="Brief description..."
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
                                    Save Item
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
