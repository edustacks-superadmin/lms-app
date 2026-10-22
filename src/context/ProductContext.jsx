import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
    const { institute } = useInstitute();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [products, setProducts] = useState([]);

    const fetchProducts = async (instId) => {
        setLoading(true);
        setError(null);
        try {
            const targetId = instId !== undefined ? instId : institute?.id;
            let query = supabase
                .from('products')
                .select('*')
                .order('display_order', { ascending: true });

            if (targetId) {
                query = query.eq('institute_id', targetId);
            }

            const { data, error } = await query;

            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (institute?.id) {
            fetchProducts(institute.id);
        }
    }, [institute?.id]);

    const uploadProductImage = async (file) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            return { success: true, url: publicUrl };
        } catch (err) {
            console.error('Error uploading image:', err);
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
                institute_id: institute?.id || null,
                title: productData.title,
                slug: productData.slug,
                strikethrough_price: productData.strikethroughPrice || null,
                parent_product_id: productData.parentProduct || null,
                short_description: productData.shortDescription,
                description: productData.description,
                start_date: productData.startDate || null,
                end_date: productData.endDate || null,
                image: imageUrl,
                tags: productData.tags,
                category_id: productData.category || null,
                enable_email_notification: productData.enableEmailNotification,
                offer_name: productData.offerName,
                price: productData.price || 0,
                validity_type: productData.validityType,
                validity: productData.validity,
                pricing_start_date: productData.pricingStartDate || null,
                pricing_end_date: productData.pricingEndDate || null,
                display_order: nextOrder
            };

            const { data, error } = await supabase
                .from('products')
                .insert([dbData])
                .select();

            if (error) throw error;

            // Update local state
            setProducts(prev => [...prev, data[0]].sort((a, b) => a.display_order - b.display_order));

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

    const getProductById = async (idOrSlug) => {
        setLoading(true);
        setError(null);
        try {
            if (!idOrSlug) {
                return { success: false, error: 'Product ID or slug is required' };
            }

            const rawVal = String(idOrSlug).trim();
            const isNumeric = /^\d+$/.test(rawVal);

            let query = supabase.from('products').select('*');
            if (isNumeric) {
                query = query.eq('id', Number(rawVal));
            } else {
                query = query.ilike('slug', rawVal);
            }

            const { data, error } = await query.maybeSingle();

            if (error) throw error;
            if (data) {
                return { success: true, data };
            }

            // Fallback: If not found by slug, try searching by title or lowercase slug
            const { data: fallbackData } = await supabase
                .from('products')
                .select('*')
                .or(`slug.ilike.${rawVal},title.ilike.${rawVal.replace(/-/g, ' ')}`)
                .maybeSingle();

            if (fallbackData) {
                return { success: true, data: fallbackData };
            }

            return { success: false, error: 'Product not found' };
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
                const uploadResult = await uploadProductImage(imageFile);
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
                tags: productData.tags,
                                category_id: productData.categoryId || null,
                enable_email_notification: productData.enableEmailNotification,
                offer_name: productData.offerName,
                price: productData.price || 0,
                validity_type: productData.validityType,
                validity: productData.validity,
                pricing_start_date: productData.pricingStartDate || null,
                pricing_end_date: productData.pricingEndDate || null
            };

            const { data, error } = await supabase
                .from('products')
                .update(dbData)
                .eq('id', id)
                .select();

            if (error) throw error;

            // Update local state
            setProducts(prev =>
                prev.map(p => p.id === id ? data[0] : p)
            );

            return { success: true, data };
        } catch (err) {
            console.error('Error updating product:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProductContext.Provider value={{ products, fetchProducts, addProduct, updateProductOrder, getProductById, updateProduct, loading, error }}>
            {children}
        </ProductContext.Provider>
    );
};
