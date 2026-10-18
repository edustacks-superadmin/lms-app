'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Save, Upload, X } from 'lucide-react';
import { uploadImage } from '../../../../../app/actions/images';

export default function EditTeamMember() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false); // To track saving state specifically
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        bio: '',
        photo_url: '',
        display_order: 0,
        is_active: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/admin/team/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setFormData({
                        name: data.name,
                        role: data.role,
                        bio: data.bio || '',
                        photo_url: data.photo_url || '',
                        display_order: data.display_order || 0,
                        is_active: data.is_active
                    });
                    if (data.photo_url) {
                        setPreviewUrl(data.photo_url);
                    }
                } else {
                    alert('Failed to fetch team member data');
                }
            } catch (error) {
                console.error('Error fetching team member:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'team');

            const result = await uploadImage(formData);
            if (result.success) {
                setFormData(prev => ({ ...prev, photo_url: result.url }));
                setPreviewUrl(result.url);
            } else {
                alert('Failed to upload image: ' + result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('An error occurred during upload');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        setFormData(prev => ({ ...prev, photo_url: '' }));
        setPreviewUrl('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch(`/api/admin/team/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                router.push('/admin/team');
                router.refresh();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update team member');
            }
        } catch (error) {
            console.error('Error updating team member:', error);
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
                <h1 className="text-2xl font-bold text-gray-900">Edit Team Member</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Image Upload */}
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Profile Photo
                            </label>
                            <div className={`relative aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 overflow-hidden ${!previewUrl ? 'hover:bg-gray-100' : ''} transition-colors`}>
                                {previewUrl ? (
                                    <>
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center p-6 text-center w-full h-full justify-center">
                                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                                            <Upload size={24} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">
                                            {uploading ? 'Uploading...' : 'Click to upload photo'}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-1">
                                            JPG, PNG or WEBP
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Role / Designation
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Display Order
                                </label>
                                <input
                                    type="number"
                                    value={formData.display_order}
                                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bio (Optional)
                                </label>
                                <textarea
                                    rows={4}
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-[var(--primary-color)] border-gray-300 rounded focus:ring-[var(--primary-color)]"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                    Active (Visible to public)
                                </label>
                            </div>
                        </div>
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
                        disabled={saving || uploading}
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
