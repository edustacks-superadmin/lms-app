import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Image as ImageIcon, Save, X, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';

const SettingsTestimonials = () => {
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
        rating: 5,
        status: 'Active'
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchTestimonials();
    }, []);

    const fetchTestimonials = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
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
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
            const fileExt = file.name.split('.').pop();
            const fileName = `testimonial_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('testimonials')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('testimonials')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, image_url: publicUrl }));
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
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('testimonials')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('testimonials')
                    .insert([formData]);
                if (error) throw error;
            }

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
            rating: testimonial.rating,
            status: testimonial.status
        });
        setImagePreview(testimonial.image_url);
        setEditingId(testimonial.id);
        setIsCreating(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this testimonial?')) return;

        try {
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
        setFormData({ name: '', role: '', message: '', image_url: '', rating: 5, status: 'Active' });
        setImagePreview(null);
        setEditingId(null);
        setIsCreating(false);
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading testimonials...</div>;

    return (
        <div className="settings-page" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Student Testimonials</h2>
                {!isCreating && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsCreating(true)}
                    >
                        <Plus size={18} /> Add Testimonial
                    </button>
                )}
            </div>

            {isCreating ? (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #eee', maxWidth: '800px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{editingId ? 'Edit Testimonial' : 'Add New Testimonial'}</h3>
                        <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Student Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="e.g. John Doe"
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Role / Course</label>
                                <input
                                    type="text"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="form-control"
                                    placeholder="e.g. Full Stack Developer"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Message</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                className="form-control"
                                rows="4"
                                placeholder="Enter testimonial message..."
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Rating</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRatingChange(star)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        <Star
                                            size={24}
                                            fill={star <= formData.rating ? '#fbbf24' : 'none'}
                                            color={star <= formData.rating ? '#fbbf24' : '#d1d5db'}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Student Photo</label>
                            <div style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                {imagePreview ? (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img src={imagePreview} alt="Preview" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
                                        <button
                                            type="button"
                                            onClick={() => { setImagePreview(null); setFormData(prev => ({ ...prev, image_url: '' })); }}
                                            style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', borderRadius: '50%', border: 'none', padding: '4px', cursor: 'pointer' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <ImageIcon size={32} color="#ccc" style={{ marginBottom: '10px' }} />
                                        <p style={{ color: '#666', marginBottom: '10px', fontSize: '13px' }}>Upload Photo</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            style={{ display: 'none' }}
                                            id="testimonial-upload"
                                        />
                                        <label htmlFor="testimonial-upload" className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                                            Select Image
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="form-control"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={resetForm} className="btn btn-ghost">Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={uploading}>
                                {uploading ? 'Saving...' : (editingId ? 'Update Testimonial' : 'Add Testimonial')}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {testimonials.map(testimonial => (
                        <div key={testimonial.id} className="card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                                <img
                                    src={testimonial.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`}
                                    alt={testimonial.name}
                                    onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`; }}
                                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <div>
                                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{testimonial.name}</h4>
                                    <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{testimonial.role}</p>
                                </div>
                                <div style={{ marginLeft: 'auto' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        backgroundColor: testimonial.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                                        color: testimonial.status === 'Active' ? '#166534' : '#374151'
                                    }}>
                                        {testimonial.status}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={14}
                                        fill={i < testimonial.rating ? '#fbbf24' : 'none'}
                                        color={i < testimonial.rating ? '#fbbf24' : '#d1d5db'}
                                    />
                                ))}
                            </div>

                            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px', lineHeight: '1.5' }}>
                                "{testimonial.message}"
                            </p>

                            <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ flex: 1 }}
                                    onClick={() => handleEdit(testimonial)}
                                >
                                    <Edit2 size={14} /> Edit
                                </button>
                                <button
                                    className="btn btn-outline btn-sm"
                                    style={{ flex: 1, color: '#ef4444', borderColor: '#fee2e2', backgroundColor: '#fef2f2' }}
                                    onClick={() => handleDelete(testimonial.id)}
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {testimonials.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#666' }}>
                            No testimonials found. Add one to get started.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsTestimonials;
