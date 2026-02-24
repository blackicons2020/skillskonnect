

export interface Review {
  reviewerName: string;
  rating: number; // This will be the average
  timeliness?: number;
  thoroughness?: number;
  conduct?: number;
  comment: string;
}

export interface Cleaner {
  id: string;
  name: string;
  photoUrl: string;
  rating: number;
  reviews: number;
  serviceTypes: string[];
  country?: string;
  state: string;
  city: string;
  otherCity?: string;
  experience: number;
  bio: string;
  isVerified: boolean;
  chargeHourly?: number;
  chargeDaily?: number;
  chargePerContract?: number;
  chargePerContractNegotiable?: boolean;
  subscriptionTier: 'Free' | 'Standard' | 'Pro' | 'Premium';
  accountNumber?: string;
  bankName?: string;
  phoneNumber?: string;
  cleanerType?: 'Individual' | 'Company';
  reviewsData?: Review[];
}

export type UserRole = 'client' | 'cleaner';

// New: Specific Admin Roles
export type AdminRole = 'Super' | 'Support' | 'Verification' | 'Payment';

export interface Receipt {
  name: string;
  dataUrl: string;
}

export interface Booking {
  id: string;
  service: string;
  date: string;
  amount: number; // This is the cleaner's charge
  totalAmount?: number; // This is amount + escrow fee
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  clientName: string;
  cleanerName: string;
  clientId: string;
  cleanerId: string; // FIX: Changed from number to string to match UUID
  reviewSubmitted?: boolean;
  paymentMethod: 'Escrow' | 'Direct';
  paymentStatus: 'Pending Payment' | 'Pending Admin Confirmation' | 'Confirmed' | 'Pending Payout' | 'Paid' | 'Not Applicable';
  paymentReceipt?: Receipt; 
  jobApprovedByClient?: boolean;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  service: string;
  location: string;
  state?: string;
  city?: string;
  budget: number;
  budgetType: 'Hourly' | 'Daily' | 'Monthly' | 'Fixed';
  startDate: string;
  endDate?: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  clientId: string;
  clientName: string;
  postedDate: string;
  applicants?: string[]; // Array of worker IDs who applied
  selectedWorkerId?: string; // Worker assigned to the job
  requirements?: string[];
  visibility: 'Public' | 'Subscribers Only';
}

export type TicketCategory = 'Technical Issue' | 'Payment Issue' | 'Booking Dispute' | 'Account Verification' | 'Other';

export interface SupportTicket {
    id: string;
    userId: string;
    userName?: string; // Populated for admin view
    userRole?: string; // Populated for admin view
    category: TicketCategory;
    subject: string;
    message: string;
    status: 'Open' | 'Resolved';
    adminResponse?: string;
    createdAt: string;
    updatedAt?: string;
}

// User Type - determines which fields are required
export type UserType = 
  | 'Client (Individual)' 
  | 'Client (Registered Company)' 
  | 'Worker (Individual)' 
  | 'Worker (Registered Company)';

export type ChargeRateType = 'Per Hour' | 'Per Day' | 'Contract' | 'Negotiable';

export interface VerificationDocuments {
  governmentId?: string; // For individual clients
  companyRegistrationCert?: string; // For companies
  skillTrainingCert?: string; // For workers
}

export interface User {
  id: string;
  email: string;
  password?: string;
  
  // User Type Selection (REQUIRED)
  userType?: UserType;
  
  // Common fields for Individual Clients & Workers
  fullName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  
  // Contact Information (All user types)
  phoneCountryCode?: string; // e.g., "+234"
  phoneNumber?: string;
  
  // Location (All user types)
  country?: string;
  state?: string; // Province/Region
  city?: string;
  otherCity?: string; // For when city is 'Other'
  streetAddress?: string; // For individuals
  address?: string; // Legacy field for address
  officeAddress?: string; // For companies
  companyAddress?: string; // Legacy field for company address
  workplaceAddress?: string; // Optional for Client (Individual)
  
  // Company-specific fields
  companyName?: string;
  companyRegistrationNumber?: string;
  
  // User type indicators
  clientType?: 'Individual' | 'Company';
  cleanerType?: 'Individual' | 'Company';
  
  // Worker-specific fields
  skillType?: string[]; // Multiple skills allowed
  yearsOfExperience?: number;
  chargeHourly?: number; // Hourly rate
  chargeDaily?: number; // Daily rate
  chargePerContract?: number; // Contract rate
  chargePerContractNegotiable?: boolean; // If contract rate is negotiable
  chargeRate?: number; // Legacy contract rate
  chargeRateType?: ChargeRateType;
  profilePicture?: string; // URL or base64
  profilePhoto?: string | File; // Legacy field for profile picture
  
  // Verification
  isVerified?: boolean;
  verificationDocuments?: VerificationDocuments;
  
  // Legacy fields for backward compatibility
  role: UserRole;
  bookingHistory?: Booking[];
  postedJobs?: Job[]; // Jobs posted by client
  appliedJobs?: string[]; // Job IDs worker has applied to
  isAdmin?: boolean;
  adminRole?: AdminRole;
  isSuspended?: boolean;
  
  // Cleaner/Worker legacy fields
  experience?: number;
  services?: string[];
  bio?: string;
  professionalExperience?: string; // Detailed professional experience description
  accountNumber?: string;
  bankName?: string;
  subscriptionTier?: string; // Changed to support new plan names like Basic, Pro, Elite, Regular, Silver, etc.
  pendingSubscription?: string;
  subscriptionReceipt?: Receipt;
  subscriptionEndDate?: string;
  trialStartDate?: string; // For tracking trial periods
  trialEndDate?: string;
  reviewsData?: Review[];
  monthlyNewClientsIds?: string[];
  monthlyUsageResetDate?: string;
  monthlyJobPostsCount?: number; // For tracking client job posting limits
}

export interface SubscriptionPlan {
    name: string; // Supports Free, Basic, Pro, Elite, Regular, Silver, Gold, Diamond
    priceMonthly: number;
    priceYearly: number;
    currency?: string; // 'NGN', 'USD', etc. (defaults to NGN if not specified)
    features: string[];
    isRecommended?: boolean;
    maxClients?: number; // For worker plans
    hasJobAccess?: boolean; // For worker plans - access to job listings
    maxJobPosts?: number; // For client plans
    trialDays?: number; // For free plans with trial periods
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  participants: string[]; // User IDs
  participantNames: Record<string, string>; // Map UserID -> Name
  lastMessage?: Message;
  updatedAt: string;
}

export type View = 
  | 'landing' 
  | 'auth'
  | 'signup' 
  | 'setupProfile'
  | 'clientDashboard' 
  | 'cleanerDashboard' 
  | 'cleanerProfile'
  | 'adminDashboard'
  | 'subscription'
  | 'profile'
  | 'about'
  | 'servicesPage'
  | 'help'
  | 'contact'
  | 'terms'
  | 'privacy'
  | 'searchResults';
