import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useInstitute } from '../context/InstituteContext';
import { useCustomFields } from '../context/CustomFieldsContext';
import { User, Mail, Lock, ArrowRight, Loader2, Upload, FileText, Phone, MapPin, Calendar } from 'lucide-react';

const StudentSignup = () => {
    const navigate = useNavigate();
    const { institute } = useInstitute();
    const { getEnabledFields } = useCustomFields();

    const [customFields, setCustomFields] = useState([]);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Initialize form data with enabled fields
    useEffect(() => {
        const fields = getEnabledFields();
        setCustomFields(fields);

        // Initialize formData with empty values for all fields
        const initialData = { first_name: '', last_name: '', email: '', password: '', confirmPassword: '' };
        fields.forEach(field => {
            if (field.field_key !== 'photo') {
                initialData[field.field_key] = '';
            }
        });
        setFormData(initialData);
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
        }
    };

    const uploadPhoto = async (userId) => {
        if (!photoFile) return null;

        try {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${userId}.${fileExt}`;
            const filePath = `profiles/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('user-photos')
                .upload(filePath, photoFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('user-photos')
                .getPublicUrl(filePath);

            return publicUrl;
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
            if (field.field_key === 'photo') {
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

                // 3. Prepare custom data (exclude standard fields)
                const standardFields = ['first_name', 'last_name', 'email', 'password', 'confirmPassword', 'photo'];
                const custom_data = {};

                Object.keys(formData).forEach(key => {
                    if (!standardFields.includes(key) && formData[key]) {
                        custom_data[key] = formData[key];
                    }
                });

                // 4. Update members table with photo_url and custom_data
                if (photo_url || Object.keys(custom_data).length > 0) {
                    const updates = {};
                    if (photo_url) updates.photo_url = photo_url;
                    if (Object.keys(custom_data).length > 0) updates.custom_data = custom_data;

                    const { error: updateError } = await supabase
                        .from('members')
                        .update(updates)
                        .eq('email', formData.email);

                    if (updateError) {
                        console.error('Error updating member data:', updateError);
                    }
                }

                setSuccessMessage('Account created successfully! Please check your email to confirm your account before logging in.');
                setTimeout(() => {
                    navigate('/login');
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
                            accept="image/*"
                            onChange={handleFileChange}
                            required={field.is_required}
                            style={{ ...commonInputStyles, padding: '9px 12px 9px 40px' }} // Adjusted padding for file input
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
            minHeight: 'calc(100vh - var(--header-height))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.05), 0 5px 10px rgba(0,0,0,0.01)',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflowY: 'auto',
                transition: 'transform 0.3s ease',
            }}>
                {/* Institute Branding */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {institute?.logo_url ? (
                        <img
                            src={institute.logo_url}
                            alt="Logo"
                            style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '16px' }}
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
                        <Link to="/login" style={{ color: '#059669', fontWeight: 'bold', textDecoration: 'underline', marginTop: '10px', display: 'inline-block' }}>Go to Login now</Link>
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
                                color: 'white',
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
                                    to="/login"
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
        </div>
    );
};

export default StudentSignup;
