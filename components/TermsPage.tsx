import React from 'react';

export const TermsPage: React.FC = () => {
    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto">
                <div className="max-w-3xl mx-auto prose">
                    <h1 className="text-4xl font-bold text-center text-dark mb-8">Terms of Service</h1>
                    <p className="text-sm text-gray-500 text-center mb-8">Last updated: {new Date().toLocaleDateString()}</p>
                    
                    <h2>1. Introduction</h2>
                    <p>Welcome to Skills Konnect. These Terms of Service ("Terms") govern your use of the Skills Konnect website and services. By using our platform, you agree to these terms.</p>

                    <h2>2. Services</h2>
                    <p>Skills Konnect provides a platform for connecting individuals and companies seeking professional services ("Clients") with independent skilled professionals ("Service Providers") across multiple categories including construction, tech, events, creative arts, personal services, and more. We are a neutral venue and are not directly involved in the agreements between Clients and Service Providers.</p>

                    <h2>3. User Obligations</h2>
                    <p>You agree to provide accurate and complete information during registration and to keep this information up to date. You are responsible for maintaining the confidentiality of your account password.</p>

                    <h2>4. Payments</h2>
                    <p>For Escrow payments, Clients agree to pay the total amount, including service fees, to Skills Konnect. Funds will be released to the Service Provider upon satisfactory completion of the job, as confirmed by the Client. For Direct payments, Skills Konnect is not responsible for any disputes, and payment terms are to be agreed upon solely between the Client and the Service Provider.</p>

                    <h2>5. Limitation of Liability</h2>
                    <p>Skills Konnect is not liable for any damages arising from the conduct of users on the platform. We are not responsible for the performance or quality of services provided by Service Providers.</p>

                    <h2>6. Termination</h2>
                    <p>We may suspend or terminate your account at our discretion if you violate any of these terms.</p>
                </div>
            </div>
        </div>
    );
};
