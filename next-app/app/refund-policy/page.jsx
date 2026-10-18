'use client';

import React from 'react';
import { useInstitute } from '../../context/InstituteContext';

export default function RefundPolicyPage() {
    const { institute } = useInstitute();

    const pageTitle = 'Refund Policy | ' + (institute?.name || 'Mahesh IES Academy');

    if (institute?.refund_policy) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <title>{pageTitle}</title>
                <div
                    className="prose max-w-none text-gray-700 space-y-6"
                    dangerouslySetInnerHTML={{ __html: institute.refund_policy }}
                />
            </div>
        );
    }

    const academyName = institute?.name || 'Mahesh IES Academy';
    const email = institute?.email || 'support@edustacks.co.in';

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <title>{pageTitle}</title>
            <h1 className="text-3xl font-bold mb-8">Refund & Cancellation Policy</h1>

            <div className="prose max-w-none text-gray-700 space-y-6">
                <p>Last Updated: {new Date().toLocaleDateString()}</p>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">1. General Policy</h2>
                    <p>
                        At {academyName}, we strive to provide the highest quality educational content.
                        Due to the digital nature of our courses, we generally do not offer refunds once the course content has been accessed.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Eligibility for Refunds</h2>
                    <p>You may be eligible for a refund only under the following specific circumstances:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Duplicate payment was made due to a technical error.</li>
                        <li>The specific course content is fundamentally different from what was advertised.</li>
                        <li>You have not accessed more than 10% of the course content.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How to Request a Refund</h2>
                    <p>
                        To request a refund, please email {email} within 3 days of your purchase with:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Your Order ID / Transaction ID.</li>
                        <li>Registered Email Address.</li>
                        <li>Reason for the refund request.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Processing Time</h2>
                    <p>
                        If your refund is approved, it will be processed within 5-7 business days. The amount will be credited back to your original method of payment.
                    </p>
                </section>
            </div>
        </div>
    );
}
