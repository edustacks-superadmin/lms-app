import React, { useState, useRef } from 'react';
import { X, Search, Image as ImageIcon, Upload, Check } from 'lucide-react';
import PRELOADED_ICONS from '../data/preloadedIcons.json';
import { supabase } from '../supabaseClient';

const IconPicker = ({ isOpen, onClose, onSelect, currentIcon }) => {
    const categories = Object.keys(PRELOADED_ICONS || {});
    const [activeCategory, setActiveCategory] = useState(categories[0] || 'General');
    const [searchTerm, setSearchTerm] = useState('');
    const [customIcons, setCustomIcons] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // Combine preloaded custom icons with any uploaded in this session
    const allCategoryIcons = {
        ...PRELOADED_ICONS,
        Custom: [...(PRELOADED_ICONS.Custom || []), ...customIcons]
    };

    let displayIcons = [];
    if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const allIcons = Object.values(allCategoryIcons).flat();
        // Deduplicate by url
        const seen = new Set();
        displayIcons = allIcons.filter(icon => {
            if (seen.has(icon.url)) return false;
            seen.add(icon.url);
            return icon.name.toLowerCase().includes(query);
        });
    } else {
        displayIcons = allCategoryIcons[activeCategory] || [];
    }

    const handleUploadCustomIcon = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `custom_icon_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `icons/${fileName}`;

            const { data, error } = await supabase.storage
                .from('course-images')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('course-images')
                .getPublicUrl(filePath);

            const newIcon = {
                name: file.name.replace(/\.[^/.]+$/, ''),
                url: publicUrl
            };

            setCustomIcons(prev => [newIcon, ...prev]);
            setActiveCategory('Custom');
            onSelect(publicUrl);
            onClose();
        } catch (err) {
            console.error('Error uploading custom icon:', err);
            alert('Failed to upload icon: ' + (err.message || 'Unknown error'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                width: '880px',
                maxWidth: '96%',
                height: '620px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2563eb'
                        }}>
                            <ImageIcon size={18} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                            Select Course Icon
                        </h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Search Input */}
                        <div style={{ position: 'relative', width: '260px' }}>
                            <Search
                                size={16}
                                color="#9ca3af"
                                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                            />
                            <input
                                type="text"
                                placeholder="Search all icons..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '7px 12px 7px 32px',
                                    fontSize: '13px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    outline: 'none',
                                    transition: 'border-color 0.15s'
                                }}
                            />
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#6b7280',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: '6px'
                            }}
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body: Categories + Icons Grid */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Left Sidebar: Categories */}
                    {!searchTerm.trim() && (
                        <div style={{
                            width: '200px',
                            borderRight: '1px solid #e5e7eb',
                            backgroundColor: '#f9fafb',
                            overflowY: 'auto',
                            padding: '12px 8px'
                        }}>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                padding: '6px 12px',
                                marginBottom: '4px'
                            }}>
                                Categories
                            </div>
                            {categories.map(cat => {
                                const isActive = activeCategory === cat;
                                const count = (allCategoryIcons[cat] || []).length;
                                return (
                                    <div
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            marginBottom: '2px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            backgroundColor: isActive ? '#0088cc' : 'transparent',
                                            color: isActive ? '#ffffff' : '#374151',
                                            fontWeight: isActive ? '600' : '400',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>{cat}</span>
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '1px 6px',
                                            borderRadius: '10px',
                                            backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                                            color: isActive ? '#ffffff' : '#6b7280'
                                        }}>
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Right Content: Icon Grid */}
                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                        {/* Custom Category Upload Action */}
                        {(activeCategory === 'Custom' || searchTerm.trim()) && (
                            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleUploadCustomIcon}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '7px 14px',
                                        backgroundColor: '#0088cc',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        cursor: uploading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <Upload size={14} />
                                    {uploading ? 'Uploading...' : 'Upload Custom Icon'}
                                </button>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                    PNG, JPG, or SVG up to 2MB
                                </span>
                            </div>
                        )}

                        {displayIcons.length === 0 ? (
                            <div style={{
                                height: '240px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#9ca3af'
                            }}>
                                <ImageIcon size={40} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                <p style={{ fontSize: '14px', margin: 0 }}>No icons found</p>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        style={{
                                            marginTop: '8px',
                                            background: 'none',
                                            border: 'none',
                                            color: '#0088cc',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                gap: '12px'
                            }}>
                                {displayIcons.map((icon, idx) => {
                                    const isSelected = currentIcon === icon.url;
                                    return (
                                        <div
                                            key={`${icon.url}-${idx}`}
                                            onClick={() => {
                                                onSelect(icon.url);
                                                onClose();
                                            }}
                                            style={{
                                                position: 'relative',
                                                border: isSelected ? '2px solid #0088cc' : '1px solid #e5e7eb',
                                                backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                                                borderRadius: '8px',
                                                padding: '12px 6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                transition: 'all 0.15s ease',
                                                minHeight: '96px'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = '#0088cc';
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                                    e.currentTarget.style.transform = 'none';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }
                                            }}
                                            title={icon.name}
                                        >
                                            {isSelected && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#0088cc',
                                                    color: '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Check size={10} strokeWidth={3} />
                                                </div>
                                            )}
                                            <div style={{
                                                width: '44px',
                                                height: '44px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <img
                                                    src={icon.url}
                                                    alt={icon.name}
                                                    loading="lazy"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '100%',
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            </div>
                                            <span style={{
                                                fontSize: '11px',
                                                color: isSelected ? '#0088cc' : '#4b5563',
                                                fontWeight: isSelected ? '600' : '400',
                                                textAlign: 'center',
                                                width: '100%',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                padding: '0 4px'
                                            }}>
                                                {icon.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 24px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f9fafb'
                }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {displayIcons.length} icons available
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '6px 16px',
                            backgroundColor: '#ffffff',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IconPicker;
