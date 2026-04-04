import React from 'react';

export const PrivacyPage: React.FC = () => {
    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto">
                <div className="max-w-3xl mx-auto prose">
                    <h1 className="text-4xl font-bold text-center text-dark mb-8">Privacy Policy</h1>
                    <p className="text-sm text-gray-500 text-center mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                    <h2>1. Information We Collect</h2>
                    <p>We collect information you provide directly to us, such as when you create an account, including your name, email, phone number, address, and payment information. We also collect information about your use of our services, such as booking history.</p>

                    <h2>2. How We Use Your Information</h2>
                    <p>We use your information to operate, maintain, and provide the features of the Skills Konnect platform. This includes connecting Clients with skilled professionals across various service categories, processing payments, and communicating with you.</p>

                    <h2>3. Information Sharing</h2>
                    <p>We may share necessary information between a Client and a Professional to facilitate a booking. We do not sell your personal data to third parties. We may share information with law enforcement if required by law.</p>

                    <h2>4. Data Security</h2>
                    <p>We implement reasonable security measures to protect your information from unauthorized access, alteration, or disclosure.</p>

                    <h2>5. Your Choices</h2>
                    <p>You can review and update your account information at any time by logging into your account dashboard.</p>

                    <h2>6. Data Deletion Policy</h2>
                    <p>You have the right to request the deletion of your personal data and account at any time. To request account deletion, you may delete your account directly from the settings menu within the Skills Konnect app, or submit a request through our <a href="/delete-account" className="text-primary underline">Account Deletion Request form</a>. Upon request, we will remove your personal data from our active databases, subject to any legal obligations to retain certain information.</p>

                    <h2>7. User-Generated Content &amp; Messaging Safety</h2>
                    <p>Skills Konnect includes a direct messaging feature that allows users to communicate with each other. Users are responsible for the content they send through the platform. We do not pre-screen messages but we reserve the right to review and remove content that violates our Terms of Service.</p>
                    <p><strong>Reporting &amp; Blocking:</strong> You may report or block any user directly from within a conversation. To do so, open the conversation, tap the <strong>⋮</strong> (more options) button in the top-right corner of the chat, and choose <em>Report User</em> or <em>Block User</em>. Blocking a user removes the conversation from your inbox and prevents them from messaging you. Reported users are reviewed by our moderation team.</p>
                    <p>We do not tolerate harassment, spam, hate speech, or any form of abusive behaviour through our messaging system. Violations may result in account suspension or permanent removal from the platform.</p>
                </div>
            </div>
        </div>
    );
};
