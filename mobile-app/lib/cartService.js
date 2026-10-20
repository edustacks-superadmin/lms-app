import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CART_STORAGE_KEY = 'lms_guest_cart';

// In-memory pub/sub listeners for live cart badge updates across all screens
const listeners = new Set();

export const subscribeCart = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const notifyListeners = (count, cart = null) => {
    listeners.forEach(fn => {
        try {
            fn(count, cart);
        } catch (e) {
            console.warn('[cartService] Listener error:', e);
        }
    });
};

// Helper to resolve member profile
const getMember = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        let { data: member } = await supabase
            .from('members')
            .select('id, institute_id')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        if (!member && user.email) {
            const { data: emailMember } = await supabase
                .from('members')
                .select('id, institute_id')
                .eq('email', user.email)
                .maybeSingle();
            member = emailMember;
        }

        return member;
    } catch (e) {
        console.warn('Error fetching member for cart:', e);
        return null;
    }
};

export const cartService = {
    subscribeCart,

    // Get cart items
    getCart: async () => {
        try {
            const member = await getMember();

            if (!member) {
                // Return guest cart from AsyncStorage
                const guestCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
                const result = guestCart ? JSON.parse(guestCart) : { items: [], count: 0, total: 0 };
                notifyListeners(result.count || 0, result);
                return result;
            }

            // Authenticated: Query Supabase cart_items directly
            const { data: cartItems, error } = await supabase
                .from('cart_items')
                .select('id, product_id, products(id, title, price, strikethrough_price, image, slug)')
                .eq('member_id', member.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Supabase getCart error, falling back to local cache:', error);
                const cached = await AsyncStorage.getItem(CART_STORAGE_KEY);
                const res = cached ? JSON.parse(cached) : { items: [], count: 0, total: 0 };
                notifyListeners(res.count || 0, res);
                return res;
            }

            const items = (cartItems || [])
                .filter(item => item.products)
                .map(item => ({
                    id: item.id,
                    product_id: item.product_id,
                    ...item.products
                }));

            const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
            const cartResult = {
                items,
                count: items.length,
                total
            };

            // Keep local cache synced
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartResult));
            notifyListeners(cartResult.count, cartResult);

            return cartResult;
        } catch (error) {
            console.error('getCart error:', error);
            try {
                const cached = await AsyncStorage.getItem(CART_STORAGE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    notifyListeners(parsed.count || 0, parsed);
                    return parsed;
                }
            } catch (e) {}
            notifyListeners(0, { items: [], count: 0, total: 0 });
            return { items: [], count: 0, total: 0 };
        }
    },

    // Add to cart
    addToCart: async (product) => {
        try {
            if (!product || !product.id) {
                return { success: false, message: 'Invalid product' };
            }

            const member = await getMember();

            // Guest cart - no authenticated member
            if (!member) {
                const guestCartStr = await AsyncStorage.getItem(CART_STORAGE_KEY);
                let guestCart = guestCartStr ? JSON.parse(guestCartStr) : { items: [], count: 0, total: 0 };

                const exists = guestCart.items.some(item => item.id === product.id || item.product_id === product.id);
                if (exists) return { success: false, message: 'Already in cart' };

                guestCart.items.push({
                    id: product.id,
                    product_id: product.id,
                    title: product.title,
                    price: product.price,
                    image: product.image
                });
                guestCart.count = guestCart.items.length;
                guestCart.total = guestCart.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

                await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(guestCart));
                notifyListeners(guestCart.count, guestCart);
                return { success: true, message: `${product.title} added to cart` };
            }

            // Authenticated: Check if item already exists in Supabase
            const { data: existing } = await supabase
                .from('cart_items')
                .select('id')
                .eq('member_id', member.id)
                .eq('product_id', product.id)
                .maybeSingle();

            if (existing) {
                return { success: false, message: 'Already in cart' };
            }

            // Insert into Supabase cart_items
            const { error: insertError } = await supabase
                .from('cart_items')
                .insert({
                    member_id: member.id,
                    product_id: product.id,
                    institute_id: member.institute_id || 10
                });

            if (insertError) {
                console.error('Supabase cart insert error:', insertError);
                return { success: false, message: insertError.message || 'Failed to add to cart' };
            }

            // Refresh and notify
            await cartService.getCart();

            return {
                success: true,
                message: `${product.title} added to cart`
            };
        } catch (error) {
            console.error('addToCart error:', error);
            return { success: false, message: error.message || 'Failed to add to cart' };
        }
    },

    // Remove from cart
    removeFromCart: async (productId) => {
        try {
            const member = await getMember();

            if (member) {
                // Delete from Supabase
                await supabase
                    .from('cart_items')
                    .delete()
                    .eq('member_id', member.id)
                    .eq('product_id', productId);
            }

            // Update local cache
            const guestCartStr = await AsyncStorage.getItem(CART_STORAGE_KEY);
            if (guestCartStr) {
                let guestCart = JSON.parse(guestCartStr);
                guestCart.items = (guestCart.items || []).filter(item => item.id !== productId && item.product_id !== productId);
                guestCart.count = guestCart.items.length;
                guestCart.total = guestCart.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
                await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(guestCart));
            }

            // Re-fetch to compute exact new count and notify all listeners
            await cartService.getCart();

            return { success: true, message: 'Item removed from cart' };
        } catch (error) {
            console.error('removeFromCart error:', error);
            return { success: false, message: 'Failed to remove from cart' };
        }
    },

    // Sync guest cart to server on login
    syncCart: async () => {
        try {
            const member = await getMember();
            if (!member) return;

            const guestCartStr = await AsyncStorage.getItem(CART_STORAGE_KEY);
            if (!guestCartStr) return;

            const guestCart = JSON.parse(guestCartStr);
            if (!guestCart.items || guestCart.items.length === 0) return;

            for (const item of guestCart.items) {
                const targetId = item.product_id || item.id;
                if (!targetId) continue;

                const { data: existing } = await supabase
                    .from('cart_items')
                    .select('id')
                    .eq('member_id', member.id)
                    .eq('product_id', targetId)
                    .maybeSingle();

                if (!existing) {
                    await supabase
                        .from('cart_items')
                        .insert({
                            member_id: member.id,
                            product_id: targetId,
                            institute_id: member.institute_id || 10
                        })
                        .catch(() => {});
                }
            }

            await AsyncStorage.removeItem(CART_STORAGE_KEY);
            await cartService.getCart();
        } catch (error) {
            console.error('syncCart error:', error);
        }
    }
};
