'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { ImageCropper } from './ui';
import TagSelector from './TagSelector';
import { Package, Upload, Plus, Trash2, ArrowLeft, X, Check, AlertCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useProducts } from '../context/ProductContext';
import { useProductCategories } from '../context/ProductCategoryContext';
import { useInstitute } from '../context/InstituteContext';
import { useToast } from '../context/ToastContext';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const modules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'clean']
    ],
};

const ProductForm = ({ id: propId }) => {
    const router = useRouter();
    const params = useParams();
    const id = propId || params?.id;
    const isEdit = !!id;

    const { getProductById, updateProduct, addProduct } = useProducts();
    const { categories, fetchCategories } = useProductCategories();
    const { institute } = useInstitute();
    const { showToast } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        price: '',
        strikethroughPrice: '',
        description: '',
        shortDescription: '',
        image: '',
        startDate: '',
        endDate: '',
        categoryId: '',
        parentProduct: '',
        enableEmailNotification: false,
        emailTemplateId: '',
        offerName: '',
        validityType: 'Relative (in days)',
        validity: '',
        pricingStartDate: '',
        pricingEndDate: '',
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        tagIds: []
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(isEdit);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [parentProducts, setParentProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [errors, setErrors] = useState({});
    const [templates, setTemplates] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    // Cropper State
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState(null);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (isEdit) setLoading(true);
            await fetchCategories();
            await fetchTemplates();
            await fetchParentProducts();
            if (isEdit) {
                await loadProduct();
            }
            setLoading(false);
        };
        fetchData();
    }, [id, institute?.id]);

    // Initial load for linked courses
    useEffect(() => {
        if (!isEdit) return;
        const fetchLinked = async () => {
            try {
                const res = await fetch(`/api/admin/products/${id}/courses`);
                if (res.ok) {
                    const data = await res.json();
                    setSelectedCourses(data.linkedCourses || []);
                }
            } catch (error) {
                console.error('Error fetching linked content:', error);
            }
        };
        fetchLinked();
    }, [id]);

    // Course search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            let active = true;

            const fetchCourses = async () => {
                try {
                    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
                    // Use a slightly different endpoint for creation if needed, or just standard course list
                    const endpoint = isEdit ? `/api/admin/products/${id}/courses${query}` : `/api/admin/courses?institute_id=${institute?.id}${query ? '&' + query.slice(1) : ''}`;

                    const res = await fetch(endpoint);
                    if (res.ok && active) {
                        const data = await res.json();
                        // API structure differs between creation and product-specific course fetch
                        const courses = data.availableCourses || data.data || [];
                        setAvailableCourses(courses);
                    }
                } catch (error) {
                    console.error('Search error:', error);
                }
            };

            if (searchTerm || !isEdit) { // Only fetch on creation initially, or when searching
                fetchCourses();
            }

            return () => { active = false; };
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, id, institute?.id]);

    // Auto-generate slug from title (Creation mode only by default or if not manually edited)
    useEffect(() => {
        if (!isEdit && formData.title && !slugManuallyEdited) {
            const slug = formData.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }
    }, [formData.title, slugManuallyEdited, isEdit]);

    const loadProduct = async () => {
        const result = await getProductById(id);
        if (result.success) {
            const product = result.data;
            setFormData({
                title: product.title || '',
                slug: product.slug || '',
                strikethroughPrice: product.strikethrough_price || '',
                parentProduct: product.parent_product_id || '',
                shortDescription: product.short_description || '',
                description: product.description || '',
                startDate: product.start_date || '',
                endDate: product.end_date || '',
                image: product.image || '',
                categoryId: product.category_id || '',
                enableEmailNotification: product.enable_email_notification || false,
                emailTemplateId: product.email_template_id || '',
                offerName: product.offer_name || '',
                price: product.price || '0.0',
                validityType: product.validity_type || 'Relative (in days)',
                validity: product.validity || '',
                pricingStartDate: product.pricing_start_date ? product.pricing_start_date.split('T')[0] : '',
                pricingEndDate: product.pricing_end_date ? product.pricing_end_date.split('T')[0] : '',
                metaTitle: product.meta_title || '',
                metaDescription: product.meta_description || '',
                metaKeywords: product.meta_keywords || '',
                tagIds: product.tagIds || []
            });
            setImagePreview(product.image);
            if (product.courses) setSelectedCourses(product.courses);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await fetch('/api/admin/settings/email-templates');
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const fetchParentProducts = async () => {
        try {
            const response = await fetch('/api/admin/products');
            if (response.ok) {
                const data = await response.json();
                setParentProducts((data || []).filter(p => !isEdit || p.id !== id));
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(true);
    };

    const addCourse = (course) => {
        if (!selectedCourses.find(c => c.id === course.id)) {
            setSelectedCourses([...selectedCourses, course]);
        }
        setSearchTerm('');
        setIsDropdownOpen(false);
    };

    const removeCourse = (courseId) => {
        setSelectedCourses(selectedCourses.filter(c => c.id !== courseId));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }

        if (name === 'slug') setSlugManuallyEdited(true);

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
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setTempImageSrc(reader.result);
                setShowCropper(true);
            });
            reader.readAsDataURL(file);
            e.target.value = null;
        }
    };

    const handleCropComplete = (croppedBlob) => {
        const file = new File([croppedBlob], "product-image.jpg", { type: "image/jpeg" });
        setImageFile(file);
        setImagePreview(URL.createObjectURL(croppedBlob));
        setShowCropper(false);
        setTempImageSrc(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.price) newErrors.price = 'Price is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showToast('Please fix the errors in the form', 'error');
            return;
        }

        setUploading(true);
        try {
            const res = isEdit
                ? await updateProduct(id, formData, imageFile)
                : await addProduct(formData, imageFile);

            if (res.success) {
                const productId = isEdit ? id : res.data[0].id;

                // Update Bundle Content
                if (selectedCourses.length > 0) {
                    try {
                        await fetch(`/api/admin/store/products/${productId}/courses`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ courseIds: selectedCourses.map(c => c.id) })
                        });
                    } catch (err) {
                        console.error("Failed to update courses bundle", err);
                    }
                }

                showToast(`Product ${isEdit ? 'updated' : 'created'} successfully`, 'success');
                router.push(isEdit ? `/store/product/${id}` : '/store/products');
            } else {
                showToast(res.error || `Failed to ${isEdit ? 'update' : 'create'} product`, 'error');
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const filteredAvailableCourses = availableCourses.filter(
        course => !selectedCourses.some(selected => selected.id === course.id)
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200">
                <button
                    onClick={() => router.push(isEdit ? `/store/product/${id}` : '/store')}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft size={24} className="text-slate-700" />
                </button>
                <h1 className="text-2xl font-semibold text-slate-800">
                    {isEdit ? 'Edit Product' : 'Create Product'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="max-w-4xl pb-10">
                {submitError && (
                    <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                        <AlertCircle size={18} />
                        {submitError}
                    </div>
                )}

                {/* Product Title */}
                <div className="flex mb-6 items-start">
                    <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                        Product Title <span className="text-red-500">*</span>
                    </label>
                    <div className="flex-1 max-w-xl">
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.title ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'}`}
                        />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </div>
                </div>

                {/* Product Slug */}
                <div className="flex mb-6 items-start">
                    <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                        Product Slug
                    </label>
                    <div className="flex-1 max-w-xl">
                        <input
                            type="text"
                            name="slug"
                            value={formData.slug}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <p className="text-slate-500 text-xs mt-1">
                            {isEdit ? "Customize the product's URL." : "Auto-generated from title. Edit to customize."}
                        </p>
                    </div>
                </div>

                {/* Strikethrough Price */}
                <div className="flex mb-6 items-start">
                    <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                        Strikethrough Price
                    </label>
                    <div className="flex-1 max-w-xl">
                        <input
                            type="number"
                            name="strikethroughPrice"
                            value={formData.strikethroughPrice}
                            onChange={handleChange}
                            onWheel={(e) => e.target.blur()}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <p className="text-slate-500 text-xs mt-1">Original price shown with strikethrough</p>
                    </div>
                </div>

                {/* Price */}
                <div className="flex mb-6 items-start">
                    <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                        Price <span className="text-red-500">*</span>
                    </label>
                    <div className="flex-1 max-w-xl">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                onWheel={(e) => e.target.blur()}
                                className={`w-full pl-8 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.price ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'}`}
                            />
                        </div>
                        {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                    </div>
                </div>

                {/* Category */}
                <div className="flex mb-6 items-start">
                    <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                        Category
                    </label>
                    <div className="flex items-center gap-3 flex-1 max-w-xl">
                        <select
                            name="categoryId"
                            value={formData.categoryId}
                            onChange={handleChange}
                            className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => router.push('/admin/store/categories/create')}
                            className="p-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Tags */}
                <div className="flex mb-6 items-start">
                    <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                        Tags
                    </label>
                    <div className="flex-1 max-w-xl">
                        <TagSelector
                            selectedTags={formData.tagIds}
                            onChange={(newTagIds) => setFormData(prev => ({ ...prev, tagIds: newTagIds }))}
                            type="product"
                        />
                    </div>
                </div>

                {/* Bundle Content Selection */}
                <div className="flex mb-6 items-start">
                    <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                        Bundle Content
                    </label>
                    <div className="flex-1 max-w-xl">
                        <p className="text-slate-500 text-xs mb-3">Manage courses included in this product bundle.</p>
                        <div className="relative mb-4">
                            <div className="flex items-center border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                                <Plus size={18} className="text-slate-400 mr-2" />
                                <input
                                    type="text"
                                    placeholder="Search to add courses..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="border-none bg-transparent outline-none text-sm w-full text-slate-700"
                                />
                            </div>
                            {isDropdownOpen && searchTerm && (
                                <>
                                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredAvailableCourses.length > 0 ? (
                                            filteredAvailableCourses.map(course => (
                                                <div
                                                    key={course.id}
                                                    onClick={() => addCourse(course)}
                                                    className="px-4 py-2.5 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                                >
                                                    {course.title}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-slate-400 text-sm text-center">No matching courses found.</div>
                                        )}
                                    </div>
                                    <div className="fixed inset-0 z-5" onClick={() => setIsDropdownOpen(false)} />
                                </>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            {selectedCourses.map(course => (
                                <div key={course.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <span className="text-sm text-slate-800 font-medium">{course.title}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeCourse(course.id)}
                                        className="flex items-center gap-1 text-red-500 text-xs hover:underline"
                                    >
                                        <Trash2 size={14} /> Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Product Image */}
                <div className="flex mb-6 items-start">
                    <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                        Product Image
                    </label>
                    <div className="flex items-start gap-4 flex-1 max-w-xl">
                        <label className="w-64 h-36 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors overflow-hidden">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Package size={40} className="text-slate-300 mb-2" />
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Upload size={16} />
                                        <span className="font-medium text-sm">Upload Image</span>
                                    </div>
                                </>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 mt-8 pt-8 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={uploading}
                        className="px-8 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {uploading ? (
                            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Processing...</>
                        ) : (
                            <><Check size={18} /> {isEdit ? 'Update Product' : 'Create Product'}</>
                        )}
                    </button>
                </div>
            </form>

            {showCropper && (
                <ImageCropper
                    imageSrc={tempImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setShowCropper(false)}
                    aspectRatio={16 / 9}
                />
            )}
        </div>
    );
};

export default ProductForm;
