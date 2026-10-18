import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [products, setProducts] = useState([]);
    const { institute } = useInstitute();

    // Auto-fetch products when institute is ready
    // Auto-fetch disabled: ProductList handles this explicitly
    /*
    useEffect(() => {
        if (institute?.id) {
            fetchProducts();
        }
    }, [institute?.id]);
    */

    const fetchProducts = async () => {
        if (!institute?.id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/products?instituteId=${institute.id}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to fetch products');
            }
            const data = await res.json();
            setProducts(data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const uploadProductImage = async (file, oldUrl = null) => {
        try {
            // Dynamically import server actions
            const { uploadImage, replaceImage } = await import('../app/actions/images');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'product-images');

            let result;
            if (oldUrl) {
                formData.append('oldUrl', oldUrl);
                result = await replaceImage(formData);
            } else {
                result = await uploadImage(formData);
            }

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            return { success: true, url: result.url };
        } catch (err) {
            console.error('Error uploading image to R2:', err);
            return { success: false, error: err.message };
        }
    };

    const addProduct = async (productData, imageFile) => {
        setLoading(true);
        setError(null);
        try {
            let imageUrl = null;

            // Upload image if provided
            if (imageFile) {
                const uploadResult = await uploadProductImage(imageFile);
                if (!uploadResult.success) {
                    throw new Error('Image upload failed: ' + uploadResult.error);
                }
                imageUrl = uploadResult.url;
            }

            // Get current max display_order
            const { data: maxOrderData } = await supabase
                .from('products')
                .select('display_order')
                .order('display_order', { ascending: false })
                .limit(1);

            const nextOrder = maxOrderData && maxOrderData.length > 0
                ? maxOrderData[0].display_order + 1
                : 0;

            // Map frontend camelCase to backend snake_case
            const dbData = {
                title: productData.title,
                slug: productData.slug,
                strikethrough_price: productData.strikethroughPrice || null,
                parent_product_id: productData.parentProduct || null,
                short_description: productData.shortDescription,
                description: productData.description,
                start_date: productData.startDate || null,
                end_date: productData.endDate || null,
                image: imageUrl,
                tags: productData.tags, // Legacy support for schema tags field if needed
                product_tags: productData.tagIds || [], // For junction table via API
                category_id: productData.categoryId ? parseInt(productData.categoryId) : null,
                enable_email_notification: productData.enableEmailNotification,
                email_template_id: productData.emailTemplateId ? parseInt(productData.emailTemplateId) : null,
                offer_name: productData.offerName,
                price: productData.price || 0,
                validity_type: productData.validityType,
                validity: productData.validity,
                pricing_start_date: productData.pricingStartDate || null,
                pricing_end_date: productData.pricingEndDate || null,
                display_order: nextOrder,
                institute_id: institute?.id?.toString(),
                meta_title: productData.metaTitle,
                meta_description: productData.metaDescription,
                meta_keywords: productData.metaKeywords
            };

            const { data, error } = await fetch('/api/admin/store/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dbData),
            }).then(res => res.json().then(data => ({ data: data.data ? [data.data] : null, error: data.error })));

            if (error) throw new Error(error);

            // Update local state - ensure the new product is added correctly
            const newProduct = data[0];
            setProducts(prev => [...prev, newProduct].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));

            return { success: true, data };
        } catch (err) {
            console.error('Error adding product:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateProductOrder = async (reorderedProducts) => {
        setLoading(true);
        setError(null);
        try {
            // Update display_order for each product
            const updates = reorderedProducts.map((product, index) => ({
                id: product.id,
                display_order: index
            }));

            for (const update of updates) {
                const { error } = await supabase
                    .from('products')
                    .update({ display_order: update.display_order })
                    .eq('id', update.id);

                if (error) throw error;
            }

            // Update local state
            setProducts(reorderedProducts);
            return { success: true };
        } catch (err) {
            console.error('Error updating product order:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const getProductById = async (id) => {
        setLoading(true);
        setError(null);
        try {
            // Fetch product
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (productError) throw productError;

            // Fetch product tags from junction table with tag details
            const { data: productTags, error: tagsError } = await supabase
                .from('product_tags')
                .select('tag_id, tags(id, name, color)')
                .eq('product_id', id);

            if (tagsError) {
                console.error('Error fetching product tags:', tagsError);
            }

            // Extract tag IDs and tag objects
            const tagIds = productTags?.map(pt => pt.tag_id) || [];
            const tags = productTags?.map(pt => pt.tags) || [];

            return {
                success: true,
                data: {
                    ...product,
                    tagIds,  // For the form
                    product_tags: tags  // Tag objects with name and color
                }
            };
        } catch (err) {
            console.error('Error fetching product:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateProduct = async (id, productData, imageFile) => {
        setLoading(true);
        setError(null);
        try {
            let imageUrl = productData.image; // Keep existing image by default

            // Upload new image if provided
            if (imageFile) {
                // Pass existing image URL to enable cleanup of old file
                const uploadResult = await uploadProductImage(imageFile, productData.image);
                if (!uploadResult.success) {
                    throw new Error('Image upload failed: ' + uploadResult.error);
                }
                imageUrl = uploadResult.url;
            }

            // Map frontend camelCase to backend snake_case
            const dbData = {
                title: productData.title,
                slug: productData.slug,
                strikethrough_price: productData.strikethroughPrice || null,
                parent_product_id: productData.parentProduct || null,
                short_description: productData.shortDescription,
                description: productData.description,
                start_date: productData.startDate || null,
                end_date: productData.endDate || null,
                image: imageUrl,
                category_id: productData.categoryId || null,
                enable_email_notification: productData.enableEmailNotification,
                email_template_id: productData.emailTemplateId ? parseInt(productData.emailTemplateId) : null,
                offer_name: productData.offerName,
                price: productData.price || 0,
                validity_type: productData.validityType,
                validity: productData.validity,
                pricing_start_date: productData.pricingStartDate || null,
                pricing_end_date: productData.pricingEndDate || null,
                meta_title: productData.metaTitle,
                meta_description: productData.metaDescription,
                meta_keywords: productData.metaKeywords,
                tagIds: productData.tagIds || []  // Send tag IDs to API
            };

            console.log('Sending update for product:', id, dbData);

            const { data: updatedData, error } = await fetch(`/api/admin/store/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dbData),
            }).then(res => res.json().then(data => ({ data: data.data, error: data.error })));

            if (error) throw new Error(error);

            // Update local state
            setProducts(prev =>
                prev.map(p => p.id === id ? updatedData : p)
            );

            return { success: true, data: updatedData };
        } catch (err) {
            console.error('Error updating product:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const toggleProductStatus = async (id) => {
        try {
            const product = products.find(p => p.id === id);
            if (!product) return;

            const newStatus = product.status === 'approved' ? 'inactive' : 'approved';

            // Update local state optimistically
            setProducts(prev => prev.map(p =>
                p.id === id ? { ...p, status: newStatus } : p
            ));

            const response = await fetch(`/api/admin/store/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                // Revert local state
                setProducts(prev => prev.map(p =>
                    p.id === id ? { ...p, status: product.status } : p
                ));
                throw new Error('Failed to update status');
            }

            return { success: true, status: newStatus };
        } catch (err) {
            console.error('Error toggling product status:', err);
            return { success: false, error: err.message };
        }
    };

    const bulkUpdateProducts = async (ids, updates) => {
        try {
            // Update local state optimistically
            setProducts(prev => prev.map(p =>
                ids.includes(p.id) ? { ...p, ...updates } : p
            ));

            const updatePromises = ids.map(id =>
                fetch(`/api/admin/store/products/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                })
            );

            const results = await Promise.all(updatePromises);
            const failed = results.filter(r => !r.ok);

            if (failed.length > 0) {
                // Since it's optimistic, one failure might mean we should refetch
                await fetchProducts();
                throw new Error(`Failed to update ${failed.length} products`);
            }

            return { success: true };
        } catch (err) {
            console.error('Error bulk updating products:', err);
            return { success: false, error: err.message };
        }
    };

    const deleteProduct = async (id) => {
        return toggleProductStatus(id); // For store, delete is just toggling to inactive
    };

    return (
        <ProductContext.Provider value={{
            products,
            fetchProducts,
            addProduct,
            updateProductOrder,
            getProductById,
            updateProduct,
            toggleProductStatus,
            bulkUpdateProducts,
            deleteProduct,
            loading,
            error
        }}>
            {children}
        </ProductContext.Provider>
    );
};
