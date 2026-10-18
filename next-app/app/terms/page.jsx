'use client';

import React from 'react';
import { useInstitute } from '../../context/InstituteContext';

export default function TermsPage() {
    const { institute } = useInstitute();

    const pageTitle = 'Terms of Service | ' + (institute?.name || 'Mahesh IES Academy');

    if (institute?.terms_of_service) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <title>{pageTitle}</title>
                <div
                    className="prose max-w-none text-gray-700 space-y-6"
                    dangerouslySetInnerHTML={{ __html: institute.terms_of_service }}
                />
            </div>
        );
    }

    const academyName = institute?.name || 'Mahesh IES Academy';

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <title>{pageTitle}</title>
            <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

            <div className="prose max-w-none text-gray-700 space-y-6">
                <p>Last Updated: {new Date().toLocaleDateString()}</p>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
                    <p>
                        By accessing or using the services provided by <strong>{academyName}</strong>, you agree to be bound by these Terms of Service.
                        If you do not agree to these terms, you may not access or use the service.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Educational Services</h2>
                    <p>
                        We provide educational content, courses, and assessments. We reserve the right to modify, suspend, or discontinue any part of the service at any time.
                        Content is for personal, educational use only.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
                    <p>
                        You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
                        You agree not to disclose your password to any third party.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Intellectual Property</h2>
                    <p>
                        The service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of {academyName} and its licensors.
                        Course materials may not be reproduced, distributed, or sold without our express written permission.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Termination</h2>
                    <p>
                        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Limitation of Liability</h2>
                    <p>
                        In no event shall {academyName}, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Changes</h2>
                    <p>
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                    </p>
                </section>
            </div>
        </div>
    );
}
