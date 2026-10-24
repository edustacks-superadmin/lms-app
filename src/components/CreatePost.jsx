import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useNavigate, useParams } from 'react-router-dom';
import { usePosts } from '../context/PostContext';
import { useCategories } from '../context/CategoryContext';
import { useBatches } from '../context/BatchContext';
import { useProducts } from '../context/ProductContext';
import { ArrowLeft, Plus, Code, Eye, Table, Sparkles, Upload, X, Loader2, CheckCircle2 } from 'lucide-react';
import { uploadToR2 } from '../utils/r2Upload';

const CreatePost = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { addPost, updatePost, getPostById } = usePosts();
    const { categories } = useCategories();
    const { batches } = useBatches();
    const { products, fetchProducts } = useProducts();

    const [formData, setFormData] = useState({
        title: '',
        coverImage: null,
        summary: '',
        content: '',
        productName: '',
        accessControl: 'Private',
        allowComments: true,
        selectedBatches: [],
        allowedProducts: [],
        categoryId: '',
        publicationDate: new Date().toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
    });

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!id);
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const quillRef = useRef(null);

    useEffect(() => {
        fetchProducts();
        console.log('Fetching products...');
    }, []);

    useEffect(() => {
        if (id) {
            const fetchPost = async () => {
                try {
                    const post = await getPostById(id);
                    if (post) {
                        setFormData({
                            title: post.title,
                            coverImage: post.cover_image,
                            summary: post.summary || post.description || '',
                            content: post.content || '',
                            productName: post.product_name || '',
                            accessControl: post.access_control || 'Private',
                            allowComments: post.allow_comments,
                            selectedBatches: post.batches || [],
                            allowedProducts: post.allowedProducts || [],
                            categoryId: post.category_id || '',
                            publicationDate: (() => {
                                try {
                                    return post.publication_date
                                        ? new Date(post.publication_date).toISOString().slice(0, 16)
                                        : new Date().toISOString().slice(0, 16);
                                } catch (e) {
                                    return new Date().toISOString().slice(0, 16);
                                }
                            })()
                        });
                    } else {
                        console.error('Post not found');
                    }
                } catch (error) {
                    console.error('Error fetching post:', error);
                } finally {
                    setInitialLoading(false);
                }
            };
            fetchPost();
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };


    const handleInsertTable = () => {
        const tableTemplate = `
<table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #cbd5e1;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-weight: bold;">Feature / Metric</th>
      <th style="border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-weight: bold;">Column 1</th>
      <th style="border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-weight: bold;">Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 10px 14px;"><strong>Point 1</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 14px;">Value A</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 14px;">Value B</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 10px 14px;"><strong>Point 2</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 14px;">Value C</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 14px;">Value D</td>
    </tr>
  </tbody>
</table>
<p><br></p>`;
        setFormData(prev => ({
            ...prev,
            content: (prev.content || '') + tableTemplate
        }));
    };

    const hasMergedHeader = formData.content && (
        formData.content.includes('Feature CPM') ||
        formData.content.includes('Feature&nbsp;CPM') ||
        /Review Technique/i.test(formData.content)
    );

    const handleFixMergedHeader = () => {
        let html = formData.content || '';
        const fixedHeader = `<thead><tr>
  <th style="border: 1px solid #cbd5e1; padding: 10px 14px; background: #f1f5f9; text-align: left; font-weight: 700;">Feature</th>
  <th style="border: 1px solid #cbd5e1; padding: 10px 14px; background: #f1f5f9; text-align: left; font-weight: 700;">CPM (Critical Path Method)</th>
  <th style="border: 1px solid #cbd5e1; padding: 10px 14px; background: #f1f5f9; text-align: left; font-weight: 700;">PERT (Program Evaluation and Review Technique)</th>
</tr></thead>`;

        const regex = new RegExp('<tr>\\s*<td[^>]*>Feature[\\s\\S]*?Review Technique[\\s\\S]*?<\\/td>\\s*<\\/tr>', 'i');
        html = html.replace(regex, fixedHeader);
        setFormData(prev => ({ ...prev, content: html }));
        alert('Table header successfully split into 3 columns!');
    };

    const handleContentChange = (content) => {
        setFormData(prev => ({ ...prev, content }));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (JPG, PNG, WebP, etc.).');
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            alert('File size exceeds 15MB. Please choose a smaller image.');
            return;
        }

        setUploadingImage(true);
        setUploadError(null);

        try {
            const res = await uploadToR2(file, 'posts');
            if (res.success && res.url) {
                setFormData(prev => ({ ...prev, coverImage: res.url }));
            }
        } catch (err) {
            console.error('Error uploading cover image to Cloudflare R2:', err);
            setUploadError(err.message || 'Image upload failed');
            alert('Failed to upload image to Cloudflare R2: ' + (err.message || 'Network error'));
        } finally {
            setUploadingImage(false);
            e.target.value = '';
        }
    };

    const handleQuillImage = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            try {
                const res = await uploadToR2(file, 'posts/content');
                if (res.success && res.url) {
                    const quill = quillRef.current?.getEditor();
                    if (quill) {
                        const range = quill.getSelection(true) || { index: 0 };
                        quill.insertEmbed(range.index, 'image', res.url);
                        quill.setSelection(range.index + 1);
                    }
                }
            } catch (err) {
                console.error('Quill inline image upload error:', err);
                alert('Failed to upload inline image to Cloudflare R2: ' + err.message);
            }
        };
    }, []);

    const quillModules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: handleQuillImage
            }
        }
    }), [handleQuillImage]);

    const addBatch = (batchId) => {
        if (batchId && !formData.selectedBatches.includes(batchId)) {
            setFormData(prev => ({
                ...prev,
                selectedBatches: [...prev.selectedBatches, batchId]
            }));
        }
    };

    const removeBatch = (batchId) => {
        setFormData(prev => ({
            ...prev,
            selectedBatches: prev.selectedBatches.filter(id => id !== batchId)
        }));
    };

    const addProduct = (productId) => {
        console.log('addProduct called with:', productId, 'type:', typeof productId);
        console.log('Current allowedProducts:', formData.allowedProducts);
        console.log('Available products:', products);

        if (productId && !formData.allowedProducts.includes(productId)) {
            setFormData(prev => ({
                ...prev,
                allowedProducts: [...prev.allowedProducts, productId]
            }));
            console.log('Product added:', productId);
        } else {
            console.log('Product not added - either empty or already exists');
        }
    };

    const removeProduct = (productId) => {
        setFormData(prev => ({
            ...prev,
            allowedProducts: prev.allowedProducts.filter(id => id !== productId)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const postData = {
                title: formData.title,
                description: formData.summary, // Mapping summary to description for list view
                summary: formData.summary,
                content: formData.content ? formData.content.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ') : '',
                coverImage: formData.coverImage,
                productName: formData.productName,
                accessControl: formData.accessControl,
                allowComments: formData.allowComments,
                publicationDate: formData.publicationDate,
                categoryId: formData.categoryId,
                batches: formData.selectedBatches,
                allowedProducts: formData.allowedProducts,
                icon: '📝' // Default icon
            };

            if (id) {
                await updatePost(id, postData);
            } else {
                await addPost(postData);
            }
            navigate('/admin/posts');
        } catch (error) {
            console.error("Failed to save post", error);
            // Alert is handled in context
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading post...</div>;
    }

    return (
        <div style={{ flex: 1, padding: '20px', marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <button onClick={() => navigate('/admin/posts')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f0f0f0'} onMouseOut={(e) => e.currentTarget.style.background = 'none'}>
                    <ArrowLeft size={24} color="#333" />
                </button>
                <h1 style={{ fontSize: '24px', fontWeight: '400', margin: 0, color: '#1a1a1a' }}>{id ? 'Edit Post' : 'Create post'}</h1>
            </div>

            <form onSubmit={handleSubmit} style={{ background: 'white', padding: '20px', maxWidth: '1000px', borderRadius: '8px', border: '1px solid #eee' }}>

                {/* Title */}
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={(e) => e.target.style.borderColor = '#00bfa5'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        placeholder="Enter post title"
                        required
                    />
                </div>

                {/* Cover Image */}
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                            Cover Image (Cloudflare R2 Storage)
                        </label>
                        {formData.coverImage && (
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    color: '#dc2626',
                                    background: '#fee2e2',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={14} /> Remove Image
                            </button>
                        )}
                    </div>

                    <div style={{
                        border: uploadingImage ? '2px dashed #3b82f6' : '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '24px',
                        textAlign: 'center',
                        backgroundColor: uploadingImage ? '#eff6ff' : '#f8fafc',
                        transition: 'all 0.2s'
                    }}>
                        {uploadingImage ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px' }}>
                                <Loader2 size={32} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>
                                    Uploading to Cloudflare R2...
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    Your image is being securely uploaded to Cloudflare R2 Cloud.
                                </div>
                            </div>
                        ) : (
                            <>
                                <input
                                    id="coverImageFileInput"
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                                <label
                                    htmlFor="coverImageFileInput"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 20px',
                                        backgroundColor: '#2563eb',
                                        color: '#ffffff',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        marginBottom: '10px'
                                    }}
                                >
                                    <Upload size={16} /> Choose Image from Device
                                </label>

                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                                    Images are automatically saved to Cloudflare R2 Cloud (up to 15MB).
                                </div>

                                {uploadError && (
                                    <div style={{ marginTop: '10px', color: '#dc2626', fontSize: '13px', fontWeight: '500' }}>
                                        ⚠️ {uploadError}
                                    </div>
                                )}
                            </>
                        )}

                        {formData.coverImage && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <img
                                    src={formData.coverImage}
                                    alt="Cover Preview"
                                    onError={(e) => {
                                        console.warn('Cover image failed to load:', formData.coverImage);
                                    }}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '260px',
                                        borderRadius: '8px',
                                        objectFit: 'contain',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a', fontWeight: '500' }}>
                                    <CheckCircle2 size={15} />
                                    <span>Cloudflare R2 URL:</span>
                                    <a
                                        href={formData.coverImage}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#2563eb', textDecoration: 'underline', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        {formData.coverImage}
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary */}
                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Summary</label>
                    <textarea
                        name="summary"
                        value={formData.summary}
                        onChange={handleChange}
                        style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', width: '100%', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                        onFocus={(e) => e.target.style.borderColor = '#00bfa5'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        placeholder="Enter a brief summary"
                    />
                </div>

                {/* Content (Rich Text & HTML Code Editor) */}
                <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                            Content {isHtmlMode ? '(HTML Source Mode)' : '(Visual Mode)'}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {hasMergedHeader && (
                                <button
                                    type="button"
                                    onClick={handleFixMergedHeader}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#065f46',
                                        backgroundColor: '#d1fae5',
                                        border: '1px solid #a7f3d0',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                    title="Split the first row into 3 header columns"
                                >
                                    <Sparkles size={14} color="#059669" />
                                    Fix Table Header (Split into 3 Columns)
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleInsertTable}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    backgroundColor: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                                title="Insert a responsive 3-column table template"
                            >
                                <Table size={14} />
                                + Insert Table (3 Columns)
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsHtmlMode(!isHtmlMode)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: isHtmlMode ? '#1d4ed8' : '#374151',
                                    backgroundColor: isHtmlMode ? '#dbeafe' : '#f3f4f6',
                                    border: `1px solid ${isHtmlMode ? '#93c5fd' : '#d1d5db'}`,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {isHtmlMode ? <Eye size={14} /> : <Code size={14} />}
                                {isHtmlMode ? 'Switch to Visual Editor' : '</> HTML Source Code'}
                            </button>
                        </div>
                    </div>

                    {isHtmlMode ? (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                                💡 Tip: You can edit or add table headers (<code>&lt;th&gt;Title&lt;/th&gt;</code>) and table columns (<code>&lt;td&gt;Data&lt;/td&gt;</code>) directly here.
                            </div>
                            <textarea
                                value={formData.content}
                                onChange={(e) => handleContentChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '380px',
                                    padding: '14px',
                                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                    fontSize: '13px',
                                    lineHeight: '1.6',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    backgroundColor: '#0f172a',
                                    color: '#e2e8f0',
                                    boxSizing: 'border-box',
                                    resize: 'vertical'
                                }}
                                placeholder="Paste or edit HTML content directly..."
                            />
                        </div>
                    ) : (
                        <div style={{ height: '360px', marginBottom: '40px' }}>
                            <ReactQuill
                                ref={quillRef}
                                theme="snow"
                                value={formData.content}
                                onChange={handleContentChange}
                                style={{ height: '100%', borderRadius: '8px' }}
                                modules={quillModules}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    {/* Product */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Products (Access Control)</label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <select
                                id="productSelect"
                                style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', backgroundColor: 'white' }}
                            >
                                <option value="">Select a product...</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id}>{product.title}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    const select = document.getElementById('productSelect');
                                    addProduct(select.value);
                                    select.value = "";
                                }}
                                style={{ background: '#00bfa5', color: 'white', border: 'none', borderRadius: '8px', width: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#00a693'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#00bfa5'}
                            >
                                <Plus size={24} />
                            </button>
                        </div>

                        {/* Selected Products List */}
                        {formData.allowedProducts.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                {formData.allowedProducts.map(productId => {
                                    const product = products.find(p => p.id === productId);
                                    return product ? (
                                        <span key={productId} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                            {product.title}
                                            <button
                                                type="button"
                                                onClick={() => removeProduct(productId)}
                                                style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '50%', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', fontSize: '12px', lineHeight: 1 }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>

                    {/* Access Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Access control</label>
                        <select
                            name="accessControl"
                            value={formData.accessControl}
                            onChange={handleChange}
                            style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', width: '100%', backgroundColor: 'white' }}
                        >
                            <option value="Private">Private</option>
                            <option value="Public">Public</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    {/* Category */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Category</label>
                        <select
                            name="categoryId"
                            value={formData.categoryId}
                            onChange={handleChange}
                            style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', width: '100%', backgroundColor: 'white' }}
                            required
                        >
                            <option value="">Select a category...</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Publication Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Publication Date</label>
                        <input
                            type="datetime-local"
                            name="publicationDate"
                            value={formData.publicationDate}
                            onChange={handleChange}
                            style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', width: '100%' }}
                        />
                    </div>
                </div>

                {/* Batches */}
                <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Batches</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <select
                            id="batchSelect"
                            style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', backgroundColor: 'white' }}
                        >
                            <option value="">Select a batch...</option>
                            {batches.map(batch => (
                                <option key={batch.id} value={batch.id}>{batch.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => {
                                const select = document.getElementById('batchSelect');
                                addBatch(select.value);
                                select.value = "";
                            }}
                            style={{ background: '#00bfa5', color: 'white', border: 'none', borderRadius: '8px', width: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#00a693'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#00bfa5'}
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    {/* Selected Batches List */}
                    {formData.selectedBatches.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            {formData.selectedBatches.map(batchId => {
                                const batch = batches.find(b => b.id === batchId);
                                return batch ? (
                                    <span key={batchId} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        {batch.name}
                                        <button
                                            type="button"
                                            onClick={() => removeBatch(batchId)}
                                            style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', padding: '2px', borderRadius: '50%', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', fontSize: '12px', lineHeight: 1 }}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                    )}
                </div>

                {/* Allow Comments */}
                <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                        type="checkbox"
                        id="allowComments"
                        name="allowComments"
                        checked={formData.allowComments}
                        onChange={handleChange}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#00bfa5' }}
                    />
                    <label htmlFor="allowComments" style={{ fontWeight: '500', color: '#374151', fontSize: '16px', cursor: 'pointer' }}>Allow Comments</label>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '16px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            backgroundColor: '#00bfa5',
                            color: 'white',
                            border: 'none',
                            padding: '12px 32px',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '16px',
                            boxShadow: '0 2px 4px rgba(0, 191, 165, 0.3)',
                            transition: 'transform 0.1s'
                        }}
                        onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
                        onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        {loading ? (id ? 'Updating...' : 'Creating...') : (id ? 'Update Post' : 'Create Post')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/posts')}
                        style={{
                            backgroundColor: 'white',
                            color: '#4b5563',
                            border: '1px solid #d1d5db',
                            padding: '12px 32px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '16px',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                    >
                        Cancel
                    </button>
                </div>

            </form>
        </div>
    );
};

export default CreatePost;
