import React, { useState, useEffect } from 'react';
import { useInstitute } from '../context/InstituteContext';
import { Save, Globe } from 'lucide-react';

const SettingsSEO = () => {
    const { institute, updateInstituteSettings, loading } = useInstitute();
    const [formData, setFormData] = useState({
        seo_title: '',
        meta_description: '',
        keywords: '',
        meta_robots_follow: 'Follow',
        meta_robots_index: 'Index'
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (institute) {
            setFormData({
                seo_title: institute.seo_title || '',
                meta_description: institute.meta_description || '',
                keywords: institute.keywords || '',
                meta_robots_follow: institute.meta_robots_follow || 'Follow',
                meta_robots_index: institute.meta_robots_index || 'Index'
            });
        }
    }, [institute]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const result = await updateInstituteSettings(formData);
            if (result.success) {
                setMessage({ type: 'success', text: 'SEO settings updated successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to update settings: ' + result.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading && !institute) return <div style={{ padding: '20px' }}>Loading settings...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px' }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Globe size={24} />
                    Update Institute SEO Settings
                </h1>
                <p style={{ color: '#666', marginTop: '8px' }}>
                    Configure global SEO settings for your institute. These settings will be applied to all pages unless overridden.
                </p>
            </div>

            {message && (
                <div style={{
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: message.type === 'success' ? '#2e7d32' : '#c62828',
                    border: `1px solid ${message.type === 'success' ? '#c8e6c9' : '#ffcdd2'}`
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #eee' }}>

                {/* SEO Title */}
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'start' }}>
                    <label style={{ fontWeight: '500', color: '#333', paddingTop: '10px' }}>
                        SEO Title:
                    </label>
                    <input
                        type="text"
                        name="seo_title"
                        value={formData.seo_title}
                        onChange={handleChange}
                        placeholder="e.g. ABC Academy - Online Learning Platform"
                        style={{
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            width: '100%',
                            fontSize: '14px'
                        }}
                    />
                </div>

                {/* Meta Description */}
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'start' }}>
                    <label style={{ fontWeight: '500', color: '#333', paddingTop: '10px' }}>
                        Meta description:
                    </label>
                    <div style={{ width: '100%' }}>
                        <textarea
                            name="meta_description"
                            value={formData.meta_description}
                            onChange={handleChange}
                            rows={5}
                            placeholder="Brief description of your institute..."
                            style={{
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                width: '100%',
                                fontSize: '14px',
                                resize: 'vertical'
                            }}
                        />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                            {formData.meta_description.length} characters
                        </div>
                    </div>
                </div>

                {/* Keywords */}
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'start' }}>
                    <label style={{ fontWeight: '500', color: '#333', paddingTop: '10px' }}>
                        Keywords:
                    </label>
                    <input
                        type="text"
                        name="keywords"
                        value={formData.keywords}
                        onChange={handleChange}
                        placeholder="e.g. tnpsc, coaching, academy"
                        style={{
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            width: '100%',
                            fontSize: '14px'
                        }}
                    />
                </div>

                {/* Robots Follow */}
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'start' }}>
                    <label style={{ fontWeight: '500', color: '#333', paddingTop: '10px' }}>
                        Meta Robots Follow:
                    </label>
                    <div style={{ width: '100%' }}>
                        <select
                            name="meta_robots_follow"
                            value={formData.meta_robots_follow}
                            onChange={handleChange}
                            style={{
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                width: '200px',
                                fontSize: '14px',
                                backgroundColor: 'white'
                            }}
                        >
                            <option value="Follow">Follow</option>
                            <option value="Nofollow">Nofollow</option>
                        </select>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', lineHeight: '1.5' }}>
                            Follow: Even if the page isn't indexed, the crawler should follow all the links on a page and pass equity to the linked pages.<br />
                            Nofollow: Tells a crawler not to follow any links on a page or pass along any link equity.
                        </p>
                    </div>
                </div>

                {/* Robots Index */}
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'start' }}>
                    <label style={{ fontWeight: '500', color: '#333', paddingTop: '10px' }}>
                        Meta Robots Index:
                    </label>
                    <div style={{ width: '100%' }}>
                        <select
                            name="meta_robots_index"
                            value={formData.meta_robots_index}
                            onChange={handleChange}
                            style={{
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                width: '200px',
                                fontSize: '14px',
                                backgroundColor: 'white'
                            }}
                        >
                            <option value="Index">Index</option>
                            <option value="Noindex">Noindex</option>
                        </select>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', lineHeight: '1.5' }}>
                            Noindex: Tells a search engine not to index a page.<br />
                            Index: Tells a search engine to index a page.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px', marginLeft: '220px' }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#00a76f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Submit'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default SettingsSEO;
