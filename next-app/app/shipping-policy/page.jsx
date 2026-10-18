'use client';

import React from 'react';
import { useInstitute } from '../../context/InstituteContext';

export default function ShippingPolicyPage() {
    const { institute } = useInstitute();

    const pageTitle = 'Shipping & Delivery | ' + (institute?.name || 'Mahesh IES Academy');

    if (institute?.shipping_policy) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <title>{pageTitle}</title>
                <div
                    className="prose max-w-none text-gray-700 space-y-6"
                    dangerouslySetInnerHTML={{ __html: institute.shipping_policy }}
                />
            </div>
        );
    }

    const academyName = institute?.name || 'Mahesh IES Academy';
    const email = institute?.email || 'support@edustacks.co.in';

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <title>{pageTitle}</title>
            <h1 className="text-3xl font-bold mb-8">Shipping & Delivery Policy</h1>

            <div className="prose max-w-none text-gray-700 space-y-6">
                <p>Last Updated: {new Date().toLocaleDateString()}</p>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Digital Delivery</h2>
                    <p>
                        {academyName} primarily acts as a platform for digital educational content. As such, all "shipping" is electronic.
                        Upon successful payment, you will receive immediate access to your purchased courses and materials through your user dashboard.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Access Timeframes</h2>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Instant Access:</strong> For most courses, access is granted immediately upon payment confirmation.</li>
                        <li><strong>Live Classes:</strong> Links and schedules for live sessions will be provided in your course dashboard before the scheduled time.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Physical Goods</h2>
                    <p>
                        If we ever ship physical study materials (books, notes, etc.):
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>We will ship to the address provided during checkout.</li>
                        <li>Standard shipping times are 5-7 business days within India.</li>
                        <li>Tracking information will be sent to your registered email or phone number.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Contact Us</h2>
                    <p>
                        If you do not receive access to your course content after payment, please contact us immediately at {email}.
                    </p>
                </section>
            </div>
        </div>
    );
}
