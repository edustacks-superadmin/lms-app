'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, ArrowLeft, CreditCard, Package } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useToast } from '../../../context/ToastContext';

const CartPage = () => {
    const router = useRouter();
    const { cartItems, cartCount, cartTotal, removeFromCart, loading, initialized } = useCart();
    const { showToast } = useToast();

    const handleRemove = async (productId) => {
        const res = await removeFromCart(productId);
        if (res.success) {
            showToast('Item removed from cart', 'success');
        } else {
            showToast('Failed to remove item', 'error');
        }
    };

    if (!initialized || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shopping Cart</h1>
                        <p className="text-slate-500">{cartCount} items in your cart</p>
                    </div>
                </div>

                {cartCount === 0 ? (
                    <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <ShoppingCart size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            Looks like you haven't added any courses to your cart yet.
                            Start exploring our courses to find the right one for you.
                        </p>
                        <button
                            onClick={() => router.push('/student/store')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all active:scale-95"
                        >
                            Explore Courses
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {cartItems.map((item) => (
                                <div
                                    key={item.product_id || item.id}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="w-24 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Package size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-lg font-bold text-slate-900">₹{item.price}</span>
                                            {item.strikethrough_price && (
                                                <span className="text-sm text-slate-400 line-through">₹{item.strikethrough_price}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(item.product_id || item.id)}
                                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title="Remove item"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-24">
                                <h2 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h2>
                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Subtotal ({cartCount} items)</span>
                                        <span>₹{cartTotal}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Taxes</span>
                                        <span className="text-xs uppercase font-bold text-slate-400 italic">Included</span>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
                                        <span className="font-bold text-slate-900 text-lg">Total Amount</span>
                                        <span className="text-3xl font-black text-blue-600">₹{cartTotal}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push('/student/checkout')}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CreditCard size={20} />
                                    Proceed to Checkout
                                </button>
                                <p className="text-center text-xs text-slate-400 mt-4">
                                    Secure SSL encrypted checkout
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;
