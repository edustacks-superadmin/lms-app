import React from 'react';

const ShippingPolicy = () => {
    return (
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px', color: '#1a1a1a' }}>Shipping Policy</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>Last updated: {new Date().toLocaleDateString()}</p>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>1. Delivery of Online Courses</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    Upon successful purchase of a course or subscription, you will receive immediate access to the digital content.
                    Confirmation of your enrollment will be sent to your registered email address.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>2. Physical Study Materials</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    If your purchase includes physical study materials (books, notes, etc.):
                </p>
                <ul style={{ lineHeight: '1.8', color: '#555', marginLeft: '20px', marginTop: '10px' }}>
                    <li>Orders are processed within 1-2 business days.</li>
                    <li>Standard shipping typically takes 5-7 business days within India.</li>
                    <li>You will receive a tracking number via email once your order has shipped.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>3. Shipping Charges</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    Shipping charges for physical materials, if applicable, will be calculated and displayed at checkout.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>4. Contact Us</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    If you have any issues with accessing your content or receiving your shipment, please contact us at:
                </p>
                <p style={{ lineHeight: '1.8', color: '#555', marginTop: '10px' }}>
                    Email: maheshiesacademy@gmail.com
                </p>
            </section>
        </div>
    );
};

export default ShippingPolicy;
