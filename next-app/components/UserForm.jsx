'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Camera, X, Save, Eye, CheckCircle, ZoomIn, ZoomOut, User, Mail, Phone, MapPin, Calendar, Lock, Hash, Globe, Building, Trophy, Plus, Trash2, Crop } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BatchMultiSelect from './BatchMultiSelect';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';

const UserForm = ({
    initialData = {},
    mode = 'create',
    onSubmit,
    loading = false,
    title = 'Add a new member',

    subtitle = 'Fill in the details to create a new user account.',
    redirectUrl = '/members',
    backPath = '/members'
}) => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        display_name: '',
        email: '',
        phone_number: '',
        birth_date: '',
        gender: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
        role: 'student',
        batches: [],
        sendEmail: false,
        sendSMS: false,
        photo: null,
        expiryDate: ''
    });

    const [photoPreview, setPhotoPreview] = useState(null);
    const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Filter/Crop State
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                // Ensure batches is an array
                batches: Array.isArray(initialData.batches) ? initialData.batches : []
            }));
            if (initialData.photo_url) {
                setCurrentPhotoUrl(initialData.photo_url);
            }
        }
    }, [initialData]);

    // Auto-generate display name from first name + last name
    useEffect(() => {
        const firstName = formData.first_name?.trim() || '';
        const lastName = formData.last_name?.trim() || '';
        const autoDisplayName = [firstName, lastName].filter(Boolean).join(' ');

        if (autoDisplayName && autoDisplayName !== formData.display_name) {
            setFormData(prev => ({ ...prev, display_name: autoDisplayName }));
        }
    }, [formData.first_name, formData.last_name]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, photo: file, removePhoto: false }));
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropImageSrc(reader.result);
                setIsCropModalOpen(true);
            });
            reader.readAsDataURL(file);
        }
        // clear input value to allow re-uploading same file
        e.target.value = null;
    };

    const handleSaveCrop = async () => {
        if (!croppedAreaPixels) {
            alert("Please wait for the image to load completely.");
            return;
        }

        try {
            const croppedImageBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);

            if (!croppedImageBlob) {
                throw new Error("Failed to generate cropped image blob");
            }

            // Create a file from the blob
            const file = new File([croppedImageBlob], "profile_photo.jpg", { type: "image/jpeg" });

            setFormData(prev => ({ ...prev, photo: file }));
            setPhotoPreview(URL.createObjectURL(croppedImageBlob));
            setIsCropModalOpen(false);
            setCropImageSrc(null);
        } catch (e) {
            console.error("Cropping error details:", e);
            alert(`Failed to crop image: ${e.message || 'Unknown error'}`);
        }
    };

    const handleCloseCrop = () => {
        setIsCropModalOpen(false);
        setCropImageSrc(null);
    };

    const handleCropExisting = () => {
        const source = photoPreview || currentPhotoUrl;
        if (source) {
            setCropImageSrc(source);
            setIsCropModalOpen(true);
        }
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setCurrentPhotoUrl(null);
        setFormData(prev => ({ ...prev, photo: null, removePhoto: true }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.username) newErrors.username = 'Username is required';
        if (mode === 'create' && !formData.password) newErrors.password = 'Password is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLegacySync = async (achievement) => {
        if (!initialData.id || !achievement.exam_name) {
            alert("Member ID and Exam Name are required to sync.");
            return;
        }

        try {
            const res = await fetch('/api/admin/exams/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memberId: initialData.id,
                    examTag: achievement.exam_name, // Mapping exam name to tag for legacy
                    examName: achievement.exam_name,
                    rank: achievement.rank,
                    year: achievement.year,
                    quote: achievement.quote,
                    action: 'promote'
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Synced to Public Gallery successfully!');
            } else {
                alert('Sync failed: ' + data.error);
            }
        } catch (err) {
            console.error('Sync error:', err);
            alert('Failed to sync. Check console for details.');
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        const result = await onSubmit(formData);
        setIsSaving(false);

        if (result && result.success) {
            setShowSuccess(true);
            setTimeout(() => {
                router.push(redirectUrl);
            }, 1500);
        } else if (result && result.error) {
            alert('Error: ' + result.error);
        }
    };

    return (
        <div className="min-h-screen">
            <div className="pb-10">
                {/* Success Notification */}
                {showSuccess && (
                    <div className="fixed top-5 right-5 bg-emerald-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-[9999] animate-in slide-in-from-right-10 duration-300">
                        <CheckCircle size={24} />
                        <span className="font-medium text-lg">
                            {mode === 'create' ? 'Member created successfully!' : 'Member updated successfully!'}
                        </span>
                    </div>
                )}

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8 pt-6">
                        <button
                            onClick={() => router.push(backPath)}
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                            <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center p-20 text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                                <span>Loading form...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 md:p-8">
                                {/* Photo Upload Section */}
                                <div className="flex flex-col items-center mb-8">
                                    <div className="relative mb-4 group">
                                        <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                                            {photoPreview || currentPhotoUrl ? (
                                                <img
                                                    src={photoPreview || currentPhotoUrl}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Camera size={32} className="text-slate-300" />
                                            )}
                                        </div>
                                        {(photoPreview || currentPhotoUrl) && (
                                            <button
                                                onClick={handleRemovePhoto}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors z-10"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                        id="photo-upload"
                                    />
                                    <div className="flex gap-3">
                                        <label
                                            htmlFor="photo-upload"
                                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm flex items-center gap-2"
                                        >
                                            <Camera size={16} />
                                            {currentPhotoUrl || photoPreview ? 'Change Photo' : 'Upload Photo'}
                                        </label>
                                        {(currentPhotoUrl || photoPreview) && (
                                            <button
                                                type="button"
                                                onClick={handleCropExisting}
                                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                                            >
                                                <Crop size={16} />
                                                Crop Photo
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Form Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    {/* Left Column: Personal Info */}
                                    <div className="space-y-6">
                                        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                                            <User size={18} className="text-blue-500" /> Personal Information
                                        </h3>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">First Name</label>
                                            <div className="relative">
                                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="first_name"
                                                    value={formData.first_name}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                    placeholder="Enter first name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">Last Name</label>
                                            <div className="relative">
                                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="last_name"
                                                    value={formData.last_name}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                    placeholder="Enter last name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">Display Name</label>
                                            <input
                                                type="text"
                                                name="display_name"
                                                value={formData.display_name}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed shadow-sm"
                                                placeholder="Auto-generated name"
                                                disabled
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">Email Address</label>
                                            <div className="relative">
                                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                    placeholder="name@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">Mobile Number</label>
                                            <div className="relative">
                                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="phone_number"
                                                    value={formData.phone_number || formData.mobile || ''}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                    placeholder="+91 XXXXX XXXXX"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">Birth Date</label>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="date"
                                                    name="birth_date"
                                                    value={formData.birth_date}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Account Info */}
                                    <div className="space-y-6">
                                        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                                            <Lock size={18} className="text-blue-500" /> Account Details
                                        </h3>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">Username <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleChange}
                                                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm ${mode === 'edit' ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                                                        }`}
                                                    placeholder="Enter username"
                                                    disabled={mode === 'edit'}
                                                />
                                            </div>
                                            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Password {mode === 'create' && <span className="text-red-500">*</span>}
                                            </label>
                                            <div className="relative">
                                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                    placeholder={mode === 'edit' ? "Leave blank to keep current" : "Enter password"}
                                                />
                                                <Eye size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600" />
                                            </div>
                                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">Role</label>
                                            <select
                                                name="role"
                                                value={formData.role || formData.status}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white"
                                            >
                                                <option value="Student">Student</option>
                                                <option value="Staff">Staff</option>
                                                <option value="Mentor">Mentor</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">Gender</label>
                                            <select
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white"
                                            >
                                                <option value="">Select gender</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                                <option value="prefer_not_to_say">Prefer not to say</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-slate-700">Batches</label>
                                            <BatchMultiSelect
                                                selectedBatches={formData.batches}
                                                onChange={(newBatches) => setFormData(prev => ({ ...prev, batches: newBatches }))}
                                            />
                                        </div>

                                        {mode === 'create' && (
                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-slate-700">Expiry Date</label>
                                                <div className="relative">
                                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="date"
                                                        name="expiryDate"
                                                        value={formData.expiryDate}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Achiever Badge Section */}
                                        <div className="pt-4 border-t border-slate-100 mt-4">
                                            <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                                <Trophy size={18} className="text-amber-500" /> Achiever Badge
                                            </h3>

                                            <label className="flex items-center gap-3 cursor-pointer group mb-4">
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        name="is_achiever"
                                                        checked={formData.is_achiever || false}
                                                        onChange={handleChange}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">Mark as Achiever</span>
                                            </label>

                                            {(formData.is_achiever) && (
                                                <div className="space-y-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Achievements</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({
                                                                ...prev,
                                                                achievements: [...(prev.achievements || []), { exam_name: '', rank: '', year: '', quote: '' }]
                                                            }))}
                                                            className="text-xs flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded-md transition-colors"
                                                        >
                                                            <Plus size={14} /> Add Exam
                                                        </button>
                                                    </div>

                                                    {(formData.achievements || []).map((achievement, index) => (
                                                        <div key={index} className="relative bg-white p-3 rounded-lg border border-amber-200 shadow-sm space-y-3">
                                                            <div className="absolute top-2 right-2 flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleLegacySync(achievement)}
                                                                    className="text-blue-400 hover:text-blue-600 transition-colors"
                                                                    title="Sync to Public Gallery"
                                                                >
                                                                    <RefreshCw size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newAchievements = [...formData.achievements];
                                                                        newAchievements.splice(index, 1);
                                                                        setFormData(prev => ({ ...prev, achievements: newAchievements }));
                                                                    }}
                                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-xs text-slate-500">Exam Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={achievement.exam_name}
                                                                        onChange={(e) => {
                                                                            const newAchievements = [...formData.achievements];
                                                                            newAchievements[index].exam_name = e.target.value;
                                                                            setFormData(prev => ({ ...prev, achievements: newAchievements }));
                                                                        }}
                                                                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                                                        placeholder="e.g. UPSC CSE"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-xs text-slate-500">Rank</label>
                                                                    <input
                                                                        type="text"
                                                                        value={achievement.rank}
                                                                        onChange={(e) => {
                                                                            const newAchievements = [...formData.achievements];
                                                                            newAchievements[index].rank = e.target.value;
                                                                            setFormData(prev => ({ ...prev, achievements: newAchievements }));
                                                                        }}
                                                                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                                                        placeholder="e.g. AIR 5"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-xs text-slate-500">Year</label>
                                                                    <input
                                                                        type="text"
                                                                        value={achievement.year}
                                                                        onChange={(e) => {
                                                                            const newAchievements = [...formData.achievements];
                                                                            newAchievements[index].year = e.target.value;
                                                                            setFormData(prev => ({ ...prev, achievements: newAchievements }));
                                                                        }}
                                                                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                                                        placeholder="e.g. 2024"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-xs text-slate-500">Quote (Optional)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={achievement.quote}
                                                                        onChange={(e) => {
                                                                            const newAchievements = [...formData.achievements];
                                                                            newAchievements[index].quote = e.target.value;
                                                                            setFormData(prev => ({ ...prev, achievements: newAchievements }));
                                                                        }}
                                                                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                                                        placeholder="Inspiring quote..."
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(formData.achievements || []).length === 0 && (
                                                        <div className="text-center py-4 text-sm text-slate-500 bg-white/50 rounded-lg border border-dashed border-amber-200">
                                                            No achievements added yet.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Full Width Address Fields */}
                                    <div className="col-span-1 md:col-span-2 space-y-6 pt-2">
                                        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                                            <MapPin size={18} className="text-blue-500" /> Address Information
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-slate-700">Address Line 1</label>
                                                <div className="relative">
                                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        name="address1"
                                                        value={formData.address1}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                        placeholder="Street address, building name"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-slate-700">Address Line 2</label>
                                                <div className="relative">
                                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        name="address2"
                                                        value={formData.address2}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                        placeholder="Apartment, suite, floor (optional)"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-slate-700">City</label>
                                                <div className="relative">
                                                    <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        name="city"
                                                        value={formData.city}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                        placeholder="City"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-slate-700">State</label>
                                                <div className="relative">
                                                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        name="state"
                                                        value={formData.state}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                        placeholder="State"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-slate-700">ZIP Code</label>
                                                <div className="relative">
                                                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        name="zip"
                                                        value={formData.zip}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                                        placeholder="ZIP"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notifications (Create Mode Only) */}
                                    {mode === 'create' && (
                                        <div className="col-span-1 md:col-span-2 mt-4 p-5 bg-blue-50/50 rounded-xl border border-blue-100">
                                            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                                <Mail size={16} /> Notification Preferences
                                            </h3>
                                            <div className="flex flex-col sm:flex-row gap-6">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        name="sendEmail"
                                                        checked={formData.sendEmail}
                                                        onChange={handleChange}
                                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 transition-all"
                                                    />
                                                    <span className="text-sm text-slate-700 group-hover:text-blue-700 transition-colors">Send Email (Username & Password)</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        name="sendSMS"
                                                        checked={formData.sendSMS}
                                                        onChange={handleChange}
                                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 transition-all"
                                                    />
                                                    <span className="text-sm text-slate-700 group-hover:text-blue-700 transition-colors">Send SMS (Username & Password)</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm z-10 px-8 py-4 -mx-8 -mb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                    <button
                                        className="px-5 py-2.5 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                        onClick={() => router.push(backPath)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        onClick={handleSubmit}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                <span>{mode === 'create' ? 'Create Member' : 'Save Changes'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Crop Modal */}
            {isCropModalOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-[500px] aspect-square bg-neutral-800 rounded-xl overflow-hidden shadow-2xl mb-6">
                        <Cropper
                            image={cropImageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>

                    <div className="w-full max-w-[500px] flex flex-col gap-5 px-4">
                        <div className="flex items-center gap-3 text-white">
                            <ZoomOut size={20} className="text-neutral-400" />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(e.target.value)}
                                className="w-full accent-blue-500 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <ZoomIn size={20} className="text-neutral-400" />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                className="px-5 py-2.5 bg-transparent border border-neutral-600 text-white hover:bg-neutral-800 rounded-lg text-sm font-medium transition-colors"
                                onClick={handleCloseCrop}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                                onClick={handleSaveCrop}
                            >
                                Save Photo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserForm;
