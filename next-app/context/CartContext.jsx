'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

// Local storage key for guest cart
const CART_STORAGE_KEY = 'lms_guest_cart';

export function CartProvider({ children }) {
    const { user } = useAuth();
    const [cartItems, setCartItems] = useState([]);
    const [cartCount, setCartCount] = useState(0);
    const [cartTotal, setCartTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Load cart from local storage for guests
    const loadGuestCart = useCallback(() => {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setCartItems(parsed.items || []);
                setCartCount(parsed.items?.length || 0);
                setCartTotal(parsed.total || 0);
            }
        } catch (e) {
            console.error('Failed to load guest cart:', e);
        }
    }, []);

    // Save guest cart to local storage
    const saveGuestCart = useCallback((items) => {
        try {
            const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, total }));
        } catch (e) {
            console.error('Failed to save guest cart:', e);
        }
    }, []);

    // Fetch cart from API for logged-in users
    const fetchCart = useCallback(async () => {
        if (!user) {
            loadGuestCart();
            setInitialized(true);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/api/cart');

            if (!response.ok) {
                console.error('Cart fetch failed with status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            setCartItems(data.items || []);
            setCartCount(data.count || 0);
            setCartTotal(data.total || 0);
        } catch (error) {
            console.error('Failed to fetch cart:', error);
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            // Set empty cart on error to prevent UI issues
            setCartItems([]);
            setCartCount(0);
            setCartTotal(0);
        } finally {
            setLoading(false);
            setInitialized(true);
        }
    }, [user, loadGuestCart]);

    // Sync guest cart to server on login
    const syncGuestCartToServer = useCallback(async () => {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            if (!stored) return;

            const parsed = JSON.parse(stored);
            const items = parsed.items || [];

            if (items.length === 0) return;

            // Collect all product IDs for bulk sync
            const productIds = items.map(item => item.id || item.product_id);

            // Send single bulk request
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds })
            });

            if (response.ok) {
                // Clear guest cart after successful sync
                localStorage.removeItem(CART_STORAGE_KEY);
                // Refresh cart from server
                await fetchCart();
            } else {
                console.error('Failed to sync guest cart:', await response.text());
            }
        } catch (error) {
            console.error('Failed to sync guest cart:', error);
        }
    }, [fetchCart]);

    // Initialize cart
    useEffect(() => {
        if (user) {
            // Sync guest cart first, then fetch
            syncGuestCartToServer().then(() => fetchCart());
        } else {
            fetchCart();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Add to cart
    const addToCart = async (product) => {
        if (!user) {
            // Guest cart - add locally
            const exists = cartItems.some(item =>
                (item.id === product.id) || (item.product_id === product.id)
            );

            if (!exists) {
                const newItems = [...cartItems, {
                    id: product.id,
                    product_id: product.id,
                    title: product.title,
                    price: product.price,
                    strikethrough_price: product.strikethrough_price,
                    image: product.image,
                    slug: product.slug
                }];
                setCartItems(newItems);
                setCartCount(newItems.length);
                setCartTotal(newItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0));
                saveGuestCart(newItems);
                return { success: true, message: `${product.title} added to cart` };
            } else {
                return { success: false, message: 'Item already in cart' };
            }
        }

        try {
            setLoading(true);
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: product.id })
            });

            const data = await response.json();

            if (response.ok) {
                setCartCount(data.count || cartCount + 1);
                await fetchCart(); // Refresh full cart
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.error };
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            return { success: false, message: 'Failed to add to cart' };
        } finally {
            setLoading(false);
        }
    };

    // Remove from cart
    const removeFromCart = async (productId) => {
        if (!user) {
            // Guest cart - remove locally
            const newItems = cartItems.filter(item =>
                (item.id !== productId) && (item.product_id !== productId)
            );
            setCartItems(newItems);
            setCartCount(newItems.length);
            setCartTotal(newItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0));
            saveGuestCart(newItems);
            return { success: true };
        }

        try {
            setLoading(true);
            const response = await fetch('/api/cart', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });

            const data = await response.json();

            if (response.ok) {
                setCartCount(data.count || Math.max(0, cartCount - 1));
                await fetchCart(); // Refresh full cart
                return { success: true };
            } else {
                return { success: false, message: data.error };
            }
        } catch (error) {
            console.error('Remove from cart error:', error);
            return { success: false, message: 'Failed to remove from cart' };
        } finally {
            setLoading(false);
        }
    };

    // Clear cart
    const clearCart = async () => {
        if (!user) {
            localStorage.removeItem(CART_STORAGE_KEY);
            setCartItems([]);
            setCartCount(0);
            setCartTotal(0);
            return { success: true };
        }

        try {
            setLoading(true);
            const response = await fetch('/api/cart', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearAll: true })
            });

            if (response.ok) {
                setCartItems([]);
                setCartCount(0);
                setCartTotal(0);
                return { success: true };
            } else {
                const data = await response.json();
                return { success: false, message: data.error || 'Failed to clear cart' };
            }
        } catch (error) {
            console.error('Clear cart error:', error);
            return { success: false, message: 'Failed to clear cart' };
        } finally {
            setLoading(false);
        }
    };

    // Check if product is in cart
    const isInCart = (productId) => {
        return cartItems.some(item =>
            (item.id === productId) || (item.product_id === productId)
        );
    };

    const value = {
        cartItems,
        cartCount,
        cartTotal,
        loading,
        initialized,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        refreshCart: fetchCart
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

export default CartContext;
