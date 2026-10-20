import React, { useState } from 'react';
import { ShieldCheck, CreditCard, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RazorpayCheckoutTest = () => {
    const navigate = useNavigate();
    const [amountRupees, setAmountRupees] = useState(1);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [paymentResult, setPaymentResult] = useState(null);
    const [error, setError] = useState(null);

    const handlePayment = async () => {
        setLoading(true);
        setError(null);
        setStatusMessage('Creating Razorpay order...');
        setPaymentResult(null);

        try {
            const amountInPaise = Math.round(Number(amountRupees) * 100);
            if (amountInPaise < 100) {
                throw new Error('Minimum amount is ₹1 (100 paise)');
            }

            // 1. Create order on backend
            const createResponse = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amountInPaise,
                    currency: 'INR',
                    receipt: `test_rcpt_${Date.now()}`,
                    isTest: true
                })
            });

            const orderData = await createResponse.json();

            if (!createResponse.ok || !orderData.success) {
                throw new Error(orderData.error || 'Failed to create Razorpay order');
            }

            const { order_id, key_id, amount, currency } = orderData;
            setStatusMessage(`Order created (${order_id}). Opening payment modal...`);

            // Ensure Razorpay SDK is loaded
            if (!window.Razorpay) {
                throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
            }

            // 2. Open Razorpay Standard Checkout
            const options = {
                key: key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Tq3mKqJrkwcF5A',
                amount: amount,
                currency: currency || 'INR',
                name: 'Mahesh IES Academy',
                description: 'Razorpay Integration Test Transaction',
                order_id: order_id,
                prefill: {
                    name: 'Test Student',
                    email: 'student@maheshiesacademy.com',
                    contact: '9999999999'
                },
                theme: {
                    color: '#2563eb'
                },
                handler: async function (response) {
                    setStatusMessage('Verifying payment signature...');
                    try {
                        // 3. Verify signature on backend
                        const verifyResponse = await fetch('/api/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyResponse.json();

                        if (!verifyResponse.ok || !verifyData.verified) {
                            throw new Error(verifyData.error || 'Payment signature verification failed');
                        }

                        setStatusMessage(null);
                        setPaymentResult({
                            orderId: response.razorpay_order_id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                            amount: amountRupees
                        });
                    } catch (verifyErr) {
                        setError(verifyErr.message || 'Signature verification error');
                    } finally {
                        setLoading(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                        setStatusMessage('Payment cancelled by user.');
                    }
                }
            };

            const rzp = new window.Razorpay(options);

            rzp.on('payment.failed', function (failResponse) {
                setLoading(false);
                setError(failResponse.error?.description || 'Payment failed. Please try again.');
            });

            rzp.open();
        } catch (err) {
            console.error('Payment checkout error:', err);
            setError(err.message || 'Unexpected payment error');
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: '32px' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Razorpay Standard Checkout</h1>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Mahesh IES Academy • Test Mode</p>
                    </div>
                </div>

                <div style={{ backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '16px', margin: '24px 0', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <ShieldCheck size={18} color="#2563eb" />
                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>Razorpay Test Credentials</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                        <div><strong>Test Card:</strong> <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>4100 2800 0000 1007</code></div>
                        <div><strong>CVV:</strong> <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>123</code> | <strong>Expiry:</strong> <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>12/26</code></div>
                        <div><strong>Test UPI:</strong> <code style={{ backgroundColor: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>test@razorpay</code></div>
                    </div>
                </div>

                {error && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', color: '#991b1b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {statusMessage && (
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', color: '#1e40af', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <Loader2 size={18} className="animate-spin" />
                        <span>{statusMessage}</span>
                    </div>
                )}

                {paymentResult ? (
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
                        <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#15803d', margin: '0 0 6px' }}>Test Payment Verified!</h2>
                        <p style={{ fontSize: '14px', color: '#166534', margin: '0 0 16px' }}>Signature matches HMAC-SHA256. You can now confirm Step 3 in your Razorpay dashboard.</p>
                        <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', textAlign: 'left', fontSize: '12px', color: '#334155', border: '1px solid #dcfce7' }}>
                            <div><strong>Order ID:</strong> {paymentResult.orderId}</div>
                            <div><strong>Payment ID:</strong> {paymentResult.paymentId}</div>
                            <div><strong>Amount:</strong> ₹{paymentResult.amount}</div>
                        </div>
                        <button
                            onClick={() => { setPaymentResult(null); setStatusMessage(null); }}
                            style={{ marginTop: '16px', backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            Make Another Test Payment
                        </button>
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Amount to Pay (INR)</label>
                            <input
                                type="number"
                                min="1"
                                value={amountRupees}
                                onChange={(e) => setAmountRupees(Math.max(1, Number(e.target.value)))}
                                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', boxSizing: 'border-box' }}
                            />
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Minimum: ₹1 (100 paise)</span>
                        </div>

                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            style={{
                                width: '100%',
                                backgroundColor: loading ? '#93c5fd' : '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                padding: '14px',
                                borderRadius: '10px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
                            Pay ₹{amountRupees} (Standard Web Checkout)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RazorpayCheckoutTest;
