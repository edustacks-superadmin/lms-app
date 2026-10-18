import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ArrowLeft, Calendar, Plus, Upload, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useProductCategories } from '../context/ProductCategoryContext';

const CreateProduct = () => {
    const navigate = useNavigate();
    const { addProduct } = useProducts();
    const { categories, fetchCategories } = useProductCategories();
    const [submitError, setSubmitError] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        strikethroughPrice: '',
        parentProduct: '',
        shortDescription: '',
        description: '',
        startDate: '',
        endDate: '',
        tags: [],
        category: '',
        enableEmailNotification: false,
        offerName: '',
        price: '0.0',
        validityType: 'Relative (in days)',
        validity: '',
        pricingStartDate: '',
        pricingEndDate: ''
    });

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['link', 'image'],
            ['clean']
        ],
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDescriptionChange = (value) => {
        setFormData(prev => ({ ...prev, description: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);
        setUploading(true);
        console.log('Product Data:', formData);

        const result = await addProduct(formData, imageFile);
        if (result.success) {
            alert('Product created successfully!');
            navigate('/store');
        } else {
            setSubmitError('Error creating product: ' + result.error);
        }
        setUploading(false);
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '500',
        fontSize: '14px',
        color: '#333',
        textAlign: 'right',
        width: '200px',
        paddingRight: '20px'
    };

    const inputContainerStyle = {
        display: 'flex',
        marginBottom: '24px',
        alignItems: 'flex-start'
    };

    const inputStyle = {
        flex: 1,
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        maxWidth: '600px'
    };

    return (
        <div style={{ flex: 1, padding: '0', marginTop: '20px', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <button onClick={() => navigate('/store')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f0f0f0'} onMouseOut={(e) => e.currentTarget.style.background = 'none'}>
                    <ArrowLeft size={24} color="#333" />
                </button>
                <h1 style={{ fontSize: '24px', fontWeight: '400', margin: 0, color: '#1a1a1a' }}>Create a new product</h1>
            </div>

            <form onSubmit={handleSubmit} style={{ maxWidth: '1000px', paddingBottom: '40px' }}>
                {submitError && (
                    <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: '4px' }}>
                        {submitError}
                    </div>
                )}

                {/* Product Title */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Product Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        style={inputStyle}
                    />
                </div>

                {/* Product Slug */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Product Slug</label>
                    <div style={{ flex: 1, maxWidth: '600px' }}>
                        <input
                            type="text"
                            name="slug"
                            value={formData.slug}
                            onChange={handleChange}
                            style={{ ...inputStyle, width: '100%' }}
                        />
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Customize the product's link with a unique slug.</p>
                    </div>
                </div>

                {/* Strikethrough Price */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Strikethrough Price</label>
                    <div style={{ flex: 1, maxWidth: '600px' }}>
                        <input
                            type="number"
                            name="strikethroughPrice"
                            value={formData.strikethroughPrice}
                            onChange={handleChange}
                            onWheel={(e) => e.target.blur()}
                            style={{ ...inputStyle, width: '100%' }}
                        />
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>The price to be displayed in a strikethrough format</p>
                    </div>
                </div>

                {/* Parent Product */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Parent Product</label>
                    <div style={{ flex: 1, maxWidth: '600px' }}>
                        <select
                            name="parentProduct"
                            value={formData.parentProduct}
                            onChange={handleChange}
                            style={{ ...inputStyle, width: '100%' }}
                        >
                            <option value="">---------</option>
                            {/* Map parent products here */}
                        </select>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Only Choose parent product if you are creating the child product. For Example if this is the same course with some extra details like courier / a different venue</p>
                    </div>
                </div>

                {/* Short Description */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Short Description</label>
                    <textarea
                        name="shortDescription"
                        value={formData.shortDescription}
                        onChange={handleChange}
                        style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
                    />
                </div>

                {/* Description HTML */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Description html</label>
                    <div style={{ flex: 1, maxWidth: '600px' }}>
                        <ReactQuill
                            theme="snow"
                            value={formData.description}
                            onChange={handleDescriptionChange}
                            modules={modules}
                            style={{ height: '200px', marginBottom: '50px' }}
                        />
                    </div>
                </div>

                {/* Start Date */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Start Date</label>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '600px' }}>
                        <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                            style={{ ...inputStyle, width: '100%' }}
                        />
                    </div>
                </div>

                {/* End Date */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>End Date</label>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '600px' }}>
                        <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleChange}
                            style={{ ...inputStyle, width: '100%' }}
                        />
                    </div>
                </div>

                {/* Product Image */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Product Image</label>
                    <div style={{ flex: 1, maxWidth: '600px' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                            id="product-image-input"
                        />
                        <label
                            htmlFor="product-image-input"
                            style={{
                                width: '200px',
                                height: '150px',
                                backgroundColor: imagePreview ? 'transparent' : '#e0e0e0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                cursor: 'pointer',
                                border: '1px dashed #999',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <>
                                    <Package size={48} color="#ccc" style={{ marginBottom: '8px' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Upload size={16} color="#666" />
                                        <span style={{ fontWeight: 'bold', color: '#666' }}>Upload Image</span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Default icon used if none uploaded</span>
                                </>
                            )}
                        </label>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                            {imageFile ? imageFile.name : 'Click to upload image (JPG, PNG)'}
                        </p>
                    </div>
                </div>

                {/* Tags */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Tags</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '600px' }}>
                        <input
                            type="text"
                            style={{ ...inputStyle, width: '100%' }}
                            placeholder="Select tags (Coming soon)"
                            disabled
                        />
                        <Plus
                            size={20}
                            color="#ccc"
                            style={{ cursor: 'not-allowed', flexShrink: 0 }}
                            title="Tags management coming soon"
                        />
                    </div>
                </div>

                {/* Category */}
                <div style={inputContainerStyle}>
                    <label style={labelStyle}>Category</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '600px' }}>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            style={{ ...inputStyle, width: '100%' }}
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <Plus
                            size={20}
                            color="#28a745"
                            style={{ cursor: 'pointer', flexShrink: 0 }}
                            onClick={() => navigate('/store/categories')}
                        />
                    </div>
                </div>

                {/* Payment Notification */}
                <div style={{ marginTop: '40px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '400', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Payment success custom email notification</h3>
                    <div style={inputContainerStyle}>
                        <label style={labelStyle}>Enable</label>
                        <div style={{ flex: 1 }}>
                            <input
                                type="checkbox"
                                name="enableEmailNotification"
                                checked={formData.enableEmailNotification}
                                onChange={handleChange}
                                style={{ marginTop: '4px' }}
                            />
                            <span style={{ marginLeft: '8px', fontSize: '14px', color: '#666' }}>Enable custom email notification which is sent after successful payment</span>
                        </div>
                    </div>
                </div>

                {/* Pricing Details */}
                <div style={{ marginTop: '40px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '400', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Pricing details of the product</h3>

                    <div style={inputContainerStyle}>
                        <label style={labelStyle}>Offer Name</label>
                        <input
                            type="text"
                            name="offerName"
                            value={formData.offerName}
                            onChange={handleChange}
                            style={inputStyle}
                        />
                    </div>

                    <div style={inputContainerStyle}>
                        <label style={labelStyle}>Price</label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            onWheel={(e) => e.target.blur()}
                            style={inputStyle}
                        />
                    </div>

                    <div style={inputContainerStyle}>
                        <label style={labelStyle}>Purchase Validity Type</label>
                        <select
                            name="validityType"
                            value={formData.validityType}
                            onChange={handleChange}
                            style={inputStyle}
                        >
                            <option value="Relative (in days)">Relative (in days)</option>
                            <option value="Lifetime">Lifetime</option>
                        </select>
                    </div>

                    <div style={inputContainerStyle}>
                        <label style={labelStyle}>Validity</label>
                        <div style={{ flex: 1, maxWidth: '600px' }}>
                            <input
                                type="text"
                                name="validity"
                                value={formData.validity}
                                onChange={handleChange}
                                style={{ ...inputStyle, width: '100%' }}
                            />
                            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>User's product purchase validity will expire after the specified number of days. Leave blank for lifetime access.</p>
                        </div>
                    </div>

                    <div style={inputContainerStyle}>
                        <label style={labelStyle}>Start Date</label>
                        <input
                            type="date"
                            name="pricingStartDate"
                            value={formData.pricingStartDate}
                            onChange={handleChange}
                            style={inputStyle}
                        />
                    </div>

                    <div style={inputContainerStyle}>
                        <label style={labelStyle}>End Date</label>
                        <input
                            type="date"
                            name="pricingEndDate"
                            value={formData.pricingEndDate}
                            onChange={handleChange}
                            style={inputStyle}
                        />
                    </div>

                    <div style={inputContainerStyle}>
                        <label style={labelStyle}>Delete</label>
                        <input
                            type="checkbox"
                            style={{ marginTop: '4px' }}
                        />
                    </div>
                </div>

                <div style={{ marginTop: '40px' }}>
                    <button
                        type="submit"
                        className="btn btn-success"
                        style={{ padding: '10px 24px', fontSize: '16px' }}
                        disabled={uploading}
                    >
                        {uploading ? 'Creating...' : 'Create Product'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default CreateProduct;
