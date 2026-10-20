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
        first_name: '',
        last_name: '',
        display_name: '',
        email: '',
        phone_number: '',
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
        try {
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setProfileData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    display_name: data.display_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || user.user_metadata?.full_name || '',
                    email: data.email || '',
                    phone_number: data.phone_number || '',
                    role: data.role || '',
                    status: data.status || '',
                    joining_date: data.joining_date || '',
                    photo_url: data.photo_url || ''
                });

                setCustomData(data.custom_data || {});
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
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
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'profiles');

            // Import server action dynamically
            const { uploadImage } = await import('../app/actions/images');

            const result = await uploadImage(formData);

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            const publicUrl = result.url;

            const { error: updateError } = await supabase
                .from('members')
                .update({ photo_url: publicUrl })
                .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`);

            if (updateError) throw updateError;

            setProfileData({ ...profileData, photo_url: publicUrl });
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
            const { error } = await supabase
                .from('members')
                .update({
                    first_name: profileData.first_name,
                    last_name: profileData.last_name,
                    display_name: profileData.display_name,
                    phone_number: profileData.phone_number,
                    role: profileData.role,
                    status: profileData.status,
                    custom_data: customData
                })
                .eq('email', user.email);

            if (error) throw error;

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
        <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Profile Settings</h2>
                <p className="text-slate-500 text-sm mt-1">
                    Manage your account settings and profile information
                </p>
            </div>

            {message.text && (
                <div className={`
                    p-4 rounded-lg flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300
                    ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'}
                `}>
                    {message.type === 'success' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    {message.text}
                </div>
            )}

            {/* Profile Photo Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-semibold text-slate-800">Profile Photo</h3>
                </div>
                <div className="p-8">
                    <div className="flex items-center gap-8">
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-full ring-4 ring-slate-100 overflow-hidden bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-400">
                                {profileData.photo_url ? (
                                    <img
                                        src={profileData.photo_url}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    profileData.first_name?.charAt(0)?.toUpperCase() || 'U'
                                )}
                            </div>

                            <label
                                htmlFor="photo-upload"
                                className={`
                                    absolute bottom-0 right-0 p-2.5 rounded-full shadow-md text-white border-4 border-white cursor-pointer transition-all transform group-hover:scale-110 active:scale-95
                                    ${uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                                `}
                            >
                                <Camera size={16} />
                            </label>
                            <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                disabled={uploading}
                                className="hidden"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <h4 className="text-lg font-semibold text-slate-900">
                                {profileData.display_name || `${profileData.first_name} ${profileData.last_name}`.trim() || 'User Profile'}
                            </h4>
                            <p className="text-slate-500 text-sm font-medium font-mono bg-slate-100 px-2 py-0.5 rounded w-fit">
                                {profileData.email}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                                {uploading ? 'Uploading new photo...' : 'Click the camera icon to upload a new photo (max 2MB)'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Personal Information Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-semibold text-slate-800">Personal Information</h3>
                </div>

                <div className="p-8">
                    <form onSubmit={handleProfileUpdate}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">First Name</label>
                                <input
                                    type="text"
                                    value={profileData.first_name}
                                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                                    placeholder="John"
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Last Name</label>
                                <input
                                    type="text"
                                    value={profileData.last_name}
                                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                                    placeholder="Doe"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Display Name</label>
                                <input
                                    type="text"
                                    value={profileData.display_name}
                                    onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                                />
                                <p className="text-xs text-slate-400">How your name appears on the platform</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 flex justify-between">
                                    Email Address <span className="text-xs font-normal text-slate-400">(Read only)</span>
                                </label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    disabled
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                                <input
                                    type="tel"
                                    value={profileData.phone_number}
                                    onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                                    placeholder="+91 98765 43210"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Role</label>
                                <select
                                    value={profileData.role}
                                    onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 cursor-pointer"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Status</label>
                                <select
                                    value={profileData.status}
                                    onChange={(e) => setProfileData({ ...profileData, status: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 cursor-pointer"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Joining Date</label>
                                <input
                                    type="text"
                                    value={profileData.joining_date ? new Date(profileData.joining_date).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    }) : 'Not available'}
                                    disabled
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {customFields.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <h4 className="text-base font-semibold text-slate-800 mb-6">Additional Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    {customFields.map(field => (
                                        <div key={field.id} className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">{field.field_label}</label>

                                            {field.field_type === 'select' ? (
                                                <select
                                                    value={customData[field.field_key] || ''}
                                                    onChange={(e) => setCustomData({ ...customData, [field.field_key]: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900"
                                                >
                                                    <option value="">Select {field.field_label}</option>
                                                    {Array.isArray(field.field_options) && field.field_options.map((opt, idx) => (
                                                        <option key={idx} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            ) : field.field_type === 'textarea' ? (
                                                <textarea
                                                    value={customData[field.field_key] || ''}
                                                    onChange={(e) => setCustomData({ ...customData, [field.field_key]: e.target.value })}
                                                    rows={3}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 resize-none"
                                                />
                                            ) : (
                                                <input
                                                    type={field.field_type}
                                                    value={customData[field.field_key] || ''}
                                                    onChange={(e) => setCustomData({ ...customData, [field.field_key]: e.target.value })}
                                                    placeholder={field.placeholder}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                                                />
                                            )}
                                            {field.help_text && (
                                                <p className="text-xs text-slate-400">{field.help_text}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                            >
                                <Save size={18} />
                                {loading ? 'Saving Changes...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-semibold text-slate-800">Change Password</h3>
                </div>

                <div className="p-8">
                    <form onSubmit={handlePasswordChange}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    placeholder="Enter new password"
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                                />
                                <p className="text-xs text-slate-400">Minimum 6 characters</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    placeholder="Re-enter new password"
                                    required
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm text-slate-900 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 border border-slate-200 focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <Lock size={18} />
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SettingsProfile;
