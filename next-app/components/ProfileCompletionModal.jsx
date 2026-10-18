'use client';

import React, { useState } from 'react';
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const ProfileCompletionModal = ({ isOpen, onClose, missingFields = [], onSuccess }) => {
    const supabase = createClientComponentClient();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [community, setCommunity] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [pstm, setPstm] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [photoUrl, setPhotoUrl] = useState(null);

    // If "community" is not missing, we don't show the dropdown (unless we want to allow edit, but logic says only ask if missing)
    const showCommunity = missingFields.includes('community');
    const showPhoto = missingFields.includes('photo_url');
    const showDob = missingFields.includes('birth_date');
    const showGender = missingFields.includes('gender');
    const showPstm = missingFields.includes('pstm');

    if (!isOpen) return null;

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `profile-photos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('public-assets') // Adjust bucket if needed
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('public-assets')
                .getPublicUrl(filePath);

            setPhotoUrl(publicUrl);
            showToast('Photo uploaded successfully!', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Failed to upload photo', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (showCommunity && !community) {
            showToast('Please select your community', 'error');
            return;
        }
        if (showGender && !gender) {
            showToast('Please select your gender', 'error');
            return;
        }
        if (showDob && !dob) {
            showToast('Please enter your date of birth', 'error');
            return;
        }
        if (showPstm && pstm === null) {
            showToast('Please select PSTM status', 'error');
            return;
        }
        if (showPhoto && !photoUrl) {
            showToast('Please upload your photo', 'error');
            return;
        }

        setLoading(true);
        try {
            const updates = {};
            if (showCommunity) updates.community = community;
            if (showGender) updates.gender = gender;
            if (showDob) updates.birth_date = new Date(dob).toISOString();
            if (showPstm) updates.pstm = pstm === 'yes';
            if (showPhoto) updates.photo_url = photoUrl;

            // Mark verification status as pending/self-verified
            // We can update the verification_status json too if needed
            // For now just updating the main columns satisfies the Gatekeeper

            const { error } = await supabase
                .from('members')
                .update(updates)
                .eq('auth_user_id', user.id);

            if (error) throw error;

            showToast('Profile updated!', 'success');
            onSuccess(); // Callback to retry the original action (Buy/Apply)
            onClose();

        } catch (error) {
            console.error('Update error:', error);
            showToast('Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-white flex justify-between items-start sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <AlertCircle size={24} />
                            Complete Profile
                        </h2>
                        <p className="text-blue-100 text-sm mt-1">Required to proceed with your application.</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {showPstm && (
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-700">Studied in Tamil Medium (PSTM)?</label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setPstm('yes')}
                                    className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${pstm === 'yes' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setPstm('no')}
                                    className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${pstm === 'no' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    )}

                    {showPhoto && (
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-700">Upload Photo</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                {photoUrl ? (
                                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md">
                                        <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-xs opacity-0 hover:opacity-100 transition-opacity">Change</div>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                        {uploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                                    </div>
                                )}
                                <span className="text-sm text-slate-500 font-medium">
                                    {photoUrl ? 'Click to change photo' : 'Click to upload passport size photo'}
                                </span>
                            </div>
                        </div>
                    )}

                    {showDob && (
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-700">Date of Birth</label>
                            <input
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-4 font-medium outline-none"
                            />
                        </div>
                    )}

                    {showGender && (
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-700">Gender</label>
                            <div className="relative">
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-4 font-medium outline-none"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    )}

                    {showCommunity && (
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-slate-700">Select Community</label>
                            <div className="relative">
                                <select
                                    value={community}
                                    onChange={(e) => setCommunity(e.target.value)}
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-4 font-medium outline-none"
                                >
                                    <option value="">Select Community</option>
                                    <option value="OC">OC (Open Competition)</option>
                                    <option value="BC">BC (Backward Class)</option>
                                    <option value="BCM">BCM (Backward Class Muslim)</option>
                                    <option value="MBC">MBC / DNC</option>
                                    <option value="SC">SC (Scheduled Caste)</option>
                                    <option value="SCA">SCA (Scheduled Caste Arunthathiyar)</option>
                                    <option value="ST">ST (Scheduled Tribe)</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || uploading || (showPhoto && !photoUrl) || (showCommunity && !community)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        Save & Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileCompletionModal;
