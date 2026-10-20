import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Image as ImageIcon, Save, X, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

const SettingsBannerAds = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        link_url: '',
        image_url: '',
        status: 'Active',
        hide_title: false
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('banner_ads')
                .select('*')
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
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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
            const fileName = `banner_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('banner-ads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('banner-ads')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, image_url: publicUrl }));
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
            const payload = {
                title: formData.title,
                link_url: formData.link_url,
                image_url: formData.image_url,
                status: formData.status,
                hide_title: Boolean(formData.hide_title)
            };

            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('banner_ads')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('banner_ads')
                    .insert([payload]);
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
            title: banner.title || '',
            link_url: banner.link_url || '',
            image_url: banner.image_url || '',
            status: banner.status || 'Active',
            hide_title: Boolean(banner.hide_title)
        });
        setImagePreview(banner.image_url);
        setEditingId(banner.id);
        setIsCreating(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;

        try {
            const { error } = await supabase
                .from('banner_ads')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBanners(prev => prev.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error deleting banner:', error);
            alert('Error deleting banner: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', link_url: '', image_url: '', status: 'Active', hide_title: false });
        setImagePreview(null);
        setEditingId(null);
        setIsCreating(false);
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading banners...</div>;

    return (
        <div className="settings-page" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Banner Ads</h2>
                {!isCreating && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsCreating(true)}
                    >
                        <Plus size={18} /> Create Banner
                    </button>
                )}
            </div>

            {isCreating ? (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #eee', maxWidth: '800px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{editingId ? 'Edit Banner' : 'Create New Banner'}</h3>
                        <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Banner Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="e.g. Summer Sale"
                                required
                            />
                        </div>

                        {/* Hide Title Option */}
                        <div style={{
                            marginBottom: '20px',
                            padding: '14px 16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                color: '#1e293b'
                            }}>
                                <input
                                    type="checkbox"
                                    name="hide_title"
                                    checked={formData.hide_title}
                                    onChange={handleInputChange}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                                />
                                <span>Hide Banner Title on Frontend (Home Page & App)</span>
                            </label>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginLeft: '28px', lineHeight: '1.4' }}>
                                When enabled, this title will only be used as an internal label in admin. It will not be overlaid on the banner image in the home page carousel or mobile app.
                            </p>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Target Link (Optional)</label>
                            <input
                                type="url"
                                name="link_url"
                                value={formData.link_url}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="https://..."
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Banner Image</label>
                            <div style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                {imagePreview ? (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                                        <button
                                            type="button"
                                            onClick={() => { setImagePreview(null); setFormData(prev => ({ ...prev, image_url: '' })); }}
                                            style={{ position: 'absolute', top: -10, right: -10, background: 'red', color: 'white', borderRadius: '50%', border: 'none', padding: '4px', cursor: 'pointer' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <ImageIcon size={48} color="#ccc" style={{ marginBottom: '10px' }} />
                                        <p style={{ color: '#666', marginBottom: '10px' }}>Click to upload or drag and drop</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            style={{ display: 'none' }}
                                            id="banner-upload-next"
                                        />
                                        <label htmlFor="banner-upload-next" className="btn btn-outline" style={{ cursor: 'pointer' }}>
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
                                {uploading ? 'Saving...' : (editingId ? 'Update Banner' : 'Create Banner')}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {banners.map(banner => (
                        <div key={banner.id} className="card" style={{ overflow: 'hidden' }}>
                            <div style={{ height: '160px', backgroundColor: '#f0f0f0', position: 'relative' }}>
                                <img
                                    src={banner.image_url || 'https://via.placeholder.com/300x160?text=No+Image'}
                                    alt={banner.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: banner.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                                    color: banner.status === 'Active' ? '#166534' : '#374151'
                                }}>
                                    {banner.status}
                                </div>
                            </div>
                            <div className="card-body" style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{banner.title}</h3>
                                    {banner.hide_title && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '11px',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: '#f1f5f9',
                                            color: '#64748b',
                                            fontWeight: '600',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <EyeOff size={11} /> Title Hidden
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {banner.link_url || 'No link'}
                                </p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        style={{ flex: 1 }}
                                        onClick={() => handleEdit(banner)}
                                    >
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        style={{ flex: 1, color: '#ef4444', borderColor: '#fee2e2', backgroundColor: '#fef2f2' }}
                                        onClick={() => handleDelete(banner.id)}
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {banners.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#666' }}>
                            No banners found. Create one to get started.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsBannerAds;
