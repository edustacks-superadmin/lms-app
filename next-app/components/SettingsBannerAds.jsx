import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Image as ImageIcon, Save, X, ArrowLeft, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useInstitute } from '../context/InstituteContext';

const SettingsBannerAds = () => {
    const { institute } = useInstitute();
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        link_url: '',
        image_url: '',
        status: 'Active'
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (institute?.id) {
            fetchBanners();
        }
    }, [institute?.id]);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('banner_ads')
                .select('*')
                .eq('institute_id', institute?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBanners(data || []);
        } catch (error) {
            console.error('Error fetching banners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);

        // Upload
        setUploading(true);
        try {
            const { uploadImage, replaceImage } = await import('../app/actions/images');

            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('folder', 'banner-ads');

            let result;
            // If we are replacing an existing image (and it's a remote URL, not a blob preview)
            if (formData.image_url && formData.image_url.startsWith('http')) {
                uploadFormData.append('oldUrl', formData.image_url);
                result = await replaceImage(uploadFormData);
            } else {
                result = await uploadImage(uploadFormData);
            }

            if (!result.success) throw new Error(result.error);

            setFormData(prev => ({ ...prev, image_url: result.url }));
        } catch (error) {
            console.error('Error uploading banner image:', error);
            alert('Error uploading image: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.image_url) {
            alert('Please upload a banner image');
            return;
        }

        setUploading(true);
        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('banner_ads')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('banner_ads')
                    .insert([{ ...formData, institute_id: institute?.id }]);
                if (error) throw error;
            }

            await fetchBanners();
            resetForm();
        } catch (error) {
            console.error('Error saving banner:', error);
            alert('Error saving banner: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (banner) => {
        setFormData({
            title: banner.title,
            link_url: banner.link_url,
            image_url: banner.image_url,
            status: banner.status
        });
        setImagePreview(banner.image_url);
        setEditingId(banner.id);
        setIsCreating(true);
    };

    const handleDelete = async (banner) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;

        try {
            // Delete from R2 first
            if (banner.image_url) {
                const { deleteImage } = await import('../app/actions/images');
                await deleteImage(banner.image_url);
            }

            const { error } = await supabase
                .from('banner_ads')
                .delete()
                .eq('id', banner.id);

            if (error) throw error;
            setBanners(prev => prev.filter(b => b.id !== banner.id));
        } catch (error) {
            console.error('Error deleting banner:', error);
            alert('Error deleting banner: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', link_url: '', image_url: '', status: 'Active' });
        setImagePreview(null);
        setEditingId(null);
        setIsCreating(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading banners...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Banner Ads</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage promotional banners for your institute app</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
                    >
                        <Plus size={18} /> Create Banner
                    </button>
                )}
            </div>

            {isCreating ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl mx-auto animate-in zoom-in-95 duration-200">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800">
                            {editingId ? 'Edit Banner' : 'Create New Banner'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Banner Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="e.g. Summer Sale"
                                required
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Target Link (Optional)</label>
                            <input
                                type="url"
                                name="link_url"
                                value={formData.link_url}
                                onChange={handleInputChange}
                                placeholder="https://..."
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Banner Image</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors bg-slate-50/50">
                                {imagePreview ? (
                                    <div className="relative inline-block group">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="max-w-full h-auto max-h-[200px] rounded-lg shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setImagePreview(null); setFormData(prev => ({ ...prev, image_url: '' })); }}
                                            className="absolute -top-3 -right-3 p-1.5 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-3">
                                            <ImageIcon size={24} />
                                        </div>
                                        <p className="text-slate-600 text-sm font-medium mb-1">Click to upload or drag and drop</p>
                                        <p className="text-slate-400 text-xs mb-4">SVG, PNG, JPG or GIF (max. 2MB)</p>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            id="banner-upload"
                                        />
                                        <label
                                            htmlFor="banner-upload"
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm cursor-pointer shadow-sm"
                                        >
                                            Select Image
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 cursor-pointer transition-colors"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm flex items-center gap-1.5"
                            >
                                {uploading ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        {editingId ? 'Update Banner' : 'Create Banner'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                    {banners.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                                <ImageIcon size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No banners found</h3>
                            <p className="text-slate-500 mt-1 max-w-sm mx-auto mb-6">Create your first banner ad to promote content or features in your app.</p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={18} /> Create Banner
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {banners.map(banner => (
                                <div key={banner.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-all">
                                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                                        <img
                                            src={banner.image_url || 'https://via.placeholder.com/300x160?text=No+Image'}
                                            alt={banner.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className={`
                                            absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm border backdrop-blur-sm
                                            ${banner.status === 'Active'
                                                ? 'bg-emerald-500/90 text-white border-transparent'
                                                : 'bg-slate-100/90 text-slate-600 border-slate-200'}
                                        `}>
                                            {banner.status}
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-lg font-semibold text-slate-800 mb-1 truncate">{banner.title}</h3>
                                        <p className="text-sm text-slate-500 mb-5 truncate flex items-center gap-1.5">
                                            {banner.link_url ? (
                                                <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">
                                                    {banner.link_url}
                                                </a>
                                            ) : (
                                                <span className="italic text-slate-400">No link provided</span>
                                            )}
                                        </p>

                                        <div className="flex gap-3 pt-4 border-t border-slate-50">
                                            <button
                                                onClick={() => handleEdit(banner)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                                            >
                                                <Edit2 size={16} /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(banner)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                                            >
                                                <Trash2 size={16} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SettingsBannerAds;
