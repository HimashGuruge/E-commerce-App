import React from 'react';
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react';

const PrivacyPolicy = () => {
    return (
        <div className="max-w-4xl mx-auto py-16 px-6">
            <h1 className="text-4xl font-bold tracking-tighter text-gray-900 mb-8">Privacy Policy</h1>

            {/* Visual Steps Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex flex-col items-center text-center">
                    <ShieldCheck className="text-black mb-2" size={24} />
                    <span className="text-sm font-semibold">1. Data Collection</span>
                </div>
                <div className="flex flex-col items-center text-center">
                    <Lock className="text-black mb-2" size={24} />
                    <span className="text-sm font-semibold">2. Secure Storage</span>
                </div>
                <div className="flex flex-col items-center text-center">
                    <Eye className="text-black mb-2" size={24} />
                    <span className="text-sm font-semibold">3. Your Rights</span>
                </div>
            </div>

            <div className="space-y-8 text-gray-600 leading-relaxed">
                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
                    <p>
                        At nock, we value your privacy. We collect information you provide directly to us, such as your name, email address, and shipping details when you place an order. We also automatically collect technical data like IP addresses to improve our website experience.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Data</h2>
                    <p>
                        We use the information we collect to process your orders, communicate with you regarding your account, and provide customer support. We may also use your data to send you updates or promotional material, provided you have opted in.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Security</h2>
                    <p>
                        We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure. Your payment information is processed through secure, encrypted channels.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Third-Party Sharing</h2>
                    <p>
                        We do not sell your personal information. We only share data with trusted third-party service providers (e.g., shipping carriers, payment processors) who assist us in operating our website and conducting our business, strictly under confidentiality agreements.
                    </p>
                </section>

                <section className="bg-brand-50 p-6 rounded-xl border border-brand-100 mt-8">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-brand-900 mb-3">
                        <FileText size={20} /> Have questions about your data?
                    </h3>
                    <p className="text-brand-800">
                        If you would like to access, correct, or delete your personal information, please reach out to our privacy officer at 
                        <a href="mailto:privacy@nock.com" className="font-bold underline ml-1">privacy@nock.com</a>.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
