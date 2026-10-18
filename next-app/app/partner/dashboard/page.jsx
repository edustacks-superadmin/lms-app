'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, DollarSign, Share2, Copy, CheckCircle } from 'lucide-react';

const PartnerDashboard = () => {
    const { user, loading: userLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login?redirect=/partner/dashboard');
            return;
        }

        if (user?.email) {
            fetchStats(user.email);
        }
    }, [user, userLoading]);

    const fetchStats = async (email) => {
        try {
            const res = await fetch(`/api/partner/dashboard?email=${encodeURIComponent(email)}`);
            const data = await res.json();
            if (data.isInfluencer && Array.isArray(data.stats)) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching partner stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (userLoading || loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ fontSize: '18px', color: '#64748b' }}>Loading your dashboard...</div>
            </div>
        );
    }

    if (!stats.length) {
        return (
            <div style={{ minHeight: '100vh', padding: '40px', background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: '600px', textAlign: 'center', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ marginBottom: '20px', display: 'inline-flex', padding: '16px', borderRadius: '50%', background: '#e2e8f0' }}>
                        <BarChart3 size={48} color="#64748b" />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>Not an Active Partner</h2>
                    <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
                        It looks like there are no active influencer campaigns linked to your account ({user?.email}).
                        Please contact the support team to activate your partner status.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    // Currently showing aggregated stats for all coupons or just the first main one
    // For simplicity, let's render cards for each coupon if multiple
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 20px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <header style={{ marginBottom: '40px', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Partner Dashboard</h1>
                    <p style={{ color: '#64748b', fontSize: '16px' }}>Track your referrals, sales, and earnings in real-time.</p>
                </header>

                {stats.map((stat, index) => (
                    <div key={index} style={{ marginBottom: '40px' }}>
                        {/* Coupon Card */}
                        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', borderRadius: '20px', padding: '32px', color: 'white', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', opacity: 0.9, marginBottom: '8px' }}>YOUR EXCLUSIVE CODE</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.2)', padding: '8px 24px', borderRadius: '12px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '2px', fontFamily: 'monospace' }}>{stat.code}</span>
                                <button
                                    onClick={() => copyToClipboard(stat.code)}
                                    title="Copy Code"
                                    style={{ background: 'white', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4f46e5', transition: 'transform 0.1s' }}
                                >
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                Share this code with your audience. You earn <strong>{stat.commission_policy}</strong>.
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ padding: '10px', background: '#ecfccb', borderRadius: '10px' }}>
                                        <DollarSign size={24} color="#65a30d" />
                                    </div>
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#64748b' }}>Total Earnings</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>
                                    ₹{stat.total_commission.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '13px', color: '#65a30d', marginTop: '4px', fontWeight: '500' }}>
                                    Ready for payout based on schedule
                                </div>
                            </div>

                            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ padding: '10px', background: '#e0f2fe', borderRadius: '10px' }}>
                                        <TrendingUp size={24} color="#0284c7" />
                                    </div>
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#64748b' }}>Total Sales</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>
                                    {stat.total_sales}
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                    Successful orders using your code
                                </div>
                            </div>

                            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ padding: '10px', background: '#f3e8ff', borderRadius: '10px' }}>
                                        <Share2 size={24} color="#9333ea" />
                                    </div>
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#64748b' }}>Revenue Generated</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>
                                    ₹{stat.total_revenue.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                    Total value of sales
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PartnerDashboard;
