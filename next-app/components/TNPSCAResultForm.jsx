'use client';

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Upload, FileText, Phone, User, Calendar, Award, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { uploadImage } from '../app/actions/images';

const TNPSCAResultForm = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        whatsapp_number: '',
        registration_number: '',
        dob: '',
        overall_rank: '',
        communal_rank: '',
        community: '',
        department: '',
        gender: '',
        pstm_status: false
    });

    const [files, setFiles] = useState({
        photo: null,
        admit_card: null
    });

    const [previews, setPreviews] = useState({
        photo: null,
        admit_card: null
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setFiles(prev => ({ ...prev, [type]: file }));
            setPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Upload Files
            let photo_url = null;
            let admit_card_url = null;

            if (files.photo) {
                const photoData = new FormData();
                photoData.append('file', files.photo);
                photoData.append('folder', 'tnpsc/photos');
                const photoRes = await uploadImage(photoData);
                if (photoRes.success) photo_url = photoRes.url;
            }

            if (files.admit_card) {
                const admitData = new FormData();
                admitData.append('file', files.admit_card);
                admitData.append('folder', 'tnpsc/admit_cards');
                const admitRes = await uploadImage(admitData);
                if (admitRes.success) admit_card_url = admitRes.url;
            }

            // 2. Submit Data
            const { data, error: submitError } = await supabase
                .from('tnpsc_ae_results')
                .insert([{
                    ...formData,
                    overall_rank: parseInt(formData.overall_rank),
                    communal_rank: parseInt(formData.communal_rank),
                    photo_url,
                    admit_card_url
                }])
                .select()
                .single();

            if (submitError) throw submitError;

            if (onSuccess) onSuccess(data);

        } catch (err) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to submit results');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            {/* Header Branding */}
            <div className="bg-white p-2 border-b border-slate-100 flex justify-center">
                <img src="/images/tnpsc_header.png" alt="TNPSC Header" className="max-w-full h-auto" />
            </div>

            <div className="p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Result Analysis Form</h2>
                    <p className="text-slate-500 mt-1">Please fill in your details accurately as per your admit card</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 animate-shake">
                        <AlertCircle size={20} />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info Group */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block ml-1">Full Name</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    required
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Enter your full name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block ml-1">WhatsApp Number</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Phone size={18} />
                                </div>
                                <input
                                    required
                                    type="tel"
                                    name="whatsapp_number"
                                    value={formData.whatsapp_number}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="10-digit mobile number"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block ml-1">Registration Number</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <FileText size={18} />
                                </div>
                                <input
                                    required
                                    type="text"
                                    name="registration_number"
                                    value={formData.registration_number}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="From your admit card"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block ml-1">Date of Birth</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Calendar size={18} />
                                </div>
                                <input
                                    required
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rank Info Group */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block ml-1">Overall Rank</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Award size={18} />
                                </div>
                                <input
                                    required
                                    type="number"
                                    name="overall_rank"
                                    value={formData.overall_rank}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Enter overall rank"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block ml-1">Communal Rank</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Award size={18} />
                                </div>
                                <input
                                    required
                                    type="number"
                                    name="communal_rank"
                                    value={formData.communal_rank}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Enter communal rank"
                                />
                            </div>
                        </div>
                    </div>

                    {/* dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block ml-1">Community</label>
                            <select
                                required
                                name="community"
                                value={formData.community}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                            >
                                <option value="">Select Community</option>
                                <option value="GT">GT (General Turn)</option>
                                <option value="BC">BC (Backward Class)</option>
                                <option value="BCM">BCM (BC Muslims)</option>
                                <option value="MBC">MBC/DNC</option>
                                <option value="SC">SC (Scheduled Caste)</option>
                                <option value="SCA">SCA (SC Arunthathiyar)</option>
                                <option value="ST">ST (Scheduled Tribe)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block ml-1">Department</label>
                            <select
                                required
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                            >
                                <option value="">Select Department</option>
                                <option value="Civil">Assistant Engineer (Civil)</option>
                                <option value="Mechanical">Assistant Engineer (Mechanical)</option>
                                <option value="Electrical">Assistant Engineer (Electrical)</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                    </div>

                    {/* Gender & PSTM */}
                    <div className="flex flex-wrap items-center gap-8 py-2">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 block">Gender</label>
                            <div className="flex gap-4">
                                {['Male', 'Female', 'Others'].map((g) => (
                                    <label key={g} className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value={g}
                                            checked={formData.gender === g}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{g}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="pstm"
                                name="pstm_status"
                                checked={formData.pstm_status}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 transition-all"
                            />
                            <label htmlFor="pstm" className="text-sm font-semibold text-slate-700 cursor-pointer">
                                PSTM Candidate (Tamil Medium)
                            </label>
                        </div>
                    </div>

                    {/* File Uploads */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Upload size={16} /> Passport Size Photo
                            </label>
                            <div
                                onClick={() => document.getElementById('photo-upload').click()}
                                className={`relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${previews.photo ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
                            >
                                {previews.photo ? (
                                    <img src={previews.photo} alt="Photo" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <Upload className="text-slate-300 mb-2" size={32} />
                                        <span className="text-xs text-slate-500 font-medium">Click to upload image</span>
                                    </>
                                )}
                                <input id="photo-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} className="hidden" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <FileText size={16} /> Admit Card (PDF/Image)
                            </label>
                            <div
                                onClick={() => document.getElementById('admit-card-upload').click()}
                                className={`relative h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${previews.admit_card ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
                            >
                                {previews.admit_card ? (
                                    <div className="flex flex-col items-center gap-2 p-4 text-emerald-600">
                                        <CheckCircle2 size={32} />
                                        <span className="text-xs font-bold truncate max-w-[200px]">{files.admit_card.name}</span>
                                    </div>
                                ) : (
                                    <>
                                        <FileText className="text-slate-300 mb-2" size={32} />
                                        <span className="text-xs text-slate-500 font-medium">Click to upload document</span>
                                    </>
                                )}
                                <input id="admit-card-upload" type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'admit_card')} className="hidden" />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-blue-600 transform hover:-translate-y-0.5 transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-3 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={24} /> Submitting...
                            </>
                        ) : (
                            <>Analyze My Result</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TNPSCAResultForm;
