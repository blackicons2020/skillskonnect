
import React from 'react';
import { FacebookIcon, InstagramIcon, YouTubeIcon, TikTokIcon, XIcon } from './icons';
import { View } from '../types';

interface FooterProps {
    onNavigate: (view: View) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
    const footerLinks = {
        company: [
            { name: 'About Us', view: 'about' as View },
            { name: 'Services', view: 'servicesPage' as View },
        ],
        support: [
            { name: 'Help Center', view: 'help' as View },
            { name: 'Contact Us', view: 'contact' as View },
        ],
        legal: [
            { name: 'Terms of Service', view: 'terms' as View },
            { name: 'Privacy Policy', view: 'privacy' as View },
        ],
    };

    return (
        <footer className="bg-white border-t mt-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                    <div className="col-span-2 md:col-span-2">
                         <div className="flex items-center gap-3 text-2xl font-bold text-primary">
                            <img src="/footer-logo.jpg" alt="Skills Konnect" className="h-8 w-8 rounded-md" />
                            <span>Skills Konnect</span>
                        </div>
                        <p className="mt-2 text-gray-500 max-w-xs">
                            Connecting with trusted, skilled professionals for every service need, every time.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-dark tracking-wider uppercase">Company</h3>
                        <ul className="mt-4 space-y-2">
                            {footerLinks.company.map((item) => (
                                <li key={item.name}>
                                    <button onClick={() => onNavigate(item.view)} className="text-base text-gray-500 hover:text-primary">
                                        {item.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-dark tracking-wider uppercase">Support</h3>
                        <ul className="mt-4 space-y-2">
                            {footerLinks.support.map((item) => (
                                <li key={item.name}>
                                    <button onClick={() => onNavigate(item.view)} className="text-base text-gray-500 hover:text-primary">
                                        {item.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-dark tracking-wider uppercase">Legal</h3>
                        <ul className="mt-4 space-y-2">
                            {footerLinks.legal.map((item) => (
                                <li key={item.name}>
                                    <button onClick={() => onNavigate(item.view)} className="text-base text-gray-500 hover:text-primary">
                                        {item.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-12 border-t pt-8 flex flex-col sm:flex-row justify-between items-center">
                    <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Clean Connect. All rights reserved.</p>
                    <div className="flex space-x-6 mt-4 sm:mt-0">
                       <a href="https://www.facebook.com/profile.php?id=61582798031435" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                           <span className="sr-only">Facebook</span>
                           <FacebookIcon className="h-6 w-6" />
                       </a>
                       <a href="https://www.instagram.com/skillskonnect2024" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                           <span className="sr-only">Instagram</span>
                           <InstagramIcon className="h-6 w-6" />
                       </a>
                       <a href="https://x.com/skillskonnect2" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                           <span className="sr-only">X</span>
                           <XIcon className="h-6 w-6" />
                       </a>
                       <a href="https://youtube.com/@emekejohn3428?si=LRsoCiq20jFFoemU" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                           <span className="sr-only">YouTube</span>
                           <YouTubeIcon className="h-6 w-6" />
                       </a>
                       <a href="https://www.tiktok.com/@skillskonnect?_r=1&_t=ZS-94Oh7qSziiY" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                           <span className="sr-only">TikTok</span>
                           <TikTokIcon className="h-6 w-6" />
                       </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
