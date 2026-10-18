'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { useRouter, useParams } from 'next/navigation';
import { usePosts } from '../context/PostContext';
import { useCategories } from '../context/CategoryContext';
import { useBatches } from '../context/BatchContext';

import { useProducts } from '../context/ProductContext';
import { useInstitute } from '../context/InstituteContext';

// Modular Sub-components
import PostFormHeader from './post-form/PostFormHeader';
import PrimaryContentFields from './post-form/PrimaryContentFields';
import AccessControlSection from './post-form/AccessControlSection';
import MetaDataSection from './post-form/MetaDataSection';
import SocialPreview from './post-form/SocialPreview';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const CreatePost = () => {
    const router = useRouter();
    const { id } = useParams();
    const { addPost, updatePost, getPostById } = usePosts();
    const { categories, fetchCategories } = useCategories();
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
        tagIds: [],
        isFeatured: false,
        status: 'published',
        publicationDate: new Date().toISOString().slice(0, 16)
    });

    const { institute } = useInstitute();

    useEffect(() => {
        if (institute?.id) {
            fetchCategories(institute.id);
        }
    }, [institute?.id]);

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!id);
    const [showHtml, setShowHtml] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchProducts();
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
                            tagIds: post.post_tags?.map(t => t.id) || [],
                            isFeatured: post.is_featured || post.isFeatured || false,
                            status: post.status || 'published',
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

        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };

            // Auto-publish if date is set to past
            if (name === 'publicationDate') {
                const selectedDate = new Date(value);
                const now = new Date();
                if (selectedDate <= now) {
                    newData.status = 'published';
                }
            }

            return newData;
        });
    };

    // Also check on load if publication date is in the past and update status
    useEffect(() => {
        if (formData.publicationDate && formData.status === 'draft') {
            const selectedDate = new Date(formData.publicationDate);
            const now = new Date();
            if (selectedDate <= now) {
                setFormData(prev => ({ ...prev, status: 'published' }));
            }
        }
    }, [formData.publicationDate, formData.status]);

    const handleContentChange = (content) => {
        setFormData(prev => ({ ...prev, content }));
    };

    const handleTagsChange = (tagIds) => {
        setFormData(prev => ({ ...prev, tagIds }));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fData = new FormData();
            fData.append('file', file);
            fData.append('folder', 'posts'); // Use dedicated posts folder

            // Import R2 upload action
            const { uploadImage, deleteImage } = await import('../app/actions/images');

            // If there's an existing image, delete it first
            if (formData.coverImage) {
                try {
                    await deleteImage(formData.coverImage);
                } catch (delErr) {
                    console.warn('Could not delete old image:', delErr);
                }
            }

            // Upload new image
            const result = await uploadImage(fData);
            if (result.success) {
                setFormData(prev => ({ ...prev, coverImage: result.url }));
            } else {
                alert('Failed to upload image: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image');
        } finally {
            setIsUploading(false);
        }
    };

    const addBatch = (batchId) => {
        const bid = parseInt(batchId, 10);
        if (bid && !formData.selectedBatches.includes(bid)) {
            setFormData(prev => ({ ...prev, selectedBatches: [...prev.selectedBatches, bid] }));
        }
    };

    const removeBatch = (batchId) => {
        setFormData(prev => ({ ...prev, selectedBatches: prev.selectedBatches.filter(i => i !== batchId) }));
    };

    const addProduct = (productId) => {
        const pid = parseInt(productId, 10);
        if (pid && !formData.allowedProducts.includes(pid)) {
            setFormData(prev => ({ ...prev, allowedProducts: [...prev.allowedProducts, pid] }));
        }
    };

    const removeProduct = (productId) => {
        setFormData(prev => ({ ...prev, allowedProducts: prev.allowedProducts.filter(i => i !== productId) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const postData = {
                title: formData.title,
                description: formData.summary,
                summary: formData.summary,
                content: formData.content,
                coverImage: formData.coverImage,
                productName: formData.productName,
                accessControl: formData.accessControl,
                allowComments: formData.allowComments,
                publicationDate: formData.publicationDate,
                categoryId: formData.categoryId,
                isFeatured: formData.isFeatured,
                batches: formData.selectedBatches,
                allowedProducts: formData.allowedProducts,
                tagIds: formData.tagIds,
                status: formData.status,
                icon: '📝'
            };

            if (id) {
                await updatePost(id, postData);
            } else {
                await addPost(postData);
            }
            router.push('/admin/posts');
        } catch (error) {
            console.error("Failed to save post", error);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <PostFormHeader isEdit={!!id} onBack={() => router.push('/admin/posts')} />

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
                <PrimaryContentFields
                    formData={formData}
                    onChange={handleChange}
                    onContentChange={handleContentChange}
                    showHtml={showHtml}
                    setShowHtml={setShowHtml}
                    isUploading={isUploading}
                    onFileChange={handleFileChange}
                    ReactQuill={ReactQuill}
                />

                <SocialPreview
                    title={formData.title}
                    summary={formData.summary}
                    coverImage={formData.coverImage}
                />

                <AccessControlSection
                    formData={formData}
                    onChange={handleChange}
                    onAddProduct={addProduct}
                    onRemoveProduct={removeProduct}
                    onAddBatch={addBatch}
                    onRemoveBatch={removeBatch}
                    products={products}
                    batches={batches}
                />

                <MetaDataSection
                    formData={formData}
                    categories={categories}
                    onChange={handleChange}
                    onTagsChange={handleTagsChange}
                />

                <div className="flex gap-4 pt-8 border-t border-gray-100">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex-1 md:flex-none md:min-w-[200px] py-3.5 px-6 rounded-xl font-bold text-white transition-all shadow-lg shadow-emerald-200/50 
                            ${loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98]'}`}
                    >
                        {loading ? (id ? 'Updating...' : 'Creating...') : (id ? 'Update Post' : 'Create Post')}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/posts')}
                        className="flex-1 md:flex-none md:min-w-[120px] py-3.5 px-6 rounded-xl font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePost;
