'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../supabaseClient';
import { useInstitute } from '../context/InstituteContext';
import { useCustomFields } from '../context/CustomFieldsContext';
import { User, Mail, Lock, ArrowRight, Loader2, Upload, FileText, Phone, MapPin, Calendar } from 'lucide-react';
import { CITY_STATE_MAP } from '../utils/cityStateMap';
import { ImageCropper } from './ui';

const StudentSignup = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { institute } = useInstitute();
    const { getEnabledFields, loading: fieldsLoading } = useCustomFields();

    const [customFields, setCustomFields] = useState([]);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [countryCodes, setCountryCodes] = useState({}); // Store country codes for phone fields
    const DEFAULT_COUNTRY_CODE = '+91';

    // Initialize form data with enabled fields
    useEffect(() => {
        if (fieldsLoading) return; // Wait for fields to load

        const fields = getEnabledFields();
        setCustomFields(fields);

        // Initialize formData with empty values for all fields
        const initialData = {
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            confirmPassword: ''
        };
        const initialCountryCodes = {};

        fields.forEach(field => {
            if (field.field_key !== 'photo') {
                initialData[field.field_key] = '';
            }
            // Initialize country code for phone fields
            if (field.field_type === 'tel' || field.field_key.includes('phone') || field.field_key.includes('mobile')) {
                initialCountryCodes[field.field_key] = DEFAULT_COUNTRY_CODE;
            }
        });
        setFormData(initialData);
        setCountryCodes(initialCountryCodes);
    }, [fieldsLoading, getEnabledFields]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Auto-select state if city changes
            if (name === 'city' && CITY_STATE_MAP[value]) {
                const mappedState = CITY_STATE_MAP[value];
                // Only set state if the state field exists in customFields (is enabled)
                const isStateEnabled = customFields.some(f => f.field_key === 'state');
                if (isStateEnabled) {
                    newData.state = mappedState;
                }
            }

            return newData;
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setTempImage(reader.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedBlob) => {
        // Convert blob to File object for uploading
        const file = new File([croppedBlob], 'profile_photo.jpg', { type: 'image/jpeg' });
        setPhotoFile(file);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(croppedBlob));
        setShowCropper(false);
    };

    const uploadPhoto = async (userId) => {
        if (!photoFile) return null;

        try {
            const formData = new FormData();
            formData.append('file', photoFile);
            formData.append('folder', 'profiles');

            // Import server action dynamically
            const { uploadImage } = await import('../app/actions/images');

            const result = await uploadImage(formData);

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            return result.url;
        } catch (error) {
            console.error('Error uploading photo:', error);
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Validate required fields
        const requiredFields = customFields.filter(f => f.is_required);
        for (const field of requiredFields) {
            if (field.field_type === 'file') {
                if (!photoFile) {
                    setError(`${field.field_label} is required`);
                    return;
                }
            } else if (!formData[field.field_key]) {
                setError(`${field.field_label} is required`);
                return;
            }
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        role: 'student'
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Upload photo if provided
                let photo_url = null;
                if (photoFile) {
                    photo_url = await uploadPhoto(authData.user.id);
                }

                // 3. Prepare data for update (map to native columns vs custom_data)
                const nativeFields = [
                    'first_name', 'last_name', 'username', 'email', 'phone_number',
                    'address1', 'address2', 'city', 'state', 'state_code', 'zip',
                    'birth_date', 'gender', 'photo_id_proof'
                ];

                const updates = {};
                const custom_data = {};

                Object.keys(formData).forEach(key => {
                    if (['password', 'confirmPassword', 'photo'].includes(key)) return;

                    let dbKey = key;
                    let value = formData[key];

                    // Field Mappings
                    if (key === 'mobile' || key === 'phone') dbKey = 'phone_number';
                    if (key === 'dob') dbKey = 'birth_date';
                    if (key === 'pincode' || key === 'zipcode') dbKey = 'zip';
                    if (key === 'address') dbKey = 'address1';

                    // Handle Phone Number with Country Code
                    if ((key.includes('phone') || key.includes('mobile')) && countryCodes[key]) {
                        value = `${countryCodes[key]} ${value}`;
                        dbKey = 'phone_number'; // Force map to phone_number if it looks like a phone field
                    }

                    if (nativeFields.includes(dbKey)) {
                        updates[dbKey] = value;
                    } else if (['first_name', 'last_name', 'email'].includes(key)) {
                        // Already handled or standard, ensure they are in updates if needed (email is unique key though)
                    } else if (value) {
                        // Only add to custom_data if it has a value
                        custom_data[key] = value;
                    }
                });

                // 4. Update members table
                updates.auth_user_id = authData.user.id; // CRITICAL: Link auth user to member record
                if (photo_url) updates.photo_url = photo_url;
                if (Object.keys(custom_data).length > 0) updates.custom_data = custom_data;

                if (Object.keys(updates).length > 0) {
                    const { error: updateError } = await supabase
                        .from('members')
                        .update(updates)
                        .eq('email', formData.email);

                    if (updateError) {
                        console.error('Error updating member data:', updateError);
                    }
                }

                // 5. Send Welcome Email (Dynamic Template)
                try {
                    fetch('/api/student/welcome', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: formData.email,
                            first_name: formData.first_name,
                            last_name: formData.last_name,
                            institute_name: institute?.name,
                            login_url: `${window.location.origin}/login`
                        })
                    }).catch(err => console.error('Failed to trigger welcome email:', err));

                } catch (emailErr) {
                    console.error('Error triggering welcome email:', emailErr);
                }

                setSuccessMessage('Account created successfully! Please check your email to confirm your account before logging in.');

                const redirectUrl = searchParams.get('redirect');
                const loginLink = redirectUrl ? `/login?redirect=${redirectUrl}` : '/login';

                setTimeout(() => {
                    router.push(loginLink);
                }, 5000);
            }
        } catch (err) {
            console.error('Signup error:', err);
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    const getIconForField = (fieldKey, fieldType) => {
        if (fieldKey === 'first_name' || fieldKey === 'last_name' || fieldKey.includes('name')) return <User size={18} />;
        if (fieldKey === 'email') return <Mail size={18} />;
        if (fieldKey.includes('phone') || fieldKey.includes('mobile')) return <Phone size={18} />;
        if (fieldKey.includes('address') || fieldKey.includes('city') || fieldKey.includes('state')) return <MapPin size={18} />;
        if (fieldKey.includes('date') || fieldKey.includes('dob')) return <Calendar size={18} />;
        if (fieldType === 'file') return <Upload size={18} />;
        return <FileText size={18} />;
    };

    const renderField = (field) => {
        const commonInputStyles = {
            width: '100%',
            padding: '12px 12px 12px 40px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            backgroundColor: '#f9fafb'
        };

        const icon = getIconForField(field.field_key, field.field_type);

        // Skip password and confirmPassword as they're handled separately
        if (field.field_key === 'password' || field.field_key === 'confirm_password') {
            return null;
        }

        // Handle Phone Fields specifically
        if (field.field_type === 'tel' || field.field_key.includes('phone') || field.field_key.includes('mobile')) {
            return (
                <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                    {/* Country Code Dropdown */}
                    <div style={{ position: 'relative', minWidth: '100px' }}>
                        <select
                            value={countryCodes[field.field_key] || DEFAULT_COUNTRY_CODE}
                            onChange={(e) => setCountryCodes({ ...countryCodes, [field.field_key]: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px 24px 12px 12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: '#f9fafb',
                                appearance: 'none', // Remove default arrow in some browsers
                                cursor: 'pointer'
                            }}
                        >
                            <option value="+91">+91 (IN)</option>
                            <option value="+1">+1 (US)</option>
                            <option value="+44">+44 (UK)</option>
                            <option value="+61">+61 (AU)</option>
                            <option value="+81">+81 (JP)</option>
                            <option value="+86">+86 (CN)</option>
                            <option value="+971">+971 (AE)</option>
                        </select>
                        <div style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#6b7280',
                            fontSize: '10px'
                        }}>
                            ▼
                        </div>
                    </div>

                    {/* Phone Input */}
                    <div style={{ position: 'relative', flex: 1 }}>
                        <div style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af'
                        }}>
                            {icon}
                        </div>
                        <input
                            type="tel"
                            name={field.field_key}
                            value={formData[field.field_key] || ''}
                            onChange={handleChange}
                            required={field.is_required}
                            placeholder={field.placeholder || '12345 67890'}
                            style={{ ...commonInputStyles }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--primary-color)';
                                e.target.style.backgroundColor = 'white';
                                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.backgroundColor = '#f9fafb';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                </div>
            );
        }

        switch (field.field_type) {
            case 'textarea':
                return (
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            left: '12px',
                            top: '12px',
                            color: '#9ca3af'
                        }}>
                            {icon}
                        </div>
                        <textarea
                            name={field.field_key}
                            value={formData[field.field_key] || ''}
                            onChange={handleChange}
                            required={field.is_required}
                            placeholder={field.placeholder}
                            rows={4}
                            style={{ ...commonInputStyles, paddingLeft: '40px' }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--primary-color)';
                                e.target.style.backgroundColor = 'white';
                                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.backgroundColor = '#f9fafb';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                );

            case 'select':
                const options = Array.isArray(field.field_options) ? field.field_options : [];
                return (
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af',
                            pointerEvents: 'none'
                        }}>
                            {icon}
                        </div>
                        <select
                            name={field.field_key}
                            value={formData[field.field_key] || ''}
                            onChange={handleChange}
                            required={field.is_required}
                            style={commonInputStyles}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--primary-color)';
                                e.target.style.backgroundColor = 'white';
                                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.backgroundColor = '#f9fafb';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            <option value="">{field.placeholder || 'Select an option'}</option>
                            {options.map((option, idx) => (
                                <option key={idx} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                );

            case 'file':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {previewUrl && (
                            <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '3px solid white',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                alignSelf: 'center',
                                backgroundColor: '#f3f4f6'
                            }}>
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                        )}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9ca3af'
                            }}>
                                {icon}
                            </div>
                            <input
                                type="file"
                                id={`file-${field.field_key}`}
                                accept="image/*"
                                onChange={handleFileChange}
                                required={field.is_required && !photoFile}
                                style={{
                                    ...commonInputStyles,
                                    padding: '9px 12px 9px 40px',
                                    cursor: 'pointer'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--primary-color)';
                                    e.target.style.backgroundColor = 'white';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.backgroundColor = '#f9fafb';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>
                );

            default:
                return (
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af'
                        }}>
                            {icon}
                        </div>
                        <input
                            type={field.field_type}
                            name={field.field_key}
                            value={formData[field.field_key] || ''}
                            onChange={handleChange}
                            required={field.is_required}
                            placeholder={field.placeholder}
                            style={commonInputStyles}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--primary-color)';
                                e.target.style.backgroundColor = 'white';
                                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.backgroundColor = '#f9fafb';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                );
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            // alignItems: 'center', // REMOVED to prevent clipping
            // justifyContent: 'center', // REMOVED
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            padding: '20px',
            overflowY: 'auto'
        }}>
            <div style={{
                margin: 'auto', // Safe centering
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.05), 0 5px 10px rgba(0,0,0,0.01)',
                width: '100%',
                maxWidth: '500px',
                // maxHeight: '90vh', // REMOVED: Let the page scroll naturally
                // overflowY: 'auto', // REMOVED
                transition: 'transform 0.3s ease',
            }}>
                {/* Institute Branding */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {institute?.logo_url ? (
                        // Header provided by LayoutWrapper.jsx
                        <img
                            src={institute.logo_url}
                            alt="Logo"
                            style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '16px', display: 'block', margin: '0 auto 16px' }}
                        />
                    ) : institute?.name ? (
                        <div style={{
                            width: '70px',
                            height: '70px',
                            margin: '0 auto 16px',
                            background: 'linear-gradient(135deg, var(--primary-color) 0%, #2563eb 100%)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '28px',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                        }}>
                            {institute.name.substring(0, 2).toUpperCase()}
                        </div>
                    ) : null}

                    <h1 style={{
                        fontSize: '26px',
                        fontWeight: '800',
                        marginBottom: '8px',
                        color: '#1a1a1a',
                        letterSpacing: '-0.5px'
                    }}>
                        Student Registration
                    </h1>
                    <p style={{
                        fontSize: '15px',
                        color: '#6b7280',
                        margin: '0',
                        lineHeight: '1.5'
                    }}>
                        Create your account to get started
                    </p>
                </div>

                {successMessage ? (
                    <div style={{
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #d1fae5',
                        color: '#047857',
                        padding: '20px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>{successMessage}</p>
                        <p style={{ fontSize: '14px', color: '#065f46' }}>Redirecting to login in 5 seconds...</p>
                        <Link href={loginLink} style={{ color: '#059669', fontWeight: 'bold', textDecoration: 'underline', marginTop: '10px', display: 'inline-block' }}>Go to Login now</Link>
                    </div>
                ) : fieldsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <Loader2 size={32} className="animate-spin text-[var(--primary-color)]" style={{ color: 'var(--primary-color)', animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div style={{
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fee2e2',
                                color: '#dc2626',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>⚠️</span> {error}
                            </div>
                        )}



                        {/* Render dynamic fields (excluding password as it is handled separately) */}
                        {customFields
                            .filter(field => !['password', 'confirm_password'].includes(field.field_key))
                            .map(field => (
                                <div key={field.id} style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}>
                                        {field.field_label} {field.is_required && <span style={{ color: '#ef4444' }}>*</span>}
                                    </label>
                                    {renderField(field)}
                                    {field.help_text && (
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                            {field.help_text}
                                        </p>
                                    )}
                                </div>
                            ))}

                        {/* Password fields (always shown) */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                Password <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9ca3af'
                                }}>
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Create a password"
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        backgroundColor: '#f9fafb'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary-color)';
                                        e.target.style.backgroundColor = 'white';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.backgroundColor = '#f9fafb';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9ca3af'
                                }}>
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="Confirm your password"
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        backgroundColor: '#f9fafb'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary-color)';
                                        e.target.style.backgroundColor = 'white';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.backgroundColor = '#f9fafb';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: loading ? '#93c5fd' : 'var(--primary-color)',
                                color: 'var(--button-text-color, #ffffff)',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
                            }}
                            onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-1px)')}
                            onMouseLeave={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    Create Account <ArrowRight size={18} />
                                </>
                            )}
                        </button>

                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                Already have an account?{' '}
                                <Link
                                    href={searchParams.get('redirect') ? `/login?redirect=${searchParams.get('redirect')}` : '/login'}
                                    style={{
                                        color: 'var(--primary-color)',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        transition: 'color 0.2s'
                                    }}
                                >
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </form>
                )}
            </div>

            {/* Photo Cropper Modal */}
            {showCropper && (
                <ImageCropper
                    imageSrc={tempImage}
                    aspect={1} // Square aspect ratio for profile photos
                    onCropComplete={handleCropComplete}
                    onCancel={() => setShowCropper(false)}
                />
            )}
        </div>
    );
};

export default StudentSignup;
