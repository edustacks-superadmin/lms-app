'use client';

import React, { useEffect } from 'react';
import { useInstitute } from '../../context/InstituteContext';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ContactUsPage() {
    const { institute, loading } = useInstitute();
    const router = useRouter();

    useEffect(() => {
        if (!loading && institute?.feature_flags?.contactUsEnabled === false) {
            router.push('/');
        }
    }, [loading, institute, router]);

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading contact details...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-8 text-center">Contact Us</h1>

            <div className="bg-white shadow rounded-lg p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">Get in Touch</h2>
                        <p className="text-gray-600">
                            We are here to help you. Reach out to us via any of the following methods.
                        </p>

                        <div className="space-y-4 mt-6">
                            {institute?.address && (
                                <div className="flex items-start space-x-3 text-gray-700">
                                    <MapPin className="w-5 h-5 text-indigo-600 mt-1" />
                                    <span>{institute.address}</span>
                                </div>
                            )}

                            {institute?.phone && (
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <Phone className="w-5 h-5 text-indigo-600" />
                                    <a href={`tel:${institute.phone}`} className="hover:text-indigo-600 text-lg">
                                        {institute.phone}
                                    </a>
                                </div>
                            )}

                            {institute?.email && (
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <Mail className="w-5 h-5 text-indigo-600" />
                                    <a href={`mailto:${institute.email}`} className="hover:text-indigo-600">
                                        {institute.email}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-4">Support Hours</h3>
                        <p className="text-sm text-gray-600 mb-2">Monday - Saturday</p>
                        <p className="font-semibold text-gray-800 mb-6">9:00 AM - 6:00 PM</p>

                        <p className="text-xs text-gray-500">
                            We typically respond to emails within 24 hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
