
// ... (imports)
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { SubscriptionPaymentDetailsModal } from './components/SubscriptionPaymentDetailsModal';
import { StarIcon, ChatBubbleLeftRightIcon } from './components/icons';
import { ErrorBoundary } from './components/ErrorBoundary';

import { User, Cleaner, View, SubscriptionPlan, Review, Job, Booking } from './types';
import { apiService, getStoredToken, storeToken, clearToken } from './services/apiService';
import { paymentService } from './services/paymentService';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

// Lazy Load Pages to optimize initial bundle size
const LandingPage = React.lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const Auth = React.lazy(() => import('./components/Auth').then(module => ({ default: module.Auth })));
const ResetPasswordPage = React.lazy(() => import('./components/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const SetupProfile = React.lazy(() => import('./components/SetupProfile').then(module => ({ default: module.SetupProfile })));
const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const SubscriptionPage = React.lazy(() => import('./components/SubscriptionPage').then(module => ({ default: module.SubscriptionPage })));
const ClientDashboard = React.lazy(() => import('./components/ClientDashboard').then(module => ({ default: module.ClientDashboard })));
const AboutPage = React.lazy(() => import('./components/AboutPage').then(module => ({ default: module.AboutPage })));
const ServicesPage = React.lazy(() => import('./components/ServicesPage').then(module => ({ default: module.ServicesPage })));
const HelpCenterPage = React.lazy(() => import('./components/HelpCenterPage').then(module => ({ default: module.HelpCenterPage })));
const ContactPage = React.lazy(() => import('./components/ContactPage').then(module => ({ default: module.ContactPage })));
const TermsPage = React.lazy(() => import('./components/TermsPage').then(module => ({ default: module.TermsPage })));
const PrivacyPage = React.lazy(() => import('./components/PrivacyPage').then(module => ({ default: module.PrivacyPage })));
const SearchResultsPage = React.lazy(() => import('./components/SearchResultsPage').then(module => ({ default: module.SearchResultsPage })));


interface CleanerProfileProps {
    cleaner: Cleaner;
    onNavigate: (v: View) => void;
    onBook: (cleaner: Cleaner) => void;
}

const CleanerProfile: React.FC<CleanerProfileProps> = ({ cleaner, onBook }) => {
    return (
        <div className="p-8 container mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <img src={cleaner.photoUrl} alt={cleaner.name} className="w-32 h-32 rounded-full mx-auto object-cover mb-4 ring-4 ring-primary/20" />
                <h2 className="text-3xl font-bold text-center">{cleaner.name}</h2>
                <div className="flex items-center justify-center mt-2 space-x-2 text-gray-700">
                    <StarIcon className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold text-lg">{cleaner.rating.toFixed(1)}</span>
                    <span className="text-gray-500">({cleaner.reviews} reviews)</span>
                </div>
                <p className="mt-4 max-w-2xl mx-auto text-center">{cleaner.bio}</p>
                <div className="flex justify-center mt-8 gap-4">
                    <button
                        onClick={() => onBook(cleaner)}
                        className="w-full max-w-xs bg-primary text-white p-3 rounded-lg font-bold hover:bg-secondary"
                    >
                        Book this Cleaner
                    </button>
                </div>
            </div>
        </div>
    )
};

interface SearchFilters {
    service: string;
    location: string;
    minPrice: string;
    maxPrice: string;
    minRating: string;
}

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
    </div>
);

const App: React.FC = () => {
    const [view, setView] = useState<View>('landing');
    const [viewHistory, setViewHistory] = useState<View[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allCleaners, setAllCleaners] = useState<Cleaner[]>([]);
    const [allJobs, setAllJobs] = useState<Job[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);

    const [initialAuthTab, setInitialAuthTab] = useState<'login' | 'signup'>('login');
    const [initialFilters, setInitialFilters] = useState<SearchFilters | null>(null);
    const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [appError, setAppError] = useState<string | null>(null);
    const [adminDataError, setAdminDataError] = useState<string | null>(null);

    // Reset-password token extracted from the URL on first load
    const [resetToken, setResetToken] = useState<string | null>(null);

    // Modal states
    const [cleanerToBook, setCleanerToBook] = useState<Cleaner | null>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isSubPaymentModalOpen, setIsSubPaymentModalOpen] = useState(false);
    const [planToUpgrade, setPlanToUpgrade] = useState<SubscriptionPlan | null>(null);

    // State to remember booking intention for logged-out users
    const [cleanerToRememberForBooking, setCleanerToRememberForBooking] = useState<Cleaner | null>(null);

    // State to pass initial active tab to dashboards
    const [dashboardInitialTab, setDashboardInitialTab] = useState<'find' | 'bookings' | 'messages' | 'profile' | 'jobs' | 'reviews'>('find');

    // Ref that is set to true while a fresh login/signup is in progress.
    // checkSession reads this to abort early so it never overwrites a concurrent login.
    const loginInProgressRef = useRef(false);

    // Fetch all available jobs from the API

    // Refetches all app data. Used after state-changing actions.
    const refetchAllData = async (currentUser: User) => {
        setIsDataLoading(true);
        setAdminDataError(null);
        try {
            const [cleaners, users, jobs, bookingsResult] = await Promise.allSettled([
                apiService.getAllCleaners(),
                currentUser.isAdmin ? apiService.adminGetAllUsers() : Promise.resolve([]),
                apiService.getAllJobs(),
                apiService.getBookings()
            ]);
            if (cleaners.status === 'fulfilled') setAllCleaners(cleaners.value);
            else console.error('Failed to fetch cleaners:', (cleaners as any).reason);
            if (users.status === 'fulfilled') { setAllUsers(users.value); setAdminDataError(null); }
            else if (currentUser.isAdmin) {
                const errMsg = (users as PromiseRejectedResult).reason?.message || 'Failed to load users. Please retry.';
                console.error('Failed to fetch users:', errMsg);
                setAdminDataError(errMsg);
            }
            if (jobs.status === 'fulfilled') setAllJobs(jobs.value);
            else console.error('Failed to fetch jobs:', (jobs as any).reason);
            if (bookingsResult.status === 'fulfilled') {
                setAllBookings(bookingsResult.value);
            } else {
                console.error('Failed to fetch bookings:', (bookingsResult as any).reason);
            }
        } finally {
            setIsDataLoading(false);
        }
    };

    // Refetch jobs only (used after job posting)
    const refetchJobs = async () => {
        try {
            const jobs = await apiService.getAllJobs();
            setAllJobs(jobs);
        } catch (error: any) {
            console.error("Failed to refresh jobs:", error);
        }
    };

    // Refetch bookings (used after booking, cancel, review, etc.)
    const refetchBookings = async () => {
        try {
            const bookings = await apiService.getBookings();
            setAllBookings(bookings);
        } catch (error: any) {
            console.error("Failed to refresh bookings:", error);
        }
    };


    // On initial app load, check for an existing session token
    useEffect(() => {
        // ── Capacitor native setup ──────────────────────────────────────────
        const isNative = typeof (window as any).Capacitor !== 'undefined';
        if (isNative) {
            // Light status bar text on the green brand colour
            StatusBar.setStyle({ style: Style.Light }).catch(() => {});
            StatusBar.setBackgroundColor({ color: '#007A5E' }).catch(() => {});

            // Hide the splash screen once React has mounted
            SplashScreen.hide().catch(() => {});

            // Android hardware back-button: navigate back through view history
            const backHandler = CapacitorApp.addListener('backButton', () => {
                setViewHistory(prev => {
                    if (prev.length > 0) {
                        const newHistory = [...prev];
                        const previousView = newHistory.pop()!;
                        setView(previousView);
                        return newHistory;
                    }
                    // No history left — exit the app
                    CapacitorApp.exitApp();
                    return prev;
                });
            });

            return () => {
                backHandler.then(h => h.remove()).catch(() => {});
            };
        }
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            setIsLoading(true);
            setAppError(null);

            // Detect direct /privacy URL
            if (window.location.pathname === '/privacy') {
                setView('privacy');
                setIsLoading(false);
                return;
            }

            // Detect password-reset link: ?action=resetPassword&token=<raw>
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            const urlToken = urlParams.get('token');
            if (action === 'resetPassword' && urlToken) {
                setResetToken(urlToken);
                setView('resetPassword');
                // Remove the token from the URL bar without reloading
                window.history.replaceState({}, document.title, '/');
                setIsLoading(false);
                return;
            }

            // Detect Paystack/Flutterwave payment callback
            const isPaymentCallback = window.location.pathname === '/payment/verify';
            const paymentReference = urlParams.get('reference') || urlParams.get('trxref');
            const flwTransactionId = urlParams.get('transaction_id');
            const flwTxRef = urlParams.get('tx_ref');
            const flwStatus = urlParams.get('status');

            if (isPaymentCallback && (paymentReference || flwTransactionId)) {
                // Clean the URL immediately
                window.history.replaceState({}, document.title, '/');

                // Read the stored pending payment info
                const pendingPaymentRaw = localStorage.getItem('pending_subscription_payment');
                localStorage.removeItem('pending_subscription_payment');

                const tokenAtStart = getStoredToken();
                if (tokenAtStart) {
                    try {
                        let verified = false;

                        if (flwTransactionId) {
                            // Flutterwave callback
                            verified = flwStatus === 'successful'
                                ? await paymentService.verifyFlutterwavePayment(flwTransactionId, flwTxRef || undefined)
                                : false;
                        } else if (paymentReference) {
                            // Paystack callback
                            verified = await paymentService.verifyPaystackPayment(paymentReference);
                        }

                        if (verified) {
                            // Refresh user data to get the updated subscription
                            const updatedUser = await apiService.getMe();
                            const bookings = await apiService.getBookings().catch(() => []);
                            setAllBookings(bookings);
                            await handleAuthSuccess(updatedUser, true, false);
                            alert(`✓ Payment successful! Your subscription to the ${updatedUser.subscriptionTier || 'selected'} plan is now active.`);
                        } else {
                            // Payment verification failed
                            const meResult = await apiService.getMe();
                            const bookings = await apiService.getBookings().catch(() => []);
                            setAllBookings(bookings);
                            await handleAuthSuccess(meResult, true, false);
                            alert('Payment could not be verified. If you were charged, please contact support.');
                        }
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        // Still try to restore the session
                        try {
                            const meResult = await apiService.getMe();
                            await handleAuthSuccess(meResult, true, false);
                        } catch (e) {
                            handleLogout();
                        }
                        alert('Payment verification encountered an error. Please contact support if you were charged.');
                    }
                } else {
                    // No token — user was somehow logged out during payment
                    setView('auth');
                    setAuthMessage({ type: 'error', text: 'Your session expired during payment. Please log in to check your subscription status.' });
                }
                setIsLoading(false);
                return;
            }

            const tokenAtStart = getStoredToken();

            if (tokenAtStart) {
                // Fetch user identity + public data in ONE parallel batch (single cold-start wait)
                const [meResolved, cleaners, jobs, bookingsResult] = await Promise.allSettled([
                    apiService.getMe(),
                    apiService.getAllCleaners(),
                    apiService.getAllJobs(),
                    apiService.getBookings(),
                ]);

                if (cleaners.status === 'fulfilled') setAllCleaners(cleaners.value);
                if (jobs.status === 'fulfilled') setAllJobs(jobs.value as any);

                // Guard 1: abort if a fresh login started while we were fetching
                if (loginInProgressRef.current) {
                    setIsLoading(false);
                    return;
                }

                // Guard 2: abort if the token changed while we were fetching
                const currentToken = getStoredToken();
                if (currentToken !== tokenAtStart) {
                    setIsLoading(false);
                    return;
                }

                if (meResolved.status === 'fulfilled') {
                    const currentUser = meResolved.value;
                    if (bookingsResult.status === 'fulfilled') {
                        setAllBookings(bookingsResult.value as any);
                    }

                    // If admin, fetch admin users in background (don't block navigation)
                    if (currentUser.isAdmin) {
                        apiService.adminGetAllUsers().then(users => {
                            setAllUsers(users);
                            setAdminDataError(null);
                        }).catch(err => {
                            setAdminDataError(err?.message || 'Failed to load users.');
                        });
                    }

                    // shouldNavigate=true: restore the user to their correct dashboard
                    // skipRefetch=true: we already fetched data above
                    await handleAuthSuccess(currentUser, true, true);
                } else {
                    const reason = (meResolved as any).reason;
                    const errorMsg: string = reason?.message || '';
                    // Only clear the token if it's definitively invalid (401). For network/server
                    // errors (cold start, timeout, etc.) keep the token and show landing page.
                    if (errorMsg.includes('401') || errorMsg.toLowerCase().includes('unauthorized') || errorMsg.toLowerCase().includes('invalid token')) {
                        console.error('Token invalid/expired — logging out.', errorMsg);
                        handleLogout();
                    } else {
                        console.error('Session check failed (server/network error) — keeping token.', errorMsg);
                        setIsLoading(false);
                    }
                }
            } else {
                // Not logged in — only load public data
                const [cleaners, jobs] = await Promise.allSettled([
                    apiService.getAllCleaners(),
                    apiService.getAllJobs(),
                ]);
                if (cleaners.status === 'fulfilled') {
                    setAllCleaners(cleaners.value);
                } else {
                    const errMsg = (cleaners as any).reason?.message || 'Unable to load professionals. Please check your internet connection and try again.';
                    console.error('[Mobile] Failed to fetch cleaners:', errMsg);
                    setAppError(errMsg);
                }
                if (jobs.status === 'fulfilled') setAllJobs(jobs.value as any);
            }

            setIsLoading(false);
        };
        checkSession();
    }, []);

    const handleNavigate = (targetView: View) => {
        setViewHistory(prev => [...prev, view]); // push current view onto history stack
        setView(targetView);
        window.scrollTo(0, 0);
        // Sync URL for the Privacy Policy page
        if (targetView === 'privacy') {
            window.history.pushState({}, document.title, '/privacy');
        } else if (view === 'privacy') {
            window.history.replaceState({}, document.title, '/');
        }
        // Reset dashboard tab to default when navigating normally
        if (targetView === 'clientDashboard') setDashboardInitialTab('find');
        if (targetView === 'cleanerDashboard') setDashboardInitialTab('' as any); // Let Dashboard choose based on profile completeness
    };

    const handleGoBack = () => {
        if (viewHistory.length === 0) return;
        const previousView = viewHistory[viewHistory.length - 1];
        setViewHistory(prev => prev.slice(0, -1));
        setView(previousView);
        // Restore base URL when leaving the Privacy page
        if (view === 'privacy') {
            window.history.replaceState({}, document.title, '/');
        }
        window.scrollTo(0, 0);
    };

    const handleNavigateToAuth = (tab: 'login' | 'signup') => {
        setInitialAuthTab(tab);
        setView('auth');
    };

    const handleLoginAttempt = async (email: string, password?: string, rememberMe?: boolean) => {
        setAuthMessage(null);
        setUser(null); // Clear any previous user immediately
        loginInProgressRef.current = true; // Signal checkSession to abort
        try {
            console.log('Login attempt for:', email);
            const { token, user: loggedInUser } = await apiService.login(email, password);
            console.log('Login successful, token received');
            storeToken(token, rememberMe ?? false);
            await handleAuthSuccess(loggedInUser);
        } catch (error: any) {
            console.error('Login error:', error);
            setAuthMessage({ type: 'error', text: error.message || 'Login failed. Please try again.' });
        } finally {
            loginInProgressRef.current = false;
        }
    };

    const handleSocialAuth = async (provider: 'google' | 'apple', email?: string, name?: string, flow?: 'login' | 'signup') => {
        setAuthMessage(null);

        if (flow === 'signup') {
            setSignupEmail(email || '');
            setSignupName(name || '');
            // For social signup, we skip password or generate a placeholder internally if needed by backend,
            // but here we just proceed to the form to collect other details.
            // We set a dummy password to satisfy the current flow which expects it for manual signup.
            setSignupPassword('SocialAuth123!');
            setView('signup');
            return;
        }

        try {
            const { token, user: loggedInUser } = await apiService.socialLogin(provider, email, name);
            storeToken(token, true); // Social logins are persistent by default
            loginInProgressRef.current = true;
            await handleAuthSuccess(loggedInUser);
        } catch (error: any) {
            setAuthMessage({ type: 'error', text: error.message || 'Social login failed.' });
        } finally {
            loginInProgressRef.current = false;
        }
    };

    const handleAuthSuccess = async (userData: User, shouldNavigate = true, skipRefetch = false) => {
        setUser(userData);

        // Navigate IMMEDIATELY so the auth modal disappears right away
        if (shouldNavigate) {
            if (cleanerToRememberForBooking) {
                if (userData.userType === 'client' || userData.role === 'client') {
                    handleNavigate('clientDashboard');
                    setTimeout(() => {
                        setCleanerToBook(cleanerToRememberForBooking);
                        setIsBookingModalOpen(true);
                        setCleanerToRememberForBooking(null);
                    }, 100);
                } else {
                    setCleanerToRememberForBooking(null);
                    handleNavigate('cleanerDashboard');
                }
            } else if (userData.isAdmin || (userData as any).role === 'admin' || (userData as any).adminRole) {
                handleNavigate('adminDashboard');
            } else if ((userData as any).userType === 'worker' || userData.role === 'cleaner') {
                handleNavigate('cleanerDashboard');
            } else {
                handleNavigate('clientDashboard');
            }
        }

        // Refetch data in the background AFTER navigation
        if (skipRefetch) {
            if (userData.isAdmin) {
                setIsDataLoading(true);
                setAdminDataError(null);
                apiService.adminGetAllUsers()
                    .then(users => { setAllUsers(users); setAdminDataError(null); })
                    .catch(e => {
                        console.error('Failed to fetch all users:', e);
                        setAdminDataError(e.message || 'Failed to load users. Please retry.');
                    })
                    .finally(() => setIsDataLoading(false));
            }
        } else {
            // Fire and forget — don't block navigation
            refetchAllData(userData).catch(e => console.error('Background refetch failed:', e));
        }
    };

    const handleDirectSignup = async (email: string, password: string, userType: 'client' | 'worker' = 'client') => {
        setAuthMessage(null);
        loginInProgressRef.current = true;
        try {
            // Register with minimal data - email, password, userType, and role (backend expects 'role')
            const role = userType === 'worker' ? 'cleaner' : 'client';
            const response: any = await apiService.register({
                email,
                password,
                userType,
                role
            } as any);

            if (response.token && response.user) {
                storeToken(response.token, false); // New registrations: session only until next explicit login
                setUser(response.user);

                // Navigate immediately, refetch in background
                if (response.user.role === 'admin') {
                    handleNavigate('adminDashboard');
                } else if (response.user.userType === 'worker' || userType === 'worker') {
                    handleNavigate('cleanerDashboard');
                } else {
                    handleNavigate('clientDashboard');
                }

                refetchAllData(response.user).catch(e => console.error('Background refetch failed:', e));
            } else {
                // Response received but unexpected format
                setAuthMessage({ type: 'error', text: 'Signup succeeded but an unexpected response was received. Please try logging in.' });
            }
        } catch (err: any) {
            setAuthMessage({ type: 'error', text: err.message || 'Signup failed. Please try again.' });
            console.error('Signup error:', err);
        } finally {
            loginInProgressRef.current = false;
        }
    };


    const handleLogout = () => {
        apiService.logout();
        setUser(null);
        setAllUsers([]);
        clearToken();
        setViewHistory([]);
        setCleanerToRememberForBooking(null);
        setView('landing');
        window.scrollTo(0, 0);
    };

    const handleSelectCleaner = (cleaner: Cleaner) => {
        setSelectedCleaner(cleaner);
        handleNavigate('cleanerProfile');
    };

    const handleSearchFromHero = (filters: SearchFilters) => {
        setInitialFilters(filters);
        if (user) {
            // Only clients can search for workers
            if (user.userType === 'client' || user.role === 'client') {
                handleNavigate('clientDashboard');
            } else {
                // Workers shouldn't be searching for workers - redirect to their dashboard
                handleNavigate('cleanerDashboard');
            }
        } else {
            // Unregistered or Logged out -> Search Results
            handleNavigate('searchResults');
        }
    };

    const handleUpdateUser = async (updatedData: User) => {
        try {
            // Check if this is an admin updating another user (not themselves)
            const isAdminUpdatingOtherUser = user && user.isAdmin && updatedData.id !== user.id;

            // Use the correct endpoint: admin-specific route for updating other users,
            // own-profile route for updating oneself
            const updatedUser = isAdminUpdatingOtherUser
                ? await apiService.adminUpdateUser(updatedData.id, updatedData)
                : await apiService.updateUser(updatedData);

            // Only update the current user's state if they're updating themselves
            if (!isAdminUpdatingOtherUser) {
                setUser(updatedUser);
            }

            // Check if postedJobs changed (client posting/updating jobs)
            const jobsChanged = user && user.postedJobs?.length !== updatedUser.postedJobs?.length;

            // Check if verification status changed
            const isVerificationUpdate = user && updatedData.isVerified !== undefined &&
                user.isVerified !== updatedData.isVerified;

            if (updatedUser.isAdmin || isAdminUpdatingOtherUser) {
                await refetchAllData(user || updatedUser);
            } else {
                // Refresh cleaners list so landing page cards update immediately
                const refreshPromises: Promise<any>[] = [];
                if (updatedUser.role === 'cleaner' || (updatedUser as any).userType === 'worker') {
                    refreshPromises.push(
                        apiService.getAllCleaners()
                            .then(cleaners => setAllCleaners(cleaners))
                            .catch(e => console.error('Failed to refresh cleaners:', e))
                    );
                }
                // Refetch jobs so workers can see the new/updated jobs
                if (jobsChanged && (updatedUser.role === 'client' || (updatedUser as any).userType === 'client')) {
                    refreshPromises.push(
                        apiService.getAllJobs()
                            .then(jobs => setAllJobs(jobs))
                            .catch(e => console.error('Failed to refresh jobs:', e))
                    );
                }
                // Wait for all refreshes to complete before showing success alert
                if (refreshPromises.length > 0) {
                    await Promise.all(refreshPromises);
                }
            }

            // Check if this was a subscription update for the current user
            const isSubscriptionUpdate = !isAdminUpdatingOtherUser && user &&
                user.subscriptionTier !== updatedUser.subscriptionTier;

            // Show appropriate success message
            if (isAdminUpdatingOtherUser && isVerificationUpdate) {
                alert(updatedData.isVerified
                    ? "✓ Verification approved successfully!"
                    : "Verification rejected.");
            } else if (isSubscriptionUpdate) {
                alert(`✓ Subscription upgraded to ${updatedUser.subscriptionTier} plan!\n\nYou now have access to all ${updatedUser.subscriptionTier} features.`);
            } else if (jobsChanged) {
                // Don't show alert, the job posting form already shows success
            } else if (!isAdminUpdatingOtherUser) {
                alert("Profile updated successfully!");
            } else {
                alert("User updated successfully!");
            }
        } catch (error: any) {
            alert(`Failed to update profile: ${error.message}`);
        }
    };

    const handleConfirmBooking = async (cleaner: Cleaner) => {
        if (!user) return;
        try {
            const baseAmount = cleaner.chargeHourly || cleaner.chargeDaily || cleaner.chargePerContract || 5000;
            const bookingData = {
                cleanerId: cleaner.id,
                service: cleaner.serviceTypes[0] || 'General Cleaning',
                date: new Date().toISOString().split('T')[0],
                amount: baseAmount,
                paymentMethod: 'Direct',
            };
            const newBooking = await apiService.createBooking(bookingData);

            // Refresh allBookings so both dashboards see the new booking
            await refetchBookings();

            handleCloseBookingModals();
            alert('Booking created successfully!');
            handleNavigate('clientDashboard');
        } catch (error: any) {
            alert(`Booking failed: ${error.message}`);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        try {
            const cancelledBooking = await apiService.cancelBooking(bookingId);

            await refetchBookings();

            alert("Booking cancelled successfully.");
        } catch (e: any) { alert(`Cancellation failed: ${e.message}`); }
    };

    const handleApproveJobCompletion = async (bookingId: string) => {
        try {
            const completedBooking = await apiService.markJobComplete(bookingId);

            await refetchBookings();
        } catch (e: any) { alert(`Failed to mark as complete: ${e.message}`); }
    };

    const handleReviewSubmit = async (bookingId: string, cleanerId: string, reviewData: Omit<Review, 'reviewerName'>) => {
        try {
            await apiService.submitReview(bookingId, { ...reviewData, cleanerId });

            await refetchBookings();

            alert("Review submitted successfully!");
        } catch (e: any) { alert(`Failed to submit review: ${e.message}`); }
    };

    // Admin Actions
    const handleDeleteUser = async (userId: string) => {
        try {
            await apiService.adminDeleteUser(userId);
            setAllUsers(prev => prev.filter(u => u.id !== userId));
            alert("User deleted successfully.");
        } catch (e: any) { alert(`Failed to delete user: ${e.message}`); }
    };

    const handleStartBookingProcess = (cleaner: Cleaner) => {
        if (!user) {
            setCleanerToRememberForBooking(cleaner);
            setAuthMessage({ type: 'success', text: 'To secure your booking, please create a quick account.' });
            // Redirect unregistered/logged-out users directly to the Signup tab
            handleNavigateToAuth('signup');
            return;
        }
        setCleanerToBook(cleaner);
        setIsBookingModalOpen(true);
    };

    const handleMessageCleaner = async (cleaner: Cleaner) => {
        if (!user) {
            setAuthMessage({ type: 'error', text: 'Please sign up or log in to message this cleaner.' });
            handleNavigateToAuth('login');
            return;
        }

        try {
            await apiService.createChat(user.id, cleaner.id, user.fullName, cleaner.name);
            setDashboardInitialTab('messages');
            // Route to appropriate dashboard based on user type
            if (user.userType === 'client' || user.role === 'client') {
                handleNavigate('clientDashboard');
            } else {
                handleNavigate('cleanerDashboard');
            }
        } catch (error) {
            alert('Could not start chat. Please try again.');
        }
    };

    const handleCloseBookingModals = () => {
        setIsBookingModalOpen(false);
        setCleanerToBook(null);
    };

    const handleUpgradeRequest = (plan: SubscriptionPlan) => { setIsSubPaymentModalOpen(true); setPlanToUpgrade(plan); };

    const handleConfirmSubscriptionRequest = async (_plan: SubscriptionPlan) => {
        // Payment is handled directly by the gateway redirect in SubscriptionPaymentDetailsModal.
        // This callback is only reached for the Free plan confirmation.
        setIsSubPaymentModalOpen(false);
        setPlanToUpgrade(null);
    };

    const handleMarkAsPaid = async (bookingId: string) => {
        if (!user) return;
        try {
            await apiService.adminMarkAsPaid(bookingId);
            await refetchAllData(user);
            alert("Booking marked as paid successfully.");
        } catch (e: any) {
            alert(`Failed to mark as paid: ${e.message}`);
        }
    };

    // Views that should show a back link below the header
    const withBack = (label: string, content: React.ReactNode) => (
        viewHistory.length > 0 ? (
            <>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                    <button
                        onClick={handleGoBack}
                        className="text-primary font-semibold hover:underline flex items-center gap-1 text-sm"
                    >
                        <span>&larr;</span> {label}
                    </button>
                </div>
                {content}
            </>
        ) : content
    );

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner />;
        }

        switch (view) {
            case 'auth':
                return withBack('Back', <Auth
                    initialTab={initialAuthTab}
                    onNavigate={handleNavigate}
                    onLoginAttempt={handleLoginAttempt}
                    onSignup={handleDirectSignup}
                    authMessage={authMessage}
                    onAuthMessageDismiss={() => setAuthMessage(null)}
                />);
            case 'clientDashboard':
                // Only clients can access client dashboard
                if (user && ((user as any).userType === 'client' || user.role === 'client')) {
                    return <ClientDashboard
                        user={user}
                        allCleaners={allCleaners}
                        allUsers={allUsers}
                        allJobs={allJobs}
                        allBookings={allBookings}
                        onSelectCleaner={handleSelectCleaner}
                        initialFilters={initialFilters}
                        clearInitialFilters={() => setInitialFilters(null)}
                        onNavigate={handleNavigate}
                        onCancelBooking={handleCancelBooking}
                        onReviewSubmit={handleReviewSubmit}
                        onApproveJobCompletion={handleApproveJobCompletion}
                        onUpdateUser={handleUpdateUser}
                        onRefreshJobs={refetchJobs}
                        appError={appError}
                        initialTab={dashboardInitialTab as any}
                    />;
                }
                handleNavigate('auth');
                return null;
            case 'cleanerDashboard':
                // Only workers can access worker dashboard
                if (user && ((user as any).userType === 'worker' || user.role === 'cleaner')) {
                    return <Dashboard
                        user={user}
                        onUpdateUser={handleUpdateUser}
                        onNavigate={handleNavigate}
                        initialTab={dashboardInitialTab as any}
                        allJobs={allJobs}
                        allBookings={allBookings}
                    />;
                }
                handleNavigate('auth');
                return null;
            case 'adminDashboard':
                if (user && (user.isAdmin || (user as any).role === 'admin' || (user as any).role === 'super-admin')) {
                    return <AdminDashboard
                        user={user}
                        allUsers={allUsers}
                        allJobs={allJobs}
                        isDataLoading={isDataLoading}
                        dataLoadError={adminDataError}
                        onRetryLoadData={() => { if (user) refetchAllData(user); }}
                        onUpdateUser={handleUpdateUser}
                        onDeleteUser={handleDeleteUser}
                        onMarkAsPaid={handleMarkAsPaid}
                    />;
                }
                handleNavigate('auth');
                return null;
            case 'cleanerProfile':
                if (selectedCleaner) {
                    return withBack('Back to Results', <CleanerProfile cleaner={selectedCleaner} onNavigate={handleNavigate} onBook={handleStartBookingProcess} />);
                }
                handleNavigate('landing');
                return null;
            case 'subscription':
                if (user) {
                    return withBack('Back', <SubscriptionPage
                        user={user}
                        onSelectPlan={handleUpgradeRequest}
                    />);
                }
                handleNavigate('landing');
                return null;
            case 'searchResults':
                return withBack('Back', <SearchResultsPage
                    allCleaners={allCleaners}
                    user={user}
                    onSelectCleaner={handleSelectCleaner}
                    initialFilters={initialFilters}
                    clearInitialFilters={() => setInitialFilters(null)}
                    appError={appError}
                />);
            case 'resetPassword':
                return withBack('Back', <ResetPasswordPage
                    token={resetToken || ''}
                    onNavigate={handleNavigate}
                />);
            case 'about': return withBack('Back', <AboutPage />);
            case 'servicesPage': return withBack('Back', <ServicesPage />);
            case 'help': return withBack('Back', <HelpCenterPage onNavigate={handleNavigate} />);
            case 'contact': return withBack('Back', <ContactPage />);
            case 'terms': return withBack('Back', <TermsPage />);
            case 'privacy': return withBack('Back', <PrivacyPage />);
            case 'landing':
            default:
                return <LandingPage
                    cleaners={allCleaners}
                    user={user}
                    onNavigate={handleNavigate}
                    onSelectCleaner={handleSelectCleaner}
                    onSearch={handleSearchFromHero}
                    appError={appError}
                />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans bg-light">
            <ErrorBoundary>
                <Header user={user} onNavigate={handleNavigate} onLogout={handleLogout} onNavigateToAuth={handleNavigateToAuth} />
                <main className="flex-grow">
                    <Suspense fallback={<LoadingSpinner />}>
                        {renderContent()}
                    </Suspense>
                </main>
                <Footer onNavigate={handleNavigate} />

                {isBookingModalOpen && cleanerToBook && user && (
                    <BookingModal
                        cleaner={cleanerToBook}
                        user={user}
                        onClose={handleCloseBookingModals}
                        onConfirmBooking={handleConfirmBooking}
                    />
                )}
                {isSubPaymentModalOpen && planToUpgrade && user && (
                    <SubscriptionPaymentDetailsModal
                        plan={planToUpgrade}
                        user={user}
                        onClose={() => {
                            setIsSubPaymentModalOpen(false);
                            setPlanToUpgrade(null);
                        }}
                        onConfirm={handleConfirmSubscriptionRequest}
                        onUpdateUser={handleUpdateUser}
                    />
                )}
            </ErrorBoundary>
        </div>
    );
};

export default App;
