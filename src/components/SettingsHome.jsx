import React, { useState, useEffect } from 'react';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { Save, Upload, Loader, Info } from 'lucide-react';

const SettingsHome = () => {
    const { settings, updateHomeSettings, loading } = useHomeSettings();
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState(null);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
            setBannerPreview(settings.hero_banner_image);
        }
    }, [settings]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleBannerChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBannerFile(file);
            setBannerPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        const result = await updateHomeSettings(formData, null, bannerFile);

        if (result.success) {
            setMessage({ type: 'success', text: 'Home page settings updated successfully!' });
            setBannerFile(null);
        } else {
            setMessage({ type: 'error', text: `Failed to update settings: ${result.error}` });
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Loader className="animate-spin" size={32} color="var(--primary-color)" />
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '900px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
                Home Page Settings
            </h2>
            <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '24px',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                border: '1px solid #bae6fd',
                fontSize: '14px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
            }}>
                <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <strong>Note:</strong> To update your institute name, logo, contact information, or social media links, please visit{' '}
                    <a href="/settings/institute" style={{ color: '#0369a1', textDecoration: 'underline' }}>
                        Settings → Institute
                    </a>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {message.text && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: message.type === 'success' ? '#059669' : '#dc2626',
                        border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                        fontSize: '14px'
                    }}>
                        {message.text}
                    </div>
                )}

                {/* Hero Banner Settings */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                        Hero Banner Settings
                    </h3>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                Banner Image
                            </label>
                            {bannerPreview && (
                                <div style={{ marginBottom: '12px' }}>
                                    <img src={bannerPreview} alt="Banner preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleBannerChange}
                                style={{ fontSize: '14px' }}
                            />
                            <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Recommended: 1920x1080px (16:9)</p>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                Hero Title
                            </label>
                            <input
                                type="text"
                                name="hero_title"
                                value={formData.hero_title || ''}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px'
                                }}
                                placeholder="e.g., Welcome to Our Academy"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                Hero Subtitle
                            </label>
                            <textarea
                                name="hero_subtitle"
                                value={formData.hero_subtitle || ''}
                                onChange={handleChange}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    resize: 'vertical'
                                }}
                                placeholder="e.g., Empowering Students, One Course at a Time"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                Call-to-Action Button Text
                            </label>
                            <input
                                type="text"
                                name="hero_cta_text"
                                value={formData.hero_cta_text || ''}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px'
                                }}
                                placeholder="e.g., Explore Courses"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                Sign Up Button Text
                            </label>
                            <input
                                type="text"
                                name="signup_link_text"
                                value={formData.signup_link_text || ''}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px'
                                }}
                                placeholder="e.g., Sign Up"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Settings */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                        Footer Settings
                    </h3>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                Copyright Text
                            </label>
                            <input
                                type="text"
                                name="copyright_text"
                                value={formData.copyright_text || ''}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px'
                                }}
                                placeholder="e.g., © 2025 Institute Name. All rights reserved."
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                    Privacy Policy Link
                                </label>
                                <input
                                    type="url"
                                    name="privacy_policy_link"
                                    value={formData.privacy_policy_link || ''}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                    Terms of Service Link
                                </label>
                                <input
                                    type="url"
                                    name="terms_link"
                                    value={formData.terms_link || ''}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product Display Settings */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                        Product Display Settings
                    </h3>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="checkbox"
                                name="show_products"
                                checked={formData.show_products || false}
                                onChange={handleChange}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label style={{ fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                                Show products on home page
                            </label>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                Number of Products to Display
                            </label>
                            <input
                                type="number"
                                name="products_to_display"
                                value={formData.products_to_display || 6}
                                onChange={handleChange}
                                min="1"
                                max="12"
                                style={{
                                    width: '200px',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: saving ? 'wait' : 'pointer',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? (
                            <>
                                <Loader className="animate-spin" size={16} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsHome;
