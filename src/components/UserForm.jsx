import React, { useState, useEffect } from 'react';
import { ChevronLeft, Camera, X, Save, Eye, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import BatchMultiSelect from './BatchMultiSelect';
import { INDIAN_STATES } from '../utils/indianStates';

const UserForm = ({
    initialData = {},
    mode = 'create',
    memberId = null,
    redirectUrl = null,
    backPath = null,
    onSubmit,
    loading = false,
    title = 'Add a new member',
    subtitle = 'Fill in the details to create a new user account.'
}) => {
    const navigate = useNavigate();
    const { id: routeId } = useParams();
    const effectiveMemberId = memberId || routeId || initialData?.id;
    const resolvedRedirectUrl = redirectUrl || (mode === 'edit' && effectiveMemberId ? `/members/${effectiveMemberId}` : '/members');
    const resolvedBackPath = backPath || (mode === 'edit' && effectiveMemberId ? `/members/${effectiveMemberId}` : '/members');
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        display_name: '',
        email: '',
        mobile: '',
        birth_date: '',
        gender: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
        status: 'Student',
        batches: [],
        sendEmail: false,
        sendSMS: false,
        photo: null,
        expiryDate: ''
    });

    const [photoPreview, setPhotoPreview] = useState(null);
    const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);

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
            setFormData(prev => ({ ...prev, photo: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setCurrentPhotoUrl(null);
        setFormData(prev => ({ ...prev, photo: null }));
    };

    const handleSubmit = async () => {
        // Basic validation
        if (!formData.username) {
            alert('Username is required');
            return;
        }
        if (mode === 'create' && !formData.password) {
            alert('Password is required for new users');
            return;
        }

        const result = await onSubmit(formData);
        if (result && result.success) {
            setShowSuccess(true);
            setTimeout(() => {
                navigate(resolvedRedirectUrl);
            }, 1500);
        } else if (result && result.error) {
            alert('Error: ' + result.error);
        }
    };

    return (
        <div className="container" style={{ padding: '24px 0 40px' }}>
            {/* Success Notification */}
            {showSuccess && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    padding: '16px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 9999,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <CheckCircle size={24} />
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>
                        {mode === 'create' ? 'Member created successfully!' : 'Member updated successfully!'}
                    </span>
                </div>
            )}

            {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                            <button
                                onClick={() => navigate(resolvedBackPath)}
                                className="btn-icon"
                                style={{ backgroundColor: 'white', border: '1px solid #e0e0e0' }}
                            >
                                <ChevronLeft size={20} color="#666" />
                            </button>
                            <div>
                                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{title}</h1>
                                <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>{subtitle}</p>
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#666' }}>
                                Loading...
                            </div>
                        ) : (
                            <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                                <div className="card-body" style={{ padding: '32px' }}>
                                    {/* Photo Upload Section */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                                            <div style={{
                                                width: '100px',
                                                height: '100px',
                                                borderRadius: '50%',
                                                backgroundColor: '#f5f5f5',
                                                border: '2px solid #e0e0e0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {photoPreview || currentPhotoUrl ? (
                                                    <img
                                                        src={photoPreview || currentPhotoUrl}
                                                        alt="Profile"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <Camera size={32} color="#ccc" />
                                                )}
                                            </div>
                                            {(photoPreview || currentPhotoUrl) && (
                                                <button
                                                    onClick={handleRemovePhoto}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        right: 0,
                                                        backgroundColor: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '24px',
                                                        height: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            style={{ display: 'none' }}
                                            id="photo-upload"
                                        />
                                        <label
                                            htmlFor="photo-upload"
                                            className="btn btn-outline"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {currentPhotoUrl || photoPreview ? 'Change Photo' : 'Upload Photo'}
                                        </label>
                                    </div>

                                    {/* Form Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        {/* Left Column: Personal Info */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Personal Information</h3>

                                            <div className="form-group">
                                                <label className="form-label">First Name</label>
                                                <input
                                                    type="text"
                                                    name="first_name"
                                                    value={formData.first_name}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    placeholder="Enter first name"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Last Name</label>
                                                <input
                                                    type="text"
                                                    name="last_name"
                                                    value={formData.last_name}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    placeholder="Enter last name"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Display Name</label>
                                                <input
                                                    type="text"
                                                    name="display_name"
                                                    value={formData.display_name}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    placeholder="Enter display name"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Email Address</label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    placeholder="name@example.com"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Mobile Number</label>
                                                <input
                                                    type="text"
                                                    name="mobile"
                                                    value={formData.mobile}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    placeholder="+91 XXXXX XXXXX"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Birth Date</label>
                                                <input
                                                    type="date"
                                                    name="birth_date"
                                                    value={formData.birth_date}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                />
                                            </div>
                                        </div>

                                        {/* Right Column: Account Info */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Account Details</h3>

                                            <div className="form-group">
                                                <label className="form-label">Username <span style={{ color: 'red' }}>*</span></label>
                                                <input
                                                    type="text"
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    placeholder="Enter username"
                                                    disabled={mode === 'edit'}
                                                    style={mode === 'edit' ? { backgroundColor: '#f9fafb' } : {}}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Password {mode === 'create' && <span style={{ color: 'red' }}>*</span>}</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="password"
                                                        name="password"
                                                        value={formData.password}
                                                        onChange={handleChange}
                                                        className="form-control"
                                                        placeholder={mode === 'edit' ? "Leave blank to keep current" : "Enter password"}
                                                    />
                                                    <Eye size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', cursor: 'pointer' }} />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Role</label>
                                                <select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                >
                                                    <option value="Student">Student</option>
                                                    <option value="Staff">Staff</option>
                                                    <option value="Mentor">Mentor</option>
                                                    <option value="Admin">Admin</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Gender</label>
                                                <select
                                                    name="gender"
                                                    value={formData.gender}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                >
                                                    <option value="">Select gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Batches</label>
                                                <BatchMultiSelect
                                                    selectedBatches={formData.batches}
                                                    onChange={(newBatches) => setFormData(prev => ({ ...prev, batches: newBatches }))}
                                                />
                                            </div>

                                            {mode === 'create' && (
                                                <div className="form-group">
                                                    <label className="form-label">Expiry Date</label>
                                                    <input
                                                        type="date"
                                                        name="expiryDate"
                                                        value={formData.expiryDate}
                                                        onChange={handleChange}
                                                        className="form-control"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Full Width Address Fields */}
                                        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Address Information</h3>

                                            <div className="form-group">
                                                <label className="form-label">Address Line 1</label>
                                                <input
                                                    type="text"
                                                    name="address1"
                                                    value={formData.address1}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    placeholder="Street address, building name"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Address Line 2</label>
                                                <input
                                                    type="text"
                                                    name="address2"
                                                    value={formData.address2}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    placeholder="Apartment, suite, floor (optional)"
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                                <div className="form-group">
                                                    <label className="form-label">City</label>
                                                    <input
                                                        type="text"
                                                        name="city"
                                                        value={formData.city}
                                                        onChange={handleChange}
                                                        className="form-control"
                                                        placeholder="City"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">State</label>
                                                    <select
                                                        name="state"
                                                        value={formData.state}
                                                        onChange={handleChange}
                                                        className="form-control"
                                                    >
                                                        <option value="">Select state</option>
                                                        {INDIAN_STATES.map(state => (
                                                            <option key={state.code} value={state.code}>
                                                                {state.name} ({state.code})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">ZIP Code</label>
                                                    <input
                                                        type="text"
                                                        name="zip"
                                                        value={formData.zip}
                                                        onChange={handleChange}
                                                        className="form-control"
                                                        placeholder="ZIP"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notifications (Create Mode Only) */}
                                        {mode === 'create' && (
                                            <div style={{ gridColumn: '1 / -1', marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Notifications</h3>
                                                <div style={{ display: 'flex', gap: '24px' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="sendEmail"
                                                            checked={formData.sendEmail}
                                                            onChange={handleChange}
                                                        />
                                                        Send Email (Username & Password)
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="sendSMS"
                                                            checked={formData.sendSMS}
                                                            onChange={handleChange}
                                                        />
                                                        Send SMS (Username & Password)
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{
                                        marginTop: '32px',
                                        paddingTop: '24px',
                                        borderTop: '1px solid #e0e0e0',
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: '12px'
                                    }}>
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => navigate(resolvedBackPath)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleSubmit}
                                            style={{ minWidth: '140px' }}
                                        >
                                            <Save size={18} /> {mode === 'create' ? 'Create Member' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
        </div>
    );
};

export default UserForm;
