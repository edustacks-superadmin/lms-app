import React from 'react';

const RefundPolicy = () => {
    return (
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px', color: '#1a1a1a' }}>Refund & Cancellation Policy</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>1. Refund Eligibility</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    We offer refunds within 7 days of purchase if you have accessed less than 20% of the course content.
                    To request a refund, please contact us with your order details.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>2. Non-Refundable Situations</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    Refunds will not be provided in the following cases:
                </p>
                <ul style={{ lineHeight: '1.8', color: '#555', marginLeft: '20px' }}>
                    <li>More than 7 days have passed since purchase</li>
                    <li>You have accessed more than 20% of the course content</li>
                    <li>Course completion certificates have been issued</li>
                    <li>Special promotional or discounted courses (unless otherwise stated)</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>3. Cancellation Process</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    To cancel your enrollment and request a refund:
                </p>
                <ol style={{ lineHeight: '1.8', color: '#555', marginLeft: '20px' }}>
                    <li>Send an email to maheshiesacademy@gmail.com</li>
                    <li>Include your order ID and reason for cancellation</li>
                    <li>We will process your request within 5-7 business days</li>
                </ol>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>4. Refund Processing</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    Approved refunds will be processed within 7-10 business days and credited back to the original
                    payment method used during purchase.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>5. Technical Issues</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    If you experience technical issues preventing access to course content, please contact our support
                    team first. We will work to resolve the issue before processing any refund request.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>6. Contact Us</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    For refund or cancellation requests, contact us at:
                </p>
                <p style={{ lineHeight: '1.8', color: '#555', marginTop: '10px' }}>
                    Email: maheshiesacademy@gmail.com<br />
                    Phone: +91 7658951142<br />
                    Address: Chennai, India
                </p>
            </section>
        </div>
    );
};

export default RefundPolicy;
