import React from 'react';

export const ServicesPage: React.FC = () => {
    const homeServices = [
        "Residential/Domestic Cleaning", "Deep Cleaning", "Move-In / Move-Out Cleaning",
        "Carpet and Upholstery Cleaning", "Laundry & Ironing", "Spring Cleaning",
        "Plumbing & Repairs", "Electrical Work", "Painting & Decorating",
        "Furniture Assembly", "Pest Control", "Landscaping & Gardening"
    ];
    const professionalServices = [
        "Commercial/Office Cleaning", "Catering & Event Staffing", "Security Services",
        "Driver / Chauffeur", "Administrative Assistant", "Tailoring & Fashion Design",
        "Photography & Videography", "Graphic Design", "Web & App Development",
        "Accounting & Bookkeeping", "Legal Consulting", "Translation & Interpretation"
    ];
    const personalServices = [
        "Hair Styling & Barbering", "Makeup & Beauty", "Personal Fitness Training",
        "Private Tutoring", "Childcare & Babysitting", "Elderly Care",
        "Health & Wellness Coaching", "Event Planning", "Interior Design",
        "Music Lessons", "Catering / Personal Chef", "Pet Care & Grooming"
    ];
    const specializedServices = [
        "Medical & Nursing Care", "Sanitization / Disinfection", "Post-Construction Cleaning",
        "Disaster Cleaning & Restoration", "Hazardous Waste Cleaning", "Vehicle Cleaning",
        "Industrial Cleaning", "Waste Management", "IT Support & Repairs",
        "Social Media Management", "Content Writing & Copywriting", "Virtual Assistant"
    ];

    const renderServiceList = (title: string, services: string[]) => (
        <div className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-4">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(service => (
                    <div key={service} className="bg-light p-4 rounded-lg">
                        <p className="font-medium text-dark">{service}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold text-center text-dark mb-4">Our Services</h1>
                    <p className="text-lg text-gray-600 text-center mb-10">
                        We connect you with skilled professionals across hundreds of service categories. Whether you need help at home, at work, or beyond — we've got you covered.
                    </p>
                    
                    {renderServiceList("Home & Household Services", homeServices)}
                    {renderServiceList("Professional & Business Services", professionalServices)}
                    {renderServiceList("Personal & Lifestyle Services", personalServices)}
                    {renderServiceList("Specialized & Technical Services", specializedServices)}
                </div>
            </div>
        </div>
    );
};

