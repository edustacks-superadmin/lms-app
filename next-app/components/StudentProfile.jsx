'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useInstitute } from '../context/InstituteContext';
import { supabase } from '../supabaseClient';
import { User, Mail, Phone, Save, Loader, Calendar, LogOut, Camera, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const StudentProfile = () => {
    const { user } = useAuth();
    const { institute } = useInstitute();
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    // Check institute settings
    const canEditProfile = institute?.allow_user_profile_edit !== false;
    const requirePhoto = institute?.enforce_user_photo === true;
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        photo_url: '',
        joining_date: '',
        role: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user?.email) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .eq('email', user.email)
                .single();

            if (error) throw error;

            if (data) {
                setProfile({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    email: data.email || '',
                    phone_number: data.phone_number || '',
                    photo_url: data.photo_url || '',
                    joining_date: data.joining_date || '',
                    role: data.role || ''
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            showToast('Failed to load profile.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Check if photo is required but missing
    useEffect(() => {
        if (!loading && requirePhoto && !profile.photo_url) {
            setShowPhotoModal(true);
        }
    }, [loading, requirePhoto, profile.photo_url]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'profiles');

            // Import server action dynamically
            const { uploadImage } = await import('../app/actions/images');

            // 1. Upload to R2
            const result = await uploadImage(formData);

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            const publicUrl = result.url;

            // 2. Update Profile
            const { error: updateError } = await supabase
                .from('members')
                .update({ photo_url: publicUrl })
                .eq('email', user.email);

            if (updateError) throw updateError;

            setProfile(prev => ({ ...prev, photo_url: publicUrl }));
            showToast('Photo updated successfully!', 'success');

        } catch (error) {
            console.error('Error uploading photo:', error);
            showToast('Failed to upload photo. Make sure the image is small and try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { error } = await supabase
                .from('members')
                .update({
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    phone_number: profile.phone_number
                })
                .eq('email', user.email);

            if (error) throw error;

            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast(`Failed to update profile: ${error.message || error.error_description || 'Unknown error'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <Loader className="animate-spin" size={32} color="var(--primary-color)" />
            </div>
        );
    }

    return (
        <div style={{
            padding: '32px 24px',
            paddingBottom: '120px', // Extra padding for mobile bottom nav
            maxWidth: '800px',
            margin: '0 auto',
            minHeight: '100vh'
        }}>
            {/* Photo Required Modal */}
            {showPhotoModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '400px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            backgroundColor: '#FEF3C7',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <AlertTriangle size={32} color="#D97706" />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a' }}>
                            Profile Photo Required
                        </h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
                            Please upload a profile photo to continue using the platform. This is required by your institute.
                        </p>
                        <label
                            htmlFor="photo-upload-modal"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}
                        >
                            <Camera size={18} /> Upload Photo
                        </label>
                        <input
                            type="file"
                            id="photo-upload-modal"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                handlePhotoChange(e);
                                setShowPhotoModal(false);
                            }}
                        />
                    </div>
                </div>
            )}

            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#1a1a1a' }}>
                My Profile
            </h2>

            {/* Profile Editing Disabled Banner */}
            {!canEditProfile && (
                <div style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: '#92400E'
                }}>
                    <AlertTriangle size={18} />
                    Profile editing is disabled by your institute. Contact admin to make changes.
                </div>
            )}

            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
            }}>
                {/* Header / Avatar Section */}
                <div style={{
                    padding: '32px',
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px'
                }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            color: 'var(--primary-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            fontWeight: 'bold',
                            overflow: 'hidden',
                            border: '2px solid white',
                            position: 'relative'
                        }}>
                            {profile.photo_url ? (
                                <img
                                    src={profile.photo_url}
                                    alt={profile.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                profile.name ? profile.name.charAt(0).toUpperCase() : <User size={40} />
                            )}
                        </div>
                        <label htmlFor="photo-upload" style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            padding: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <User size={14} color="var(--primary-color)" />
                        </label>
                        <input
                            type="file"
                            id="photo-upload"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handlePhotoChange}
                        />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                            {profile.first_name || profile.last_name ? `${profile.first_name} ${profile.last_name}`.trim() : 'Student'}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                            Student Account
                        </p>
                    </div>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {/* First Name */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                First Name
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    name="first_name"
                                    value={profile.first_name}
                                    onChange={handleChange}
                                    placeholder="Enter your first name"
                                    disabled={!canEditProfile}
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        backgroundColor: canEditProfile ? 'white' : '#f9fafb',
                                        cursor: canEditProfile ? 'text' : 'not-allowed'
                                    }}
                                    onFocus={(e) => canEditProfile && (e.target.style.borderColor = 'var(--primary-color)')}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>
                        </div>

                        {/* Last Name */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Last Name
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    name="last_name"
                                    value={profile.last_name}
                                    onChange={handleChange}
                                    placeholder="Enter your last name"
                                    disabled={!canEditProfile}
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        backgroundColor: canEditProfile ? 'white' : '#f9fafb',
                                        cursor: canEditProfile ? 'text' : 'not-allowed'
                                    }}
                                    onFocus={(e) => canEditProfile && (e.target.style.borderColor = 'var(--primary-color)')}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>
                        </div>

                        {/* Email (Read Only) */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Email Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    type="email"
                                    value={profile.email}
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '14px',
                                        backgroundColor: '#f9fafb',
                                        color: '#6b7280',
                                        cursor: 'not-allowed'
                                    }}
                                />
                            </div>
                            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                Email address cannot be changed.
                            </p>
                        </div>

                        {/* Phone */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Phone Number
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    type="tel"
                                    name="phone_number"
                                    value={profile.phone_number}
                                    onChange={handleChange}
                                    placeholder="Enter your phone number"
                                    disabled={!canEditProfile}
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        backgroundColor: canEditProfile ? 'white' : '#f9fafb',
                                        cursor: canEditProfile ? 'text' : 'not-allowed'
                                    }}
                                    onFocus={(e) => canEditProfile && (e.target.style.borderColor = 'var(--primary-color)')}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>
                        </div>

                        {/* Joining Date (Read Only) */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Joining Date
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    value={profile.joining_date ? new Date(profile.joining_date).toLocaleDateString() : 'N/A'}
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '14px',
                                        backgroundColor: '#f9fafb',
                                        color: '#6b7280',
                                        cursor: 'not-allowed'
                                    }}
                                />
                            </div>
                        </div>

                    </div>

                    {canEditProfile && (
                        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 24px',
                                    backgroundColor: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: saving ? 'wait' : 'pointer',
                                    opacity: saving ? 0.7 : 1,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {saving ? (
                                    <>
                                        <Loader className="animate-spin" size={16} /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} /> Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default StudentProfile;
