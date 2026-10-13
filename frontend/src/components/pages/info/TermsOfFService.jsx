import React from 'react';
import { Scale, AlertCircle, FileCheck, ShieldAlert } from 'lucide-react';

const TermsOfService = () => {
    return (
        <div className="max-w-4xl mx-auto py-16 px-6">
            <h1 className="text-4xl font-bold tracking-tighter text-gray-900 mb-8">Terms of Service</h1>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex flex-col items-center text-center">
                    <Scale className="text-black mb-2" size={24} />
                    <span className="text-sm font-semibold">1. Usage Rules</span>
                </div>
                <div className="flex flex-col items-center text-center">
                    <FileCheck className="text-black mb-2" size={24} />
                    <span className="text-sm font-semibold">2. Service Terms</span>
                </div>
                <div className="flex flex-col items-center text-center">
                    <ShieldAlert className="text-black mb-2" size={24} />
                    <span className="text-sm font-semibold">3. Liability</span>
                </div>
            </div>

            <div className="space-y-8 text-gray-600 leading-relaxed">
                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
                    <p>
                        By accessing or using the services provided by nock, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Intellectual Property</h2>
                    <p>
                        The service and its original content, features, and functionality are the exclusive property of nock and its licensors. You may not reproduce, distribute, or create derivative works of any portion of the service without explicit permission.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
                    <p>
                        When you create an account, you must provide accurate and complete information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Limitation of Liability</h2>
                    <p>
                        In no event shall nock, nor its directors or employees, be liable for any indirect, incidental, or consequential damages arising out of your use of our services, even if we have been advised of the possibility of such damages.
                    </p>
                </section>

                <section className="bg-amber-50 p-6 rounded-xl border border-amber-100 mt-8">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-900 mb-3">
                        <AlertCircle size={20} /> Legal Inquiries
                    </h3>
                    <p className="text-amber-800">
                        For any legal notices or questions regarding these terms, please contact our legal department at 
                        <a href="mailto:legal@nock.com" className="font-bold underline ml-1">legal@nock.com</a>.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default TermsOfService;
