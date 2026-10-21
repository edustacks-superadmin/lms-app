import React, { useState, useEffect } from 'react';
import { Save, Upload, Image as ImageIcon, Globe, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Youtube, Smartphone } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { supabase } from '../supabaseClient';

const SettingsInstitute = () => {
    const { institute, updateInstituteSettings, loading: contextLoading } = useInstitute();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        slogan: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        theme_color: '#0088cc',
        logo_url: '',
        favicon_url: '',
        facebook_url: '',
        twitter_url: '',
        instagram_url: '',
        linkedin_url: '',
        youtube_url: '',
        telegram_url: '',
        blogger_url: '',
        whatsapp_url: '',
        arattai_url: '',
        upi_id: '',
        upi_qr_url: '',
        mission_text: '',
        manualPaymentEnabled: true
    });

    const [logoPreview, setLogoPreview] = useState(null);
    const [faviconPreview, setFaviconPreview] = useState(null);
    const [qrPreview, setQrPreview] = useState(null);
    const [notification, setNotification] = useState(null);

    // Sync formData with institute context
    useEffect(() => {
        if (institute) {
            setFormData(prev => ({
                ...prev,
                name: institute.name || '',
                slogan: institute.slogan || '',
                description: institute.description || '',
                address: institute.address || '',
                phone: institute.phone || '',
                email: institute.email || '',
                website: institute.website || '',
                theme_color: institute.theme_color || '#0088cc',
                logo_url: institute.logo_url || '',
                favicon_url: institute.favicon_url || '',
                facebook_url: institute.facebook_url || '',
                twitter_url: institute.twitter_url || '',
                instagram_url: institute.instagram_url || '',
                linkedin_url: institute.linkedin_url || '',
                youtube_url: institute.youtube_url || '',
                telegram_url: institute.telegram_url || '',
                blogger_url: institute.blogger_url || '',
                whatsapp_url: institute.whatsapp_url || '',
                arattai_url: institute.arattai_url || '',
                upi_id: institute.upi_id || '',
                upi_qr_url: institute.upi_qr_url || '',
                mission_text: institute.mission_text || '',
                manualPaymentEnabled: institute.feature_flags?.manualPaymentEnabled !== false
            }));
            setLogoPreview(institute.logo_url);
            setFaviconPreview(institute.favicon_url);
            setQrPreview(institute.upi_qr_url);
        }
    }, [institute]);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'logo') setLogoPreview(reader.result);
            else if (type === 'favicon') setFaviconPreview(reader.result);
            else if (type === 'qr') setQrPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload to Supabase
        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${type}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('institute-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('institute-assets')
                .getPublicUrl(filePath);

            setFormData(prev => ({
                ...prev,
                [type === 'logo' ? 'logo_url' : type === 'favicon' ? 'favicon_url' : 'upi_qr_url']: publicUrl
            }));

        } catch (error) {
            console.error('Error uploading image:', error);
            setNotification({ type: 'error', message: 'Error uploading image: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { manualPaymentEnabled, ...rest } = formData;
        const payload = {
            ...rest,
            feature_flags: {
                ...(institute?.feature_flags || {}),
                manualPaymentEnabled: Boolean(manualPaymentEnabled)
            }
        };

        const result = await updateInstituteSettings(payload);

        setLoading(false);
        if (result.success) {
            setNotification({ type: 'success', message: 'Institute settings saved successfully!' });
        } else {
            setNotification({ type: 'error', message: 'Failed to save settings: ' + result.error });
        }
    };

    if (contextLoading) {
        return <div style={{ padding: '20px' }}>Loading settings...</div>;
    }

    const sectionStyle = {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid #eee',
        marginBottom: '24px'
    };

    const sectionTitleStyle = {
        fontSize: '18px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #f0f0f0'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#444'
    };

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s'
    };

    const rowStyle = {
        display: 'flex',
        gap: '20px',
        marginBottom: '20px'
    };

    const colStyle = {
        flex: 1
    };

    console.log('SettingsInstitute Render - formData:', formData);
    console.log('SettingsInstitute Render - institute context:', institute);

    return (
        <div className="settings-page" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>

            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {notification.type === 'success' ? '✓' : '✕'} {notification.message}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#333', margin: 0 }}>Institute Settings</h2>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 24px',
                        background: loading ? '#ccc' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        fontSize: '14px'
                    }}
                >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Basic Information</h3>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}>Institute Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="e.g. My Academy"
                            />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>Slogan / Tagline</label>
                            <input
                                type="text"
                                name="slogan"
                                value={formData.slogan || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="e.g. Learn to Lead"
                            />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>About / Description</label>
                        <textarea
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                            placeholder="Tell us about your institute..."
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Mission Statement</label>
                        <textarea
                            name="mission_text"
                            value={formData.mission_text || ''}
                            onChange={handleChange}
                            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                            placeholder="Our mission is to..."
                        />
                    </div>
                </div>

                {/* Contact Information */}
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Contact Information</h3>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}><MapPin size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} /> Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}><Phone size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} /> Phone Number</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone || ''}
                                onChange={handleChange}
                                style={inputStyle}
                            />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}><Mail size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} /> Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}><Globe size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} /> Website URL</label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website || ''}
                                onChange={handleChange}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {/* Payment Information */}
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Payment Information</h3>

                    {/* Manual Payment Mode Toggle */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        backgroundColor: formData.manualPaymentEnabled ? '#f0fdf4' : '#f8fafc',
                        border: `1.5px solid ${formData.manualPaymentEnabled ? '#86efac' : '#e2e8f0'}`,
                        borderRadius: '10px',
                        marginBottom: '20px',
                        transition: 'all 0.2s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                backgroundColor: formData.manualPaymentEnabled ? '#dcfce7' : '#e2e8f0',
                                color: formData.manualPaymentEnabled ? '#15803d' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Smartphone size={20} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                                        Enable Manual UPI Payments
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        backgroundColor: formData.manualPaymentEnabled ? '#dcfce7' : '#f1f5f9',
                                        color: formData.manualPaymentEnabled ? '#15803d' : '#64748b'
                                    }}>
                                        {formData.manualPaymentEnabled ? 'ACTIVE' : 'DISABLED'}
                                    </span>
                                </div>
                                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                                    {formData.manualPaymentEnabled
                                        ? 'Students can choose to pay via UPI ID / QR Code and submit their Transaction UTR for admin approval.'
                                        : 'Manual UPI transfer option is disabled at checkout. Students will only see Online Payment (Razorpay).'}
                                </p>
                            </div>
                        </div>

                        {/* Toggle Switch */}
                        <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer', flexShrink: 0 }}>
                            <input
                                type="checkbox"
                                name="manualPaymentEnabled"
                                checked={!!formData.manualPaymentEnabled}
                                onChange={(e) => setFormData(prev => ({ ...prev, manualPaymentEnabled: e.target.checked }))}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: formData.manualPaymentEnabled ? '#16a34a' : '#cbd5e1',
                                transition: '0.2s',
                                borderRadius: '34px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    height: '20px',
                                    width: '20px',
                                    left: formData.manualPaymentEnabled ? '24px' : '4px',
                                    bottom: '3px',
                                    backgroundColor: 'white',
                                    transition: '0.2s',
                                    borderRadius: '50%',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }} />
                            </span>
                        </label>
                    </div>

                    <div style={{
                        ...rowStyle,
                        opacity: formData.manualPaymentEnabled ? 1 : 0.6,
                        transition: 'opacity 0.2s ease'
                    }}>
                        <div style={colStyle}>
                            <label style={labelStyle}>UPI ID (for Manual Payments)</label>
                            <input
                                type="text"
                                name="upi_id"
                                value={formData.upi_id || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="e.g. merchant@upi"
                            />
                            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                This UPI ID will be shown to students when they choose to pay via UPI.
                            </p>
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>QR Code (Scan & Pay)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    border: '1px dashed #ccc',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    backgroundColor: '#f9f9f9'
                                }}>
                                    {qrPreview ? (
                                        <img src={qrPreview} alt="QR Code" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <ImageIcon size={30} color="#ccc" />
                                    )}
                                </div>
                                <div>
                                    <label
                                        htmlFor="qr-upload"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            border: '1px solid #ddd',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            background: 'white'
                                        }}
                                    >
                                        <Upload size={16} /> Upload QR Code
                                    </label>
                                    <input
                                        id="qr-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'qr')}
                                        style={{ display: 'none' }}
                                    />
                                    <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Upload your UPI QR Code image.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Branding */}
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Branding</h3>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}>Institute Logo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    border: '1px dashed #ccc',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    backgroundColor: '#f9f9f9'
                                }}>
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <ImageIcon size={30} color="#ccc" />
                                    )}
                                </div>
                                <div>
                                    <label
                                        htmlFor="logo-upload"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            border: '1px solid #ddd',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            background: 'white'
                                        }}
                                    >
                                        <Upload size={16} /> Upload Logo
                                    </label>
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'logo')}
                                        style={{ display: 'none' }}
                                    />
                                    <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Recommended size: 500x500px (PNG/JPG)</p>
                                </div>
                            </div>
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>Favicon</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    border: '1px dashed #ccc',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    backgroundColor: '#f9f9f9'
                                }}>
                                    {faviconPreview ? (
                                        <img src={faviconPreview} alt="Favicon" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <ImageIcon size={20} color="#ccc" />
                                    )}
                                </div>
                                <div>
                                    <label
                                        htmlFor="favicon-upload"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            border: '1px solid #ddd',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            background: 'white'
                                        }}
                                    >
                                        <Upload size={16} /> Upload Favicon
                                    </label>
                                    <input
                                        id="favicon-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'favicon')}
                                        style={{ display: 'none' }}
                                    />
                                    <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Recommended size: 32x32px (ICO/PNG)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <label style={labelStyle}>Theme Color</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="color"
                                name="theme_color"
                                value={formData.theme_color || '#0088cc'}
                                onChange={handleChange}
                                style={{ width: '50px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                            />
                            <input
                                type="text"
                                name="theme_color"
                                value={formData.theme_color || '#0088cc'}
                                onChange={handleChange}
                                style={{ ...inputStyle, width: '120px' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Social Media Links</h3>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}><Facebook size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom', color: '#1877F2' }} /> Facebook</label>
                            <input
                                type="url"
                                name="facebook_url"
                                value={formData.facebook_url || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="https://facebook.com/..."
                            />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}><Twitter size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom', color: '#1DA1F2' }} /> Twitter / X</label>
                            <input
                                type="url"
                                name="twitter_url"
                                value={formData.twitter_url || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="https://twitter.com/..."
                            />
                        </div>
                    </div>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}><Instagram size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom', color: '#E4405F' }} /> Instagram</label>
                            <input
                                type="url"
                                name="instagram_url"
                                value={formData.instagram_url || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="https://instagram.com/..."
                            />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}><Linkedin size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom', color: '#0A66C2' }} /> LinkedIn</label>
                            <input
                                type="url"
                                name="linkedin_url"
                                value={formData.linkedin_url || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="https://linkedin.com/..."
                            />
                        </div>
                    </div>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}><Youtube size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom', color: '#FF0000' }} /> YouTube</label>
                            <input
                                type="url"
                                name="youtube_url"
                                value={formData.youtube_url || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="https://youtube.com/..."
                            />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>📱 Telegram</label>
                            <input
                                type="url"
                                name="telegram_url"
                                value={formData.telegram_url || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="https://t.me/..."
                            />
                        </div>
                    </div>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}>📝 Blogger</label>
                            <input
                                type="url"
                                name="blogger_url"
                                value={formData.blogger_url || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="https://blogger.com/..."
                            />
                        </div>
                        <div style={colStyle}>
                            <label style={labelStyle}>💬 WhatsApp</label>
                            <input
                                type="url"
                                name="whatsapp_url"
                                value={formData.whatsapp_url || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="https://wa.me/..."
                            />
                        </div>
                    </div>
                    <div style={rowStyle}>
                        <div style={colStyle}>
                            <label style={labelStyle}>🎙️ Arattai</label>
                            <input
                                type="url"
                                name="arattai_url"
                                value={formData.arattai_url || ''}
                                onChange={handleChange}
                                style={inputStyle}
                                placeholder="https://arattai.com/..."
                            />
                        </div>
                        <div style={colStyle}>
                            {/* Empty column for alignment */}
                        </div>
                    </div>
                </div>
            </form>
        </div >
    );
};

export default SettingsInstitute;
