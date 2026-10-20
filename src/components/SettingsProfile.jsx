import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useCustomFields } from '../context/CustomFieldsContext';
import { Camera, Save, Lock } from 'lucide-react';

const SettingsProfile = () => {
    const { user } = useAuth();
    const { fields } = useCustomFields();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [customData, setCustomData] = useState({});

    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        role: '',
        status: '',
        joining_date: '',
        photo_url: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            if (!user) return;

            const { data, error } = await supabase
                .from('members')
                .select('*')
                .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
                .maybeSingle();

            if (error) {
                console.warn('Error fetching member record, using user session fallback:', error);
            }

            const resolvedName = (
                data?.display_name ||
                `${data?.first_name || ''} ${data?.last_name || ''}`.trim() ||
                user.user_metadata?.full_name ||
                `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
                user.email?.split('@')[0] ||
                ''
            );

            const resolvedStatus = data?.status
                ? (data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase())
                : 'Active';

            setProfileData({
                name: resolvedName,
                email: data?.email || user.email || '',
                role: data?.role || user.user_metadata?.role || 'admin',
                status: resolvedStatus,
                joining_date: data?.joining_date || data?.created_at || user.created_at || '',
                photo_url: data?.photo_url || user.user_metadata?.avatar_url || ''
            });

            setCustomData(data?.custom_data || {});
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please upload an image file' });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image size should be less than 2MB' });
            return;
        }

        setUploading(true);
        setMessage({ type: '', text: '' });

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}.${fileExt}`;
            const filePath = `profiles/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('user-photos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('user-photos')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('members')
                .update({ photo_url: publicUrl })
                .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`);

            if (updateError) {
                console.warn('Members photo_url update warning:', updateError);
            }

            // Sync with auth metadata
            await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            setProfileData(prev => ({ ...prev, photo_url: publicUrl }));
            setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
        } catch (error) {
            console.error('Error uploading photo:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to upload photo' });
        } finally {
            setUploading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const nameParts = profileData.name.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const { error } = await supabase
                .from('members')
                .update({
                    display_name: profileData.name,
                    first_name: firstName,
                    last_name: lastName,
                    role: profileData.role,
                    status: profileData.status.toLowerCase(),
                    custom_data: customData
                })
                .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`);

            if (error) throw error;

            // Sync with auth metadata
            await supabase.auth.updateUser({
                data: {
                    full_name: profileData.name,
                    first_name: firstName,
                    last_name: lastName
                }
            });

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            console.error('Error updating password:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to update password' });
        } finally {
            setLoading(false);
        }
    };

    const customFields = (fields || []).filter(f => !['name', 'email', 'password', 'photo'].includes(f.field_key));

    return (
        <div className="settings-page" style={{ padding: '24px', maxWidth: '1400px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Profile Settings</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>
                Manage your account settings and profile information
            </p>

            {message.text && (
                <div style={{
                    padding: '16px 20px',
                    borderRadius: '8px',
                    marginBottom: '32px',
                    backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                    color: message.type === 'success' ? '#065f46' : '#991b1b'
                }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Profile Photo</h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div style={{ position: 'relative' }}>
                        {profileData.photo_url ? (
                            <img src={profileData.photo_url} alt="Profile" style={{
                                width: '100px', height: '100px', borderRadius: '50%',
                                objectFit: 'cover', border: '3px solid #e5e7eb'
                            }} />
                        ) : (
                            <div style={{
                                width: '100px', height: '100px', borderRadius: '50%',
                                backgroundColor: '#e5e7eb', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: '36px', fontWeight: '600', color: '#6b7280'
                            }}>
                                {profileData.name?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                        )}

                        <label htmlFor="photo-upload" style={{
                            position: 'absolute', bottom: 0, right: 0,
                            backgroundColor: 'var(--primary-color)',
                            width: '32px', height: '32px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            border: '3px solid white', opacity: uploading ? 0.5 : 1
                        }}>
                            <Camera size={16} color="white" />
                        </label>
                        <input
                            id="photo-upload" type="file" accept="image/*"
                            onChange={handlePhotoUpload} disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                            {profileData.name || 'Admin User'}
                        </h4>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                            {profileData.email}
                        </p>
                        <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                            {uploading ? 'Uploading...' : 'Click the camera icon to change your profile photo'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid #f3f4f6' }}>
                    Personal Information
                </h3>

                <form onSubmit={handleProfileUpdate}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', marginBottom: '36px' }}>
                        <div>
                            <label className="form-label" style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>Full Name</label>
                            <input type="text" className="form-input" value={profileData.name}
                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                required style={{ width: '100%' }} />
                        </div>

                        <div>
                            <label className="form-label" style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>Email Address</label>
                            <input type="email" className="form-input" value={profileData.email}
                                disabled style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', width: '100%' }} />
                            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', marginBottom: 0 }}>
                                Email cannot be changed
                            </p>
                        </div>

                        <div>
                            <label className="form-label" style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>Role</label>
                            <select className="form-input" value={profileData.role}
                                onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                                style={{ width: '100%' }}>
                                <option value="admin">Admin</option>
                                <option value="student">Student</option>
                                <option value="instructor">Instructor</option>
                            </select>
                        </div>

                        <div>
                            <label className="form-label" style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>Status</label>
                            <select className="form-input" value={profileData.status}
                                onChange={(e) => setProfileData({ ...profileData, status: e.target.value })}
                                style={{ width: '100%' }}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                            </select>
                        </div>

                        <div>
                            <label className="form-label" style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>Joining Date</label>
                            <input type="text" className="form-input"
                                value={profileData.joining_date ? new Date(profileData.joining_date).toLocaleDateString('en-US', {
                                    year: 'numeric', month: 'long', day: 'numeric'
                                }) : 'Not available'}
                                disabled style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', width: '100%' }} />
                            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', marginBottom: 0 }}>
                                Member since this date
                            </p>
                        </div>
                    </div>

                    {customFields.length > 0 && (
                        <>
                            <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '32px 0' }} />

                            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px', color: '#374151' }}>
                                Additional Information
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', marginBottom: '36px' }}>
                                {customFields.map(field => (
                                    <div key={field.id}>
                                        <label className="form-label" style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                                            {field.field_label}
                                        </label>
                                        {field.field_type === 'select' ? (
                                            <select className="form-input" value={customData[field.field_key] || ''}
                                                onChange={(e) => setCustomData({ ...customData, [field.field_key]: e.target.value })}
                                                style={{ width: '100%' }}>
                                                <option value="">Select {field.field_label}</option>
                                                {Array.isArray(field.field_options) && field.field_options.map((opt, idx) => (
                                                    <option key={idx} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : field.field_type === 'textarea' ? (
                                            <textarea className="form-input" value={customData[field.field_key] || ''}
                                                onChange={(e) => setCustomData({ ...customData, [field.field_key]: e.target.value })}
                                                rows={3} style={{ width: '100%', resize: 'vertical' }} />
                                        ) : (
                                            <input type={field.field_type} className="form-input"
                                                value={customData[field.field_key] || ''}
                                                onChange={(e) => setCustomData({ ...customData, [field.field_key]: e.target.value })}
                                                placeholder={field.placeholder}
                                                style={{ width: '100%' }} />
                                        )}
                                        {field.help_text && (
                                            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', marginBottom: 0 }}>
                                                {field.help_text}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div style={{ paddingTop: '20px', borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}
                            style={{ opacity: loading ? 0.6 : 1, minWidth: '160px', padding: '12px 24px' }}>
                            <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ padding: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid #f3f4f6' }}>
                    Change Password
                </h3>

                <form onSubmit={handlePasswordChange}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', marginBottom: '36px' }}>
                        <div>
                            <label className="form-label" style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                                New Password
                            </label>
                            <input type="password" className="form-input" value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                placeholder="Enter new password" required style={{ width: '100%' }} />
                            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', marginBottom: 0 }}>
                                Minimum 6 characters
                            </p>
                        </div>

                        <div>
                            <label className="form-label" style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                                Confirm New Password
                            </label>
                            <input type="password" className="form-input" value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder="Confirm new password" required style={{ width: '100%' }} />
                        </div>
                    </div>

                    <div style={{ paddingTop: '20px', borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}
                            style={{ opacity: loading ? 0.6 : 1, minWidth: '160px', padding: '12px 24px' }}>
                            <Lock size={18} /> {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsProfile;
