import React, { useState } from 'react';
import { View } from '../types';

const FAQItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
    <details className="p-4 rounded-lg bg-light group border border-gray-100">
        <summary className="font-semibold text-dark cursor-pointer list-none flex justify-between items-center">
            {question}
            <span className="transform transition-transform duration-300 group-open:rotate-180 flex-shrink-0 ml-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </span>
        </summary>
        <div className="mt-4 text-gray-600 space-y-2 leading-relaxed">
            {children}
        </div>
    </details>
);

const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
    <div className="flex items-center gap-3 mt-10 mb-4">
        <span className="text-3xl">{icon}</span>
        <h2 className="text-2xl font-bold text-primary">{title}</h2>
    </div>
);

export const HelpCenterPage: React.FC<{ onNavigate: (page: View) => void }> = ({ onNavigate }) => {
    const [activeSection, setActiveSection] = useState<'all' | 'clients' | 'workers' | 'account' | 'payments'>('all');

    const sections = [
        { id: 'all' as const, label: 'All Topics' },
        { id: 'clients' as const, label: '👤 For Clients' },
        { id: 'workers' as const, label: '🔧 For Professionals' },
        { id: 'account' as const, label: '⚙️ Account & Profile' },
        { id: 'payments' as const, label: '💳 Payments & Subscriptions' },
    ];

    return (
        <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto">
                <div className="max-w-3xl mx-auto">

                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold text-dark mb-3">Help Center</h1>
                        <p className="text-lg text-gray-600">
                            Everything you need to know about using Skills Konnect — from signing up to getting paid.
                        </p>
                    </div>

                    {/* Quick Guide Banner */}
                    <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl p-6 mb-10 shadow-lg">
                        <h2 className="text-xl font-bold mb-2">🚀 Quick Start Guide</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                            <div className="bg-white/20 rounded-lg p-3">
                                <p className="font-bold mb-1">If you're a Client:</p>
                                <ol className="space-y-1 list-decimal list-inside text-white/90">
                                    <li>Sign up and complete your profile</li>
                                    <li>Browse or search for professionals</li>
                                    <li>Book a professional or post a job</li>
                                    <li>Confirm job completion and leave a review</li>
                                </ol>
                            </div>
                            <div className="bg-white/20 rounded-lg p-3">
                                <p className="font-bold mb-1">If you're a Professional:</p>
                                <ol className="space-y-1 list-decimal list-inside text-white/90">
                                    <li>Sign up and complete your profile</li>
                                    <li>Choose a subscription plan</li>
                                    <li>Apply to posted jobs or get booked</li>
                                    <li>Complete jobs and earn great reviews</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex overflow-x-auto gap-2 pb-2 mb-6">
                        {sections.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSection(s.id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                    activeSection === s.id
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">

                        {/* ── FOR CLIENTS ── */}
                        {(activeSection === 'all' || activeSection === 'clients') && (
                            <>
                                <SectionHeader icon="👤" title="For Clients" />

                                <FAQItem question="How do I sign up as a client?">
                                    <p>Click <strong>Sign Up</strong> on the homepage. Enter your email and password, then on your dashboard click <strong>Complete Your Profile</strong>. Select <em>Client (Individual)</em> or <em>Client (Company)</em>, fill in your personal or company details, contact info, and location. Once saved you'll have full access to the platform.</p>
                                </FAQItem>

                                <FAQItem question="How do I search for and find a professional?">
                                    <p>After completing your profile, go to the <strong>Find a Professional</strong> tab on your dashboard. You can filter professionals by:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li><strong>Service type</strong> — e.g. House Cleaning, Office Cleaning, Laundry</li>
                                        <li><strong>Location</strong> — city or area</li>
                                        <li><strong>Price range</strong> — minimum/maximum rate</li>
                                        <li><strong>Rating</strong> — minimum star rating</li>
                                    </ul>
                                    <p className="mt-2">Professionals closest to you with active subscriptions appear first in results.</p>
                                </FAQItem>

                                <FAQItem question="How do I book a professional?">
                                    <p>Find a professional you like and click their card to view their full profile. Then click <strong>Book Now</strong>. A booking modal will appear where you enter the job date, time, and description, then confirm. The professional will be notified and the booking appears in your <strong>My Bookings</strong> tab.</p>
                                </FAQItem>

                                <FAQItem question="How do I post a job for professionals to apply to?">
                                    <p>Go to the <strong>My Posted Jobs</strong> tab on your dashboard and click <strong>Post a New Job</strong>. Fill in the job title, description, service category, location, and budget. Once posted, subscribed professionals in your area can view it in their <strong>Available Jobs</strong> tab and apply. You can then review applicants and contact your preferred professional directly.</p>
                                </FAQItem>

                                <FAQItem question="How do I confirm a job is completed?">
                                    <p>Once a professional finishes the job, go to <strong>My Bookings</strong> on your dashboard, find the booking, and click <strong>Mark as Completed</strong>. This updates the booking status and triggers a prompt asking you to leave a review for the professional.</p>
                                </FAQItem>

                                <FAQItem question="How do I leave a review for a professional?">
                                    <p>After marking a booking as completed, you will see a <strong>Leave a Review</strong> button on that booking. Rate the professional on overall quality, timeliness, thoroughness, and professional conduct. Reviews are public and help other clients make informed choices.</p>
                                </FAQItem>

                                <FAQItem question="Can I message a professional before booking?">
                                    <p>Yes. On a professional's profile card you'll see a <strong>Message</strong> button. Click it to open a direct chat with that professional in the <strong>Messages</strong> tab. Discuss job details, get quotes, and confirm availability before making a formal booking.</p>
                                </FAQItem>
                            </>
                        )}

                        {/* ── FOR WORKERS ── */}
                        {(activeSection === 'all' || activeSection === 'workers') && (
                            <>
                                <SectionHeader icon="🔧" title="For Professionals" />

                                <FAQItem question="How do I sign up as a professional?">
                                    <p>Click <strong>Sign Up</strong> on the homepage. After entering your email and password, your dashboard will open. Complete your profile by selecting <em>Professional (Individual)</em> or <em>Professional (Registered Company)</em>. You'll be asked for your name, contact details, location, skills, years of experience, service rate, and a profile photo. Professionals with complete profiles are prioritised in client searches.</p>
                                </FAQItem>

                                <FAQItem question="How do I appear in client searches?">
                                    <p>To be visible in client search results you need to:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Complete your profile (name, location, services, rate)</li>
                                        <li>Have an active (non-Free) subscription</li>
                                        <li>Be verified — adds a trust badge and boosts your ranking</li>
                                    </ul>
                                    <p className="mt-2">Professionals with higher-tier subscriptions appear higher in search results.</p>
                                </FAQItem>

                                <FAQItem question="How do I apply for posted jobs?">
                                    <p>Go to the <strong>Available Jobs</strong> tab on your dashboard. You'll see jobs posted by clients in your area (requires an active paid subscription). Click <strong>Apply</strong> on any job matching your skills. The client will be notified and can view your profile and contact you to discuss details.</p>
                                </FAQItem>

                                <FAQItem question="What is the difference between subscription tiers?">
                                    <p>Each tier unlocks more capabilities:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li><strong>Free</strong> — Profile visible but no new client bookings or job applications</li>
                                        <li><strong>Basic / Standard</strong> — A limited number of new clients per month</li>
                                        <li><strong>Pro / Premium / Elite</strong> — Higher or unlimited clients, priority search placement, access to all posted jobs, and more</li>
                                    </ul>
                                    <p className="mt-2">Visit the <strong>Subscription</strong> page for full feature comparison and pricing.</p>
                                </FAQItem>

                                <FAQItem question="How do I get verified?">
                                    <p>Go to the <strong>Verification</strong> tab on your dashboard and upload a valid government-issued ID (National ID, Driver's Licence, International Passport, or Voter's Card). If you are a registered company, also upload your CAC certificate. Verification is reviewed by the Skills Konnect team. Once approved, a <strong>✓ Verified</strong> badge appears on your profile, increasing client trust and search ranking.</p>
                                </FAQItem>

                                <FAQItem question="How do I set my service rate?">
                                    <p>In your profile, set a <strong>Daily Rate</strong> or mark your price as <em>Negotiable</em> depending on your country. Professionals in Europe and Western regions can also set an hourly rate. You can update your rate any time from the <strong>My Profile</strong> tab.</p>
                                </FAQItem>

                                <FAQItem question="How do I get paid for jobs?">
                                    <p>Payment arrangements for completed jobs are made directly between you and the client — via cash, bank transfer, or any method you both agree on. For your Skills Konnect subscription payments, those are processed securely via Paystack or Flutterwave.</p>
                                </FAQItem>
                            </>
                        )}

                        {/* ── ACCOUNT & PROFILE ── */}
                        {(activeSection === 'all' || activeSection === 'account') && (
                            <>
                                <SectionHeader icon="⚙️" title="Account & Profile" />

                                <FAQItem question="How do I edit my profile?">
                                    <p>Go to the <strong>My Profile</strong> tab on your dashboard and click <strong>Edit Profile</strong>. Update your name, contact info, location, services, rate, or profile picture, then click <strong>Save</strong>.</p>
                                </FAQItem>

                                <FAQItem question="How do I change my password or email?">
                                    <p>Password changes are handled via the <strong>Forgot Password</strong> link on the login page. Enter your registered email and you'll receive a reset link. For email address changes, contact support at <a href="mailto:skillskonnectng@gmail.com" className="text-primary hover:underline">skillskonnectng@gmail.com</a>.</p>
                                </FAQItem>

                                <FAQItem question="When will my profile become visible to others?">
                                    <p>For <strong>professionals</strong>, your profile becomes visible in client search results once you have (1) completed your profile and (2) an active paid subscription. For <strong>clients</strong>, your profile is needed internally to post jobs and make bookings, but clients are not displayed publicly.</p>
                                </FAQItem>

                                <FAQItem question="Can I use this app on my phone?">
                                    <p>Yes! Skills Konnect is fully responsive and works on smartphones, tablets, and desktops. No app download is required — simply open the website in any modern browser (Chrome, Safari, Firefox) on your device.</p>
                                </FAQItem>

                                <FAQItem question="How do I delete my account?">
                                    <p>To delete your account, go to your <strong>Dashboard</strong> and click the <strong>⚙️ Settings</strong> tab. Read the information about what deletion means for your account, then click <strong>Delete My Account</strong>. A confirmation popup will appear — click <strong>Yes, Delete My Account</strong> to confirm.</p>
                                    <p className="mt-2">Once confirmed, you will be logged out immediately and your account will be deactivated. Your data is held securely for up to <strong>30 days</strong> while our admin team reviews the request, after which it is permanently deleted. If you change your mind within that window, contact our support team as soon as possible.</p>
                                    <div className="mt-4">
                                        <button
                                            onClick={() => onNavigate('deleteAccount')}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                            🗑️ Delete My Account
                                        </button>
                                        <p className="text-xs text-gray-500 mt-2">You can also delete your account without logging in by using the form above.</p>
                                    </div>
                                </FAQItem>
                            </>
                        )}

                        {/* ── PAYMENTS & SUBSCRIPTIONS ── */}
                        {(activeSection === 'all' || activeSection === 'payments') && (
                            <>
                                <SectionHeader icon="💳" title="Payments & Subscriptions" />

                                <FAQItem question="How do I subscribe or upgrade my plan?">
                                    <p>Click <strong>Subscription</strong> in the main navigation, or click the <strong>Upgrade</strong> button in your dashboard header. Browse available plans, choose one, and proceed to secure payment. Plans and pricing differ by region (Nigeria plans in ₦, international plans in USD).</p>
                                </FAQItem>

                                <FAQItem question="What payment methods are accepted?">
                                    <p>We use <strong>Paystack</strong> for Nigeria-based users (debit/credit cards, bank transfers, USSD) and <strong>Flutterwave</strong> for international users. All transactions are processed securely — we never store your card details.</p>
                                </FAQItem>

                                <FAQItem question="How long does my subscription last?">
                                    <p>Subscriptions are valid for <strong>30 days</strong> from the date of payment. You will be notified in your dashboard's <strong>Notifications</strong> tab as the expiry date approaches. You can renew at any time from the Subscription page.</p>
                                </FAQItem>

                                <FAQItem question="What happens when my subscription expires?">
                                    <p>When your subscription expires, your account reverts to the <strong>Free Plan</strong>. You'll remain searchable but new client bookings cannot be accepted and you can no longer apply to posted jobs until you renew. Your profile data and booking history are never deleted.</p>
                                </FAQItem>

                                <FAQItem question="Can I get a refund?">
                                    <p>Subscription fees are non-refundable once payment is processed and your account has been upgraded. If you believe there was an error or a duplicate charge, contact us at <a href="mailto:skillskonnectng@gmail.com" className="text-primary hover:underline">skillskonnectng@gmail.com</a> within 7 days and we will investigate promptly.</p>
                                </FAQItem>
                            </>
                        )}

                    </div>

                    {/* Still need help */}
                    <div className="mt-14 text-center bg-gray-50 rounded-xl p-8 border border-gray-100">
                        <h3 className="text-xl font-bold text-dark mb-2">Still need help?</h3>
                        <p className="text-gray-600 mb-4">Can't find the answer you're looking for? Our support team is happy to assist.</p>
                        <button
                            onClick={() => onNavigate('contact')}
                            className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-lg hover:bg-secondary transition-colors"
                        >
                            📧 Contact Support
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
