import React from 'react';

const TermsAndConditions = () => {
    return (
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px', color: '#1a1a1a' }}>Terms and Conditions</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>1. Acceptance of Terms</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    By accessing and using Mahesh IES Academy's services, you accept and agree to be bound by the
                    terms and provision of this agreement.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>2. Course Enrollment</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    When you enroll in a course, you are granted a limited, non-exclusive, non-transferable license
                    to access and view the course content for your personal, non-commercial use only.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>3. Payment Terms</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    All payments are processed securely through Razorpay. By making a purchase, you agree to provide
                    current, complete, and accurate purchase and account information.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>4. Refund Policy</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    Please refer to our Refund & Cancellation Policy for detailed information about refunds and cancellations.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>5. User Conduct</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    You agree not to use the service for any unlawful purpose or in any way that might harm, damage,
                    or disparage any other party.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>6. Intellectual Property</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    All course materials, including but not limited to text, graphics, logos, and videos, are the
                    property of Mahesh IES Academy and are protected by copyright laws.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>7. Contact Information</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    For any questions regarding these terms, please contact us at:
                </p>
                <p style={{ lineHeight: '1.8', color: '#555', marginTop: '10px' }}>
                    Email: maheshiesacademy@gmail.com<br />
                    Address: Chennai, India
                </p>
            </section>
        </div>
    );
};

export default TermsAndConditions;
