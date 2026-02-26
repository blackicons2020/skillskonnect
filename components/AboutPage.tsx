import React from 'react';

export const AboutPage: React.FC = () => {
    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-4xl font-bold text-center text-dark mb-4">About Skills Konnect</h1>
                    <p className="text-lg text-gray-600 text-center mb-8">
                        Connecting with trusted, skilled professionals for every service need, every time.
                    </p>
                    
                    <div className="space-y-6 text-gray-700">
                        <h2 className="text-2xl font-semibold text-primary">Our Mission</h2>
                        <p>
                            To empower skilled professionals across Nigeria by providing them with a platform to connect with clients, grow their businesses, and build a reputation for excellence. For clients, our mission is to make finding reliable, vetted, and top-quality professionals as simple and seamless as possible - whether you need a plumber, web developer, event planner, or any skilled service provider.
                        </p>

                        <h2 className="text-2xl font-semibold text-primary">Our Vision</h2>
                        <p>
                            To be the most trusted and widely used platform for professional services in Nigeria, setting a new standard for quality, reliability, and professionalism across all skill categories. We envision a future where every individual and business can easily access the best skilled professionals, contributing to productivity and growth nationwide.
                        </p>

                        <h2 className="text-2xl font-semibold text-primary">Our Values</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><strong>Trust & Safety:</strong> We prioritize the safety and security of our users. All professionals on our platform undergo a vetting process to ensure they are reliable and trustworthy.</li>
                            <li><strong>Quality:</strong> We are committed to high standards. We encourage continuous feedback and ratings to maintain a community of top-performing professionals across all skill categories.</li>
                            <li><strong>Empowerment:</strong> We provide skilled professionals with the tools and visibility they need to succeed and build sustainable businesses.</li>
                            <li><strong>Convenience:</strong> Our platform is designed to be user-friendly, making the process of booking and managing professional services effortless for clients.</li>
                            <li><strong>Diversity:</strong> We celebrate the diversity of skills and talents, from construction trades to creative arts, tech services to hospitality, all in one platform.</li>
                            <li><strong>Community:</strong> We are building a community of clients and service providers based on respect, professionalism, and a shared goal of excellence.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
