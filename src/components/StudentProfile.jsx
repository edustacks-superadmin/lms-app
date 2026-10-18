import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { User, Mail, Phone, Save, Loader, MapPin, Calendar, Briefcase, LogOut } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const StudentProfile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone_number: '',
        photo_url: '',
        location: '',
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
                    name: data.name || '',
                    email: data.email || '',
                    phone_number: data.phone_number || '',
                    photo_url: data.photo_url || '',
                    location: data.location || '',
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
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('user-photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('user-photos')
                .getPublicUrl(filePath);

            // 3. Update Profile
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
                    name: profile.name,
                    phone_number: profile.phone_number,
                    location: profile.location
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
        <div style={{ maxWidth: '800px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#1a1a1a' }}>
                My Profile
            </h2>

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
                            {profile.name || 'Student'}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                            Student Account
                        </p>
                    </div>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {/* Full Name */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Full Name
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    name="name"
                                    value={profile.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
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
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Location
                            </label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    name="location"
                                    value={profile.location}
                                    onChange={handleChange}
                                    placeholder="Enter your city or location"
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
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

                        {/* Role (Read Only) */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Role
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    value={profile.role || 'Student'}
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '14px',
                                        backgroundColor: '#f9fafb',
                                        color: '#6b7280',
                                        cursor: 'not-allowed',
                                        textTransform: 'capitalize'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

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
                </form>
            </div>
        </div>
    );
};

export default StudentProfile;
