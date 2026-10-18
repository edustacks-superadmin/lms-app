'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Correct hook for App Router params? Actually useParams is from next/navigation
import { ChevronLeft, Save } from 'lucide-react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('../../../../../components/RichTextEditor'), { ssr: false });

export default function EditPage() {
    const router = useRouter();
    const params = useParams(); // useParams returns the params object
    const { id } = params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        is_published: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/admin/pages/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setFormData({
                        title: data.title,
                        slug: data.slug,
                        content: data.content || '',
                        is_published: data.is_published
                    });
                } else {
                    alert('Failed to fetch page data');
                }
            } catch (error) {
                console.error('Error fetching page:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch(`/api/admin/pages/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                router.push('/admin/pages');
                router.refresh();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update page');
            }
        } catch (error) {
            console.error('Error updating page:', error);
            alert('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="max-w-[95%] mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Edit Page</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Page Title
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                URL Slug
                            </label>
                            <div className="flex items-center">
                                <span className="text-gray-500 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-3 py-2 text-sm">
                                    /
                                </span>
                                <input
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Content
                        </label>
                        <div className="prose-editor min-h-[400px]">
                            <RichTextEditor
                                value={formData.content}
                                onChange={(content) => setFormData({ ...formData, content })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_published"
                            checked={formData.is_published}
                            onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                            className="w-4 h-4 text-[var(--primary-color)] border-gray-300 rounded focus:ring-[var(--primary-color)]"
                        />
                        <label htmlFor="is_published" className="text-sm font-medium text-gray-700">
                            Publish immediately
                        </label>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 flex justify-end gap-3 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-[var(--primary-color)] text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : (
                            <>
                                <Save size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
