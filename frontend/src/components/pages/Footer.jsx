import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        // No 'fixed' or 'sticky' positioning here
        <footer className="bg-gray-900 text-white py-10">
            <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">

                <div>
                    <h3 className="text-xl font-bold mb-2">E-Shop</h3>
                    <p className="text-gray-400">Your trusted online shopping destination.</p>
                </div>

                <div>
                    <h4 className="text-lg font-semibold mb-3">Legal</h4>
                    <ul className="space-y-2">
                        <li>
                            <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition">
                                Privacy Policy
                            </Link>
                        </li>
                        <li>
                            <Link to="/terms-of-service" className="text-gray-400 hover:text-white transition">
                                Terms of Service
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="text-center mt-8 pt-6 border-t border-gray-800 text-sm text-gray-500">
                &copy; {new Date().getFullYear()} E-Shop. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
