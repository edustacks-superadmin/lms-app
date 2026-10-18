import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Image as ImageIcon, Save, X, Star, MessageSquare, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useInstitute } from '../context/InstituteContext';

const SettingsTestimonials = () => {
    const { institute } = useInstitute();
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        message: '',
        image_url: '',
        video_url: '',
        rating: 5,
        status: 'Active',
        is_featured: false
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (institute?.id) {
            fetchTestimonials();
        }
    }, [institute?.id]);

    const fetchTestimonials = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .eq('institute_id', institute?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTestimonials(data || []);
        } catch (error) {
            console.error('Error fetching testimonials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleRatingChange = (rating) => {
        setFormData(prev => ({ ...prev, rating }));
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
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'testimonials');

            const { uploadImage } = await import('../app/actions/images');
            const result = await uploadImage(formData);

            if (!result.success) throw new Error(result.error);

            setFormData(prev => ({ ...prev, image_url: result.url }));
        } catch (error) {
            console.error('Error uploading testimonial image:', error);
            alert('Error uploading image: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setUploading(true);
        try {
            const submitData = { ...formData };

            const performSave = async (dataToSave) => {
                if (editingId) {
                    return await supabase
                        .from('testimonials')
                        .update(dataToSave)
                        .eq('id', editingId);
                } else {
                    return await supabase
                        .from('testimonials')
                        .insert([{ ...dataToSave, institute_id: institute?.id }]);
                }
            };

            let { error } = await performSave(submitData);

            // Handle schema mismatch (missing video_url or is_featured)
            if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
                console.warn('New columns missing in database, falling back to basic fields');
                const fallbackData = {
                    name: formData.name,
                    role: formData.role,
                    message: formData.message,
                    image_url: formData.image_url,
                    rating: formData.rating,
                    status: formData.status
                };
                const fallbackResult = await performSave(fallbackData);
                error = fallbackResult.error;

                if (!error) {
                    alert('Testimonial saved, but Video URL and Featured status were ignored because the database hasn\'t been updated yet. Please run the SQL migration.');
                }
            }

            if (error) throw error;

            await fetchTestimonials();
            resetForm();
        } catch (error) {
            console.error('Error saving testimonial:', error);
            alert('Error saving testimonial: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (testimonial) => {
        setFormData({
            name: testimonial.name,
            role: testimonial.role,
            message: testimonial.message,
            image_url: testimonial.image_url,
            video_url: testimonial.video_url || '',
            rating: testimonial.rating,
            status: testimonial.status,
            is_featured: testimonial.is_featured || false
        });
        setImagePreview(testimonial.image_url);
        setEditingId(testimonial.id);
        setIsCreating(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this testimonial?')) return;

        try {
            // Find testimonial to delete image
            const testimonial = testimonials.find(t => t.id === id);
            if (testimonial?.image_url) {
                try {
                    const { deleteImage } = await import('../app/actions/images');
                    await deleteImage(testimonial.image_url);
                } catch (imgError) {
                    console.warn('Failed to delete image:', imgError);
                }
            }

            const { error } = await supabase
                .from('testimonials')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTestimonials(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting testimonial:', error);
            alert('Error deleting testimonial: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', role: '', message: '', image_url: '', video_url: '', rating: 5, status: 'Active', is_featured: false });
        setImagePreview(null);
        setEditingId(null);
        setIsCreating(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading testimonials...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Student Testimonials</h2>
                    <p className="text-slate-500 text-sm mt-1">Showcase success stories and feedback from your students</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm"
                    >
                        <Plus size={18} /> Add Testimonial
                    </button>
                )}
            </div>

            {isCreating ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl mx-auto animate-in zoom-in-95 duration-200">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-800">
                            {editingId ? 'Edit Testimonial' : 'Add New Testimonial'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Student Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. John Doe"
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Role / Course</label>
                                <input
                                    type="text"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Full Stack Developer"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Message</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    rows="4"
                                    placeholder="Enter testimonial message..."
                                    required
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors resize-y"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Video URL (Optional)</label>
                                <input
                                    type="url"
                                    name="video_url"
                                    value={formData.video_url}
                                    onChange={handleInputChange}
                                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
                                />
                                <p className="text-[10px] text-slate-400 italic">Supports YouTube, Vimeo, or direct video links.</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Rating</label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRatingChange(star)}
                                        className="p-1 hover:scale-110 transition-transform focus:outline-none"
                                    >
                                        <Star
                                            size={28}
                                            fill={star <= formData.rating ? '#fbbf24' : 'none'}
                                            className={`${star <= formData.rating ? 'text-amber-400' : 'text-slate-300'}`}
                                            strokeWidth={1.5}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Student Photo</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors bg-slate-50/50 flex flex-col items-center">
                                {imagePreview ? (
                                    <div className="relative inline-block group">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-32 h-32 rounded-full object-cover shadow-sm border-4 border-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setImagePreview(null); setFormData(prev => ({ ...prev, image_url: '' })); }}
                                            className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-3">
                                            <ImageIcon size={28} />
                                        </div>
                                        <p className="text-slate-600 text-sm font-medium mb-1">Upload Photo</p>
                                        <p className="text-slate-400 text-xs mb-4">Recommended: Square format, max 2MB</p>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            id="testimonial-upload"
                                        />
                                        <label
                                            htmlFor="testimonial-upload"
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm cursor-pointer shadow-sm"
                                        >
                                            Select Image
                                        </label>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <div className="flex items-center gap-2 pt-8">
                                <input
                                    type="checkbox"
                                    id="is_featured"
                                    name="is_featured"
                                    checked={formData.is_featured}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="is_featured" className="text-sm font-semibold text-slate-700 cursor-pointer">
                                    Display in featured carousel
                                </label>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
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
                                        {editingId ? 'Update Testimonial' : 'Add Testimonial'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                    {testimonials.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                                <MessageSquare size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No testimonials yet</h3>
                            <p className="text-slate-500 mt-1 max-w-sm mx-auto mb-6">Social proof builds trust. Add real feedback from your students.</p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={18} /> Add Testimonial
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {testimonials.map(testimonial => (
                                <div key={testimonial.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-4">
                                        <img
                                            src={testimonial.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`}
                                            alt={testimonial.name}
                                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`; }}
                                            className="w-12 h-12 rounded-full object-cover border border-slate-100"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-semibold text-slate-900 truncate">{testimonial.name}</h4>
                                            <p className="text-xs text-slate-500 truncate">{testimonial.role}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`
                                                px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border
                                                ${testimonial.status === 'Active'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-slate-50 text-slate-500 border-slate-200'}
                                            `}>
                                                {testimonial.status}
                                            </span>
                                            <div className="flex gap-1">
                                                {testimonial.is_featured && (
                                                    <span className="bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                                                        Featured
                                                    </span>
                                                )}
                                                {testimonial.video_url && (
                                                    <span className="bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                                                        Video
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-0.5 mb-3">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={14}
                                                fill={i < testimonial.rating ? '#fbbf24' : 'none'}
                                                className={i < testimonial.rating ? 'text-amber-400' : 'text-slate-300'}
                                                strokeWidth={1.5}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex-1 mb-6 relative">
                                        <QuoteIcon className="absolute -top-1 -left-1 text-slate-100 w-8 h-8 -z-10" />
                                        <p className="text-sm text-slate-600 leading-relaxed italic">
                                            "{testimonial.message}"
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t border-slate-50 mt-auto">
                                        <button
                                            onClick={() => handleEdit(testimonial)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                                        >
                                            <Edit2 size={16} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(testimonial.id)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                                        >
                                            <Trash2 size={16} /> Delete
                                        </button>
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

// Start Icon for background decoration
const QuoteIcon = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
    >
        <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z"></path>
    </svg>
);

export default SettingsTestimonials;
