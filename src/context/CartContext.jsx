import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

const CART_STORAGE_KEY = 'lms_student_cart';

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to parse cart from localStorage:', e);
            return [];
        }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);

    // Save to localStorage whenever cart changes
    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        } catch (e) {
            console.error('Failed to save cart to localStorage:', e);
        }
    }, [cartItems]);

    const addToCart = (product) => {
        if (!product || !product.id) return false;

        const exists = cartItems.some(item => item.id === product.id);
        if (exists) {
            setIsCartOpen(true);
            return false;
        }

        const newItem = {
            id: product.id,
            title: product.title,
            price: Number(product.price || 0),
            strikethrough_price: product.strikethrough_price ? Number(product.strikethrough_price) : null,
            image: product.image || product.image_url,
            category: product.category,
            slug: product.slug
        };

        setCartItems(prev => [...prev, newItem]);
        setIsCartOpen(true);
        return true;
    };

    const removeFromCart = (productId) => {
        setCartItems(prev => prev.filter(item => item.id !== productId));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const isInCart = (productId) => {
        return cartItems.some(item => item.id === productId);
    };

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);
    const toggleCart = () => setIsCartOpen(prev => !prev);

    const cartCount = cartItems.length;
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            clearCart,
            isInCart,
            cartCount,
            cartTotal,
            isCartOpen,
            openCart,
            closeCart,
            toggleCart
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
