import React from 'react';

const PrivacyPolicy = () => {
    return (
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px', color: '#1a1a1a' }}>Privacy Policy</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>1. Information We Collect</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    We collect information you provide directly to us when you create an account, enroll in courses,
                    or make purchases. This includes your name, email address, phone number, and payment information.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>2. How We Use Your Information</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    We use the information we collect to:
                </p>
                <ul style={{ lineHeight: '1.8', color: '#555', marginLeft: '20px' }}>
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process your transactions and send you related information</li>
                    <li>Send you technical notices, updates, and support messages</li>
                    <li>Respond to your comments and questions</li>
                    <li>Monitor and analyze trends, usage, and activities</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>3. Information Sharing</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    We do not share your personal information with third parties except as described in this policy.
                    We may share information with payment processors (Razorpay) to complete transactions.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>4. Data Security</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    We take reasonable measures to help protect your personal information from loss, theft,
                    misuse, unauthorized access, disclosure, alteration, and destruction.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>5. Your Rights</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    You have the right to access, update, or delete your personal information at any time by
                    logging into your account or contacting us directly.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>6. Contact Us</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <p style={{ lineHeight: '1.8', color: '#555', marginTop: '10px' }}>
                    Email: maheshiesacademy@gmail.com<br />
                    Address: Chennai, India
                </p>
            </section>
        </div>
    );
};

export default PrivacyPolicy;
