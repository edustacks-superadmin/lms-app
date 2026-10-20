import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../config/organization';
import { supabase } from './supabase';

const CART_STORAGE_KEY = 'lms_guest_cart';

export const cartService = {
    // Get cart items
    getCart: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Get from guest cart
                const guestCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
                return guestCart ? JSON.parse(guestCart) : { items: [], count: 0, total: 0 };
            }

            // Get the session token for authenticated requests
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            const response = await fetch(getApiUrl('/api/cart'), {
                headers: {
                    'Accept': 'application/json',
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
                }
            });
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return { items: [], count: 0, total: 0 };
            }
            return await response.json();
        } catch (error) {
            console.error('getCart error:', error);
            return { items: [], count: 0, total: 0 };
        }
    },

    // Add to cart
    addToCart: async (product) => {
        try {
            // Get session first - it contains both user info and access token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session || !session.access_token) {
                // Guest cart - no authenticated session
                const guestCartStr = await AsyncStorage.getItem(CART_STORAGE_KEY);
                let guestCart = guestCartStr ? JSON.parse(guestCartStr) : { items: [], count: 0, total: 0 };

                const exists = guestCart.items.some(item => item.id === product.id);
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
                return { success: true, message: 'Added to cart' };
            }

            // Authenticated cart - use session token
            const accessToken = session.access_token;

            const response = await fetch(getApiUrl('/api/cart'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ productId: product.id })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, message: data.error || data.message || `Server error: ${response.status}` };
            }

            return data;
        } catch (error) {
            console.error('addToCart error:', error);
            return { success: false, message: error.message || 'Failed to add to cart' };
        }
    },

    // Remove from cart
    removeFromCart: async (productId) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                const guestCartStr = await AsyncStorage.getItem(CART_STORAGE_KEY);
                if (!guestCartStr) return { success: true };

                let guestCart = JSON.parse(guestCartStr);
                guestCart.items = guestCart.items.filter(item => item.id !== productId);
                guestCart.count = guestCart.items.length;
                guestCart.total = guestCart.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

                await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(guestCart));
                return { success: true };
            }

            // Get the session token for authenticated requests
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            const response = await fetch(getApiUrl('/api/cart'), {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({ productId })
            });

            return await response.json();
        } catch (error) {
            console.error('removeFromCart error:', error);
            return { success: false, message: 'Failed to remove' };
        }
    },

    // Sync guest cart to server on login
    syncCart: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const guestCartStr = await AsyncStorage.getItem(CART_STORAGE_KEY);
            if (!guestCartStr) return;

            const guestCart = JSON.parse(guestCartStr);
            if (guestCart.items.length === 0) return;

            // Get the session token for authenticated requests
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            for (const item of guestCart.items) {
                await fetch(getApiUrl('/api/cart'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
                    },
                    body: JSON.stringify({ productId: item.id })
                });
            }

            await AsyncStorage.removeItem(CART_STORAGE_KEY);
        } catch (error) {
            console.error('syncCart error:', error);
        }
    }
};
