'use client';

import React from 'react';
import { useInstitute } from '../../context/InstituteContext';

export default function DeleteAccountPage() {
    const { institute } = useInstitute();

    const pageTitle = 'Delete Account | ' + (institute?.name || 'Mahesh IES Academy');

    if (institute?.delete_account_policy) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <title>{pageTitle}</title>
                <div
                    className="prose max-w-none text-gray-700 space-y-6"
                    dangerouslySetInnerHTML={{ __html: institute.delete_account_policy }}
                />
            </div>
        );
    }

    const academyName = institute?.name || 'Mahesh IES Academy';
    const email = institute?.email || 'support@edustacks.co.in';

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <title>{pageTitle}</title>
            <h1 className="text-3xl font-bold mb-8">Delete Account</h1>

            <div className="prose max-w-none text-gray-700 space-y-6">
                <p>
                    We value your privacy and your right to control your personal data. If you wish to delete your account and associated data from the {academyName} platform, please follow the instructions below.
                </p>

                <section className="bg-red-50 p-6 rounded-lg border border-red-100">
                    <h2 className="text-xl font-semibold text-red-800 mb-3">Warning</h2>
                    <p className="text-red-700">
                        Deleting your account is <strong>permanent</strong>. You will lose access to:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-red-700">
                        <li>All purchased courses and content.</li>
                        <li>Your learning progress and quiz history.</li>
                        <li>Your profile information.</li>
                    </ul>
                    <p className="mt-4 text-red-700 font-medium">
                        This action cannot be undone.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">How to Request Deletion</h2>
                    <p>
                        To request permanent account deletion, please contact our support team:
                    </p>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p><strong>Email:</strong> {email}</p>
                        <p><strong>Subject:</strong> Request Account Deletion</p>
                        <p className="mt-2">
                            Please send the email from the address associated with your account. We may ask for additional verification to confirm your identity before processing the request.
                        </p>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Retention</h2>
                    <p>
                        Once your request is processed, your personal data will be deleted from our active databases.
                        However, we may retain certain information as required by law or for legitimate business purposes (such as payment records).
                    </p>
                </section>
            </div>
        </div>
    );
}
