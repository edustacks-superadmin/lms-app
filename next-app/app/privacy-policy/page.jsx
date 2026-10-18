'use client';

import React from 'react';
import { useInstitute } from '../../context/InstituteContext';

export default function PrivacyPolicyPage() {
    const { institute } = useInstitute();

    // Fallback title
    const pageTitle = 'Privacy Policy | ' + (institute?.name || 'Mahesh IES Academy');

    if (institute?.privacy_policy) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <title>{pageTitle}</title>
                <div
                    className="prose max-w-none text-gray-700 space-y-6"
                    dangerouslySetInnerHTML={{ __html: institute.privacy_policy }}
                />
            </div>
        );
    }

    const academyName = institute?.name || 'Mahesh IES Academy';
    const email = institute?.email || 'support@edustacks.co.in';

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <title>{pageTitle}</title>
            <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

            <div className="prose max-w-none text-gray-700 space-y-6">
                <p>Last Updated: {new Date().toLocaleDateString()}</p>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
                    <p>
                        Welcome to <strong>{academyName}</strong>. We respect your privacy and are committed to protecting your personal data.
                        This Privacy Policy will inform you as to how we look after your personal data when you visit our website
                        and use our services, and tell you about your privacy rights and how the law protects you.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Data We Collect</h2>
                    <p>
                        We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                        <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
                        <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, and operating system updates.</li>
                        <li><strong>Usage Data:</strong> includes information about how you use our website, courses, and services.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Data</h2>
                    <p>
                        We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing course access).</li>
                        <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                        <li>Where we need to comply with a legal or regulatory obligation.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Security</h2>
                    <p>
                        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
                        In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your Legal Rights</h2>
                    <p>
                        Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Contact Us</h2>
                    <p>
                        If you have any questions about this privacy policy or our privacy practices, please contact us through the support channels available on our platform.
                        <br />
                        Email: {email}
                    </p>
                </section>
            </div>
        </div>
    );
}
