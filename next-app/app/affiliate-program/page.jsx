'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, DollarSign, Users, ArrowRight, Star, TrendingUp, Shield } from 'lucide-react';
import { useInstitute } from '../../context/InstituteContext';

const AffiliateProgramPage = () => {
    const router = useRouter();
    const { institute } = useInstitute();

    return (
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'var(--font-primary)' }}>
            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
                color: 'white',
                padding: '80px 20px',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '42px', fontWeight: '800', marginBottom: '24px', letterSpacing: '-0.5px' }}>
                        Become an Affiliate Partner
                    </h1>
                    <p style={{ fontSize: '18px', opacity: '0.9', marginBottom: '40px', lineHeight: '1.6' }}>
                        Join our affiliate program and earn commissions by recommending our high-quality courses to your audience.
                        It's free, simple, and profitable.
                    </p>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                        <button
                            onClick={() => router.push('/student/signup')}
                            className="btn"
                            style={{
                                backgroundColor: 'white',
                                color: 'var(--primary-color)',
                                padding: '14px 32px',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '16px',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            Start Earning Now
                        </button>
                        <button
                            onClick={() => router.push('/partner/dashboard')}
                            className="btn"
                            style={{
                                backgroundColor: 'transparent',
                                color: 'white',
                                border: '2px solid rgba(255,255,255,0.3)',
                                padding: '14px 32px',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '16px',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            Partner Login
                        </button>
                    </div>
                </div>
            </div>

            {/* Benefits Section */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Why Join Us?</h2>
                    <p style={{ color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>We value our partners and offer competitive benefits to help you succeed.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                    <BenefitCard
                        icon={<DollarSign size={32} color="var(--secondary-color)" />}
                        title="Attractive Commissions"
                        description="Earn a percentage or fixed amount for every sale made through your unique referral link or coupon code."
                    />
                    <BenefitCard
                        icon={<TrendingUp size={32} color="#3b82f6" />}
                        title="Real-time Tracking"
                        description="Monitor your sales, clicks, and earnings in real-time through our dedicated Partner Dashboard."
                    />
                    <BenefitCard
                        icon={<Shield size={32} color="#10b981" />}
                        title="Monthly Payouts"
                        description="Reliable and timely payouts directly to your bank account. We value your trust and hard work."
                    />
                </div>
            </div>

            {/* How It Works Section */}
            <div style={{ backgroundColor: 'white', padding: '80px 20px' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>How It Works</h2>
                        <p style={{ color: '#6b7280' }}>Start earning in 3 simple steps</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        <Step
                            number="1"
                            title="Register & Get Approved"
                            description="Sign up for our program. Once approved, you'll get access to your dashboard and unique referral codes."
                            link="/student/signup"
                            linkText="Register Now"
                        />
                        <Step
                            number="2"
                            title="Promote Courses"
                            description="Share your unique coupon codes or links with your audience on social media, blogs, or email."
                            noLine
                        />
                        <Step
                            number="3"
                            title="Earn Commissions"
                            description="Get paid for every student who purchases a course using your code. Track your earnings instantly."
                            last
                        />
                    </div>
                </div>
            </div>

            {/* Registration Instructions Section */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 20px' }}>
                <div style={{ backgroundColor: '#eff6ff', borderRadius: '16px', padding: '40px', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                        <div style={{
                            background: 'white',
                            padding: '12px',
                            borderRadius: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            <Users size={32} color="var(--primary-color)" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1e3a8a', marginBottom: '16px' }}>
                                How to Register & Login?
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <CheckCircle size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <p style={{ color: '#1e40af', margin: 0, lineHeight: '1.5' }}>
                                        <strong>Step 1:</strong> Create a regular student account by clicking on <a href="/student/signup" style={{ textDecoration: 'underline', color: 'inherit' }}>Sign Up</a>.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <CheckCircle size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <p style={{ color: '#1e40af', margin: 0, lineHeight: '1.5' }}>
                                        <strong>Step 2:</strong> Contact our support team via <a href={`mailto:${institute?.email}`} style={{ textDecoration: 'underline', color: 'inherit' }}>email</a> to request "Influencer Access".
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <CheckCircle size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <p style={{ color: '#1e40af', margin: 0, lineHeight: '1.5' }}>
                                        <strong>Step 3:</strong> Once approved, we will assign a unique coupon code to your account.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <CheckCircle size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <p style={{ color: '#1e40af', margin: 0, lineHeight: '1.5' }}>
                                        <strong>Step 4:</strong> Go to the <a href="/partner/dashboard" style={{ textDecoration: 'underline', color: 'inherit' }}>Partner Dashboard</a> to track your sales and earnings.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div style={{ textAlign: 'center', padding: '0 20px 80px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>Ready to get started?</h2>
                <button
                    onClick={() => router.push('/student/signup')}
                    style={{
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        padding: '16px 48px',
                        borderRadius: '999px',
                        fontWeight: '600',
                        fontSize: '18px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                    }}
                >
                    Become an Affiliate
                </button>
            </div>
        </div>
    );
};

const BenefitCard = ({ icon, title, description }) => (
    <div style={{
        backgroundColor: 'white',
        padding: '32px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        transition: 'transform 0.2s',
        cursor: 'default'
    }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
        <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
        }}>
            {icon}
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>{title}</h3>
        <p style={{ color: '#6b7280', lineHeight: '1.6' }}>{description}</p>
    </div>
);

const Step = ({ number, title, description, link, linkText, last }) => (
    <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '20px',
                flexShrink: 0,
                zIndex: 1
            }}>
                {number}
            </div>
            {!last && <div style={{ width: '2px', flex: 1, backgroundColor: '#e5e7eb', minHeight: '40px' }} />}
        </div>
        <div style={{ paddingBottom: last ? 0 : '40px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: '#111827' }}>{title}</h3>
            <p style={{ color: '#6b7280', lineHeight: '1.6', fontSize: '16px', marginBottom: link ? '12px' : 0 }}>
                {description}
            </p>
            {link && (
                <a href={link} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--primary-color)',
                    fontWeight: '600',
                    textDecoration: 'none'
                }}>
                    {linkText} <ArrowRight size={16} />
                </a>
            )}
        </div>
    </div>
);

export default AffiliateProgramPage;
