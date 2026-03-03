
import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { User } from './models/User.js';
import { Booking } from './models/Booking.js';
import { SupportTicket } from './models/SupportTicket.js';
import { Chat, Message } from './models/Chat.js';

// Determine if we are in an ESM environment
const isESM = typeof import.meta !== 'undefined' && import.meta.url;

let __dirname_local = '';
if (isESM) {
    const __filename = fileURLToPath(import.meta.url);
    __dirname_local = path.dirname(__filename);
} else {
    // Fallback for CommonJS environments (ts-node often runs this way by default unless configured otherwise)
    // @ts-ignore
    __dirname_local = typeof __dirname !== 'undefined' ? __dirname : path.resolve();
}

// ============================================================================
// CONFIGURATION
// ============================================================================
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

// Increase payload limit for Base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://johnmeke2017_db_user:T6b1bVhjnkZOfD5S@craftconnect-cluster.96c4f5o.mongodb.net/craftconnect?retryWrites=true&w=majority&appName=CraftConnect-Cluster&tlsAllowInvalidCertificates=true';
mongoose.connect(MONGO_URL)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Review Schema (inline since not in models folder)
const ReviewSchema = new mongoose.Schema({
  bookingId: String,
  cleanerId: { type: String, required: true },
  reviewerName: String,
  rating: Number,
  timeliness: Number,
  thoroughness: Number,
  conduct: Number,
  comment: String,
  createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', ReviewSchema);

// Gemini AI Client
// The API key MUST be obtained from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface AuthRequest extends ExpressRequest {
  user?: {
    id: string;
    role: string;
    isAdmin: boolean;
    adminRole?: string;
  };
  body: any;
  params: any;
  query: any;
}

// ============================================================================
// UTILITIES
// ============================================================================
const generateToken = (id: string, role: string, isAdmin: boolean, adminRole?: string) => {
  return jwt.sign({ id, role, isAdmin, adminRole }, JWT_SECRET, { expiresIn: '30d' });
};

const sendEmail = async (to: string, subject: string, text: string) => {
  // Mock Email Sender
  if (process.env.NODE_ENV !== 'test') {
    console.log(`\n--- [MOCK EMAIL] ---\nTo: ${to}\nSubject: ${subject}\nBody: ${text}\n--------------------\n`);
  }
};

const handleError = (res: ExpressResponse, error: any, message: string = 'Server Error') => {
  console.error(message, error);
  res.status(500).json({ message: error.message || message });
};

// ============================================================================
// MIDDLEWARE
// ============================================================================
const protect: RequestHandler = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as AuthRequest).user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin: RequestHandler = (req, res, next) => {
  const authReq = req as AuthRequest;
  if (authReq.user && authReq.user.isAdmin) next();
  else res.status(403).json({ message: 'Admin access required' });
};

// ============================================================================
// ROUTES: AUTH
// ============================================================================
app.post('/api/auth/register', async (req: ExpressRequest, res: ExpressResponse) => {
  const { email, password, role, fullName, phoneNumber, state, city, otherCity, address, clientType, cleanerType, companyName, companyAddress, experience, services, bio, chargeHourly, chargeDaily, chargePerContract, chargePerContractNegotiable, bankName, accountNumber, profilePhoto, governmentId, businessRegDoc, gender } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Use provided values or defaults for minimal signup
    const userRole = role || 'client';
    const userName = fullName || '';
    const userPhone = phoneNumber || '';
    const userState = state || '';
    const userCity = city || '';
    const userAddress = address || '';
    const userGender = gender || 'Male';

    const user = await User.create({
      email,
      password: hashedPassword,
      role: userRole,
      fullName: userName,
      phoneNumber: userPhone,
      gender: userGender,
      state: userState,
      city: userCity,
      otherCity,
      address: userAddress,
      clientType,
      cleanerType,
      companyName,
      companyAddress,
      experience,
      services: services || [],
      bio,
      chargeHourly,
      chargeDaily,
      chargePerContract,
      chargePerContractNegotiable,
      bankName,
      accountNumber,
      profilePhoto,
      governmentId,
      businessRegDoc,
      subscriptionTier: 'Free'
    });

    // Return formatted user data
    const userData = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      address: user.address,
      state: user.state,
      city: user.city,
      otherCity: user.otherCity,
      profilePhoto: user.profilePhoto,
      isAdmin: user.isAdmin,
      adminRole: user.adminRole,
      subscriptionTier: user.subscriptionTier,
      cleanerType: user.cleanerType,
      clientType: user.clientType,
      companyName: user.companyName,
      companyAddress: user.companyAddress,
      experience: user.experience,
      bio: user.bio,
      services: user.services || [],
      chargeHourly: user.chargeHourly,
      chargeDaily: user.chargeDaily,
      chargePerContract: user.chargePerContract,
      chargePerContractNegotiable: user.chargePerContractNegotiable,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      bookingHistory: [],
      reviewsData: [],
      isSuspended: user.isSuspended
    };

    res.status(201).json({
      ...userData,
      token: generateToken(user._id.toString(), user.role, user.isAdmin, user.adminRole)
    });
  } catch (error) { handleError(res, error, 'Registration failed'); }
});

app.post('/api/auth/login', async (req: ExpressRequest, res: ExpressResponse) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: 'Account is suspended.' });
    }

    // Get booking history
    const bookings = await Booking.find({
      $or: [{ clientId: user._id.toString() }, { cleanerId: user._id.toString() }]
    }).lean();

    // Get reviews
    const reviews = await Review.find({ cleanerId: user._id.toString() }).lean();
    
    // Normalize DB keys to frontend expectations (camelCase) - return complete user data
    const userData = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      address: user.address,
      state: user.state,
      city: user.city,
      otherCity: user.otherCity,
      profilePhoto: user.profilePhoto,
      isAdmin: user.isAdmin,
      adminRole: user.adminRole,
      subscriptionTier: user.subscriptionTier,
      cleanerType: user.cleanerType,
      clientType: user.clientType,
      companyName: user.companyName,
      companyAddress: user.companyAddress,
      experience: user.experience,
      bio: user.bio,
      services: user.services || [],
      chargeHourly: user.chargeHourly,
      chargeDaily: user.chargeDaily,
      chargePerContract: user.chargePerContract,
      chargePerContractNegotiable: user.chargePerContractNegotiable,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      bookingHistory: bookings || [],
      reviewsData: reviews || [],
      pendingSubscription: user.pendingSubscription,
      subscriptionReceipt: user.subscriptionReceipt,
      subscriptionEndDate: user.subscriptionEndDate,
      subscriptionDate: user.subscriptionDate,
      subscriptionAmount: user.subscriptionAmount,
      isSuspended: user.isSuspended,
      governmentId: user.governmentId,
      businessRegDoc: user.businessRegDoc,
      monthlyNewClientsIds: user.monthlyNewClientsIds || [],
      monthlyUsageResetDate: user.monthlyUsageResetDate
    };
    
    res.json({ token: generateToken(user._id.toString(), user.role, user.isAdmin, user.adminRole), user: userData });
  } catch (error) { handleError(res, error, 'Login failed'); }
});

// ============================================================================
// ROUTES: ADMIN SEEDING (Dev/Demo)
// ============================================================================
app.get('/api/seed-admins', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);
    
    const admins = [
      { email: 'super@cleanconnect.ng', name: 'Super Admin', role: 'Super' },
      { email: 'payment@cleanconnect.ng', name: 'Payment Admin', role: 'Payment' },
      { email: 'verification@cleanconnect.ng', name: 'Verification Admin', role: 'Verification' },
      { email: 'support@cleanconnect.ng', name: 'Support Admin', role: 'Support' }
    ];

    const results = [];
    for (const admin of admins) {
       const exists = await User.findOne({ email: admin.email });
       if (!exists) {
         const newAdmin = await User.create({
           fullName: admin.name,
           email: admin.email,
           password: hashedPassword,
           role: 'client',
           isAdmin: true,
           adminRole: admin.role,
           phoneNumber: '0000000000'
         });
         results.push({
           id: newAdmin._id.toString(),
           email: newAdmin.email,
           adminRole: newAdmin.adminRole
         });
       }
    }
    
    res.json({ 
        message: 'Admin seeding complete', 
        created: results,
        info: 'Default password is "password"' 
    });
  } catch (error) {
    handleError(res, error, 'Seeding failed'); 
  }
});

// ============================================================================
// ROUTES: USERS & CLEANERS
// ============================================================================
app.get('/api/users/me', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  const authReq = req as AuthRequest;
  try {
    const user = await User.findById(authReq.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Get booking history
    const bookings = await Booking.find({
      $or: [{ clientId: user._id.toString() }, { cleanerId: user._id.toString() }]
    }).lean();

    // Get reviews
    const reviews = await Review.find({ cleanerId: user._id.toString() }).lean();

    // Transform DB to frontend format
    const formattedUser = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      address: user.address,
      state: user.state,
      city: user.city,
      otherCity: user.otherCity,
      profilePhoto: user.profilePhoto,
      isAdmin: user.isAdmin,
      adminRole: user.adminRole,
      subscriptionTier: user.subscriptionTier,
      cleanerType: user.cleanerType,
      clientType: user.clientType,
      companyName: user.companyName,
      companyAddress: user.companyAddress,
      experience: user.experience,
      bio: user.bio,
      services: user.services || [],
      chargeHourly: user.chargeHourly,
      chargeDaily: user.chargeDaily,
      chargePerContract: user.chargePerContract,
      chargePerContractNegotiable: user.chargePerContractNegotiable,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      bookingHistory: bookings || [],
      reviewsData: reviews || [],
      pendingSubscription: user.pendingSubscription,
      subscriptionReceipt: user.subscriptionReceipt,
      subscriptionEndDate: user.subscriptionEndDate,
      subscriptionDate: user.subscriptionDate,
      subscriptionAmount: user.subscriptionAmount,
      isSuspended: user.isSuspended,
      governmentId: user.governmentId,
      businessRegDoc: user.businessRegDoc,
      monthlyNewClientsIds: user.monthlyNewClientsIds || [],
      monthlyUsageResetDate: user.monthlyUsageResetDate
    };

    res.json(formattedUser);
  } catch (error) { handleError(res, error); }
});

app.put('/api/users/me', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  const authReq = req as AuthRequest;
  const { role, fullName, phoneNumber, gender, address, bio, services, experience, chargeHourly, chargeDaily, chargePerContract, chargePerContractNegotiable, profilePhoto, state, city, otherCity, companyName, companyAddress, bankName, accountNumber, clientType, cleanerType, governmentId, businessRegDoc } = req.body;
  try {
    const user = await User.findById(authReq.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update only provided fields
    if (role !== undefined) user.role = role;
    if (fullName !== undefined) user.fullName = fullName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (gender !== undefined) user.gender = gender;
    if (address !== undefined) user.address = address;
    if (bio !== undefined) user.bio = bio;
    if (services !== undefined) user.services = services;
    if (experience !== undefined) user.experience = experience;
    if (chargeHourly !== undefined) user.chargeHourly = chargeHourly;
    if (chargeDaily !== undefined) user.chargeDaily = chargeDaily;
    if (chargePerContract !== undefined) user.chargePerContract = chargePerContract;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    if (state !== undefined) user.state = state;
    if (city !== undefined) user.city = city;
    if (otherCity !== undefined) user.otherCity = otherCity;
    if (companyName !== undefined) user.companyName = companyName;
    if (companyAddress !== undefined) user.companyAddress = companyAddress;
    if (bankName !== undefined) user.bankName = bankName;
    if (accountNumber !== undefined) user.accountNumber = accountNumber;
    if (chargePerContractNegotiable !== undefined) user.chargePerContractNegotiable = chargePerContractNegotiable;
    if (clientType !== undefined) user.clientType = clientType;
    if (cleanerType !== undefined) user.cleanerType = cleanerType;
    if (governmentId !== undefined) user.governmentId = governmentId;
    if (businessRegDoc !== undefined) user.businessRegDoc = businessRegDoc;

    await user.save();
    
    // Return formatted user data
    const userData = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      address: user.address,
      state: user.state,
      city: user.city,
      otherCity: user.otherCity,
      profilePhoto: user.profilePhoto,
      isAdmin: user.isAdmin,
      adminRole: user.adminRole,
      subscriptionTier: user.subscriptionTier,
      cleanerType: user.cleanerType,
      clientType: user.clientType,
      companyName: user.companyName,
      companyAddress: user.companyAddress,
      experience: user.experience,
      bio: user.bio,
      services: user.services || [],
      chargeHourly: user.chargeHourly,
      chargeDaily: user.chargeDaily,
      chargePerContract: user.chargePerContract,
      chargePerContractNegotiable: user.chargePerContractNegotiable,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      governmentId: user.governmentId,
      businessRegDoc: user.businessRegDoc,
      isSuspended: user.isSuspended
    };
    
    res.json(userData);
  } catch (error) { handleError(res, error, 'Update failed'); }
});

app.get('/api/cleaners', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const users = await User.find({ role: 'cleaner', isSuspended: false }).lean();

    // Get reviews for all cleaners
    const cleanersWithData = await Promise.all(users.map(async (c) => {
      const reviews = await Review.find({ cleanerId: c._id.toString() }).lean();
      const recentReviews = await Review.find({ cleanerId: c._id.toString() })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();
      
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length 
        : 5.0;

      return {
        id: c._id.toString(),
        name: c.fullName,
        photoUrl: c.profilePhoto,
        rating: parseFloat(avgRating.toFixed(1)),
        reviews: reviews.length,
        serviceTypes: c.services || [],
        state: c.state,
        city: c.city,
        otherCity: c.otherCity,
        experience: c.experience,
        bio: c.bio,
        isVerified: !!c.businessRegDoc,
        chargeHourly: c.chargeHourly,
        chargeDaily: c.chargeDaily,
        chargePerContract: c.chargePerContract,
        chargePerContractNegotiable: c.chargePerContractNegotiable,
        subscriptionTier: c.subscriptionTier,
        cleanerType: c.cleanerType,
        reviewsData: recentReviews.map(r => ({
          reviewerName: r.reviewerName,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt
        }))
      };
    }));

    res.json(cleanersWithData);
  } catch (error) { handleError(res, error); }
});

app.get('/api/cleaners/:id', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const user = await User.findOne({ _id: req.params.id, role: 'cleaner' }).lean();
        if (!user) return res.status(404).json({ message: 'Cleaner not found' });

        const reviews = await Review.find({ cleanerId: req.params.id }).lean();
        const avgRating = reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length 
          : 5.0;

        const cleaner = {
            id: user._id.toString(),
            name: user.fullName,
            photoUrl: user.profilePhoto,
            rating: parseFloat(avgRating.toFixed(1)),
            reviews: reviews.length,
            serviceTypes: user.services || [],
            state: user.state,
            city: user.city,
            otherCity: user.otherCity,
            experience: user.experience,
            bio: user.bio,
            isVerified: !!user.businessRegDoc,
            chargeHourly: user.chargeHourly,
            chargeDaily: user.chargeDaily,
            chargePerContract: user.chargePerContract,
            chargePerContractNegotiable: user.chargePerContractNegotiable,
            subscriptionTier: user.subscriptionTier,
            cleanerType: user.cleanerType,
            reviewsData: reviews || []
        };
        res.json(cleaner);
    } catch (error) { handleError(res, error); }
});

// ============================================================================
// ROUTES: BOOKINGS
// ============================================================================
app.post('/api/bookings', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  const authReq = req as AuthRequest;
  const { cleanerId, service, date, amount, totalAmount, paymentMethod } = req.body;
  try {
    const cleaner = await User.findById(cleanerId);
    const cleanerName = cleaner?.fullName || 'Cleaner';
    
    const client = await User.findById(authReq.user!.id);
    const clientName = client?.fullName || 'Client';

    const booking = await Booking.create({
      clientId: authReq.user!.id,
      cleanerId,
      clientName,
      cleanerName,
      serviceType: service,
      date,
      totalPrice: totalAmount || amount,
      paymentMethod,
      status: 'Upcoming',
      paymentStatus: paymentMethod === 'Direct' ? 'Not Applicable' : 'Pending Payment'
    });

    const bookingData = {
        id: booking._id.toString(),
        clientId: booking.clientId,
        cleanerId: booking.cleanerId,
        clientName: booking.clientName,
        cleanerName: booking.cleanerName,
        service: booking.serviceType,
        date: booking.date,
        amount: booking.totalPrice,
        totalAmount: booking.totalPrice,
        paymentMethod: booking.paymentMethod,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        jobApprovedByClient: false,
        reviewSubmitted: booking.reviewSubmitted
    };

    await sendEmail(authReq.user!.id, 'Booking Confirmation', `You booked ${cleanerName} for ${service}.`);
    res.status(201).json(bookingData);
  } catch (error) { handleError(res, error, 'Booking failed'); }
});

app.post('/api/bookings/:id/cancel', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    res.json({ 
      ...booking.toObject(), 
      paymentStatus: booking.paymentStatus, 
      cleanerName: booking.cleanerName, 
      clientName: booking.clientName, 
      totalAmount: booking.totalPrice, 
      cleanerId: booking.cleanerId, 
      clientId: booking.clientId 
    });
  } catch (error) { handleError(res, error); }
});

app.post('/api/bookings/:id/complete', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    let newPaymentStatus = booking.paymentStatus;
    if (booking.paymentMethod === 'Escrow' && booking.paymentStatus === 'Confirmed') {
      newPaymentStatus = 'Pending Payout';
    }

    booking.status = 'Completed';
    booking.paymentStatus = newPaymentStatus;
    await booking.save();

    res.json({ 
      ...booking.toObject(), 
      paymentStatus: booking.paymentStatus, 
      cleanerName: booking.cleanerName, 
      clientName: booking.clientName, 
      totalAmount: booking.totalPrice, 
      cleanerId: booking.cleanerId, 
      clientId: booking.clientId,
      jobApprovedByClient: true
    });
  } catch (error) { handleError(res, error); }
});

app.post('/api/bookings/:id/review', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  const authReq = req as AuthRequest;
  const { rating, timeliness, thoroughness, conduct, comment, cleanerId } = req.body;
  try {
    const client = await User.findById(authReq.user!.id);
    const reviewerName = client?.fullName || 'Anonymous';

    await Review.create({
      bookingId: req.params.id,
      cleanerId,
      reviewerName,
      rating,
      timeliness,
      thoroughness,
      conduct,
      comment
    });
    
    await Booking.findByIdAndUpdate(req.params.id, { reviewSubmitted: true });
    res.json({ message: 'Review submitted' });
  } catch (error) { handleError(res, error); }
});

app.post('/api/bookings/:id/receipt', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  const { name, dataUrl } = req.body;
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        escrowPaymentDetails: { name, dataUrl },
        paymentStatus: 'Pending Admin Confirmation' 
      },
      { new: true }
    );
    res.json(booking);
  } catch (error) { handleError(res, error); }
});

// ============================================================================
// ROUTES: SUBSCRIPTION
// ============================================================================
app.post('/api/users/subscription/upgrade', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  const authReq = req as AuthRequest;
  const { plan } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      authReq.user!.id,
      { pendingSubscription: plan },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({ 
      ...user.toObject(), 
      fullName: user.fullName, 
      subscriptionTier: user.subscriptionTier, 
      pendingSubscription: user.pendingSubscription 
    });
  } catch (error) { handleError(res, error); }
});

app.post('/api/users/subscription/receipt', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  const authReq = req as AuthRequest;
  const { name, dataUrl } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      authReq.user!.id,
      { subscriptionReceipt: { name, dataUrl } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({ 
      ...user.toObject(), 
      fullName: user.fullName, 
      subscriptionReceipt: user.subscriptionReceipt 
    });
  } catch (error) { handleError(res, error); }
});

// ============================================================================
// ROUTES: ADMIN
// ============================================================================
app.get('/api/admin/users', protect, admin, async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json(users.map(u => ({
        id: u._id.toString(),
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        isAdmin: u.isAdmin,
        adminRole: u.adminRole,
        isSuspended: u.isSuspended,
        subscriptionTier: u.subscriptionTier,
        pendingSubscription: u.pendingSubscription,
        subscriptionReceipt: u.subscriptionReceipt,
        clientType: u.clientType,
        cleanerType: u.cleanerType,
        companyName: u.companyName,
        bookingHistory: [] 
    })));
  } catch (error) { handleError(res, error); }
});

app.patch('/api/admin/users/:id/status', protect, admin, async (req: ExpressRequest, res: ExpressResponse) => {
  const { isSuspended } = req.body;
  try {
    await User.findByIdAndUpdate(req.params.id, { isSuspended });
    res.json({ message: 'User status updated' });
  } catch (error) { handleError(res, error); }
});

app.delete('/api/admin/users/:id', protect, admin, async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) { handleError(res, error); }
});

app.post('/api/admin/bookings/:id/confirm-payment', protect, admin, async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { paymentStatus: 'Confirmed' });
    res.json({ message: 'Payment confirmed' });
  } catch (error) { handleError(res, error); }
});

app.post('/api/admin/bookings/:id/mark-paid', protect, admin, async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { paymentStatus: 'Paid' });
    res.json({ message: 'Marked as paid' });
  } catch (error) { handleError(res, error); }
});

// ============================================================================
// PAYMENT GATEWAY ENDPOINTS (Paystack & Flutterwave)
// ============================================================================

app.post('/api/payment/initialize', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  const authReq = req as any;
  try {
    const { email, amount, plan, billingCycle } = req.body;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: 'Payment gateway not configured' });
    }

    const reference = `SUB_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Paystack expects amount in kobo (NGN cents)
        reference,
        callback_url: req.body.callback_url || undefined,
        metadata: {
          plan,
          billingCycle,
          userId: authReq.user?.id
        }
      })
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return res.status(400).json({ message: paystackData.message || 'Payment initialization failed' });
    }

    // Store pending subscription
    await User.findByIdAndUpdate(authReq.user!.id, { pendingSubscription: plan });

    res.json({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference
    });
  } catch (error) { handleError(res, error); }
});

app.get('/api/payment/verify/:reference', protect, async (req: ExpressRequest, res: ExpressResponse) => {
  const authReq = req as any;
  try {
    const { reference } = req.params;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: 'Payment gateway not configured' });
    }

    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    const paystackData = await paystackResponse.json();

    if (paystackData.status && paystackData.data.status === 'success') {
      const plan = paystackData.data.metadata?.plan;
      const amount = paystackData.data.amount / 100; // Convert from kobo back to NGN
      const userId = paystackData.data.metadata?.userId || authReq.user?.id;

      if (plan && userId) {
        const subscriptionDate = new Date();
        const subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await User.findByIdAndUpdate(userId, {
          subscriptionTier: plan,
          subscriptionDate,
          subscriptionEndDate,
          subscriptionAmount: amount,
          pendingSubscription: undefined,
          subscriptionReceipt: undefined
        });
      }

      res.json({ success: true, message: 'Payment verified and subscription activated' });
    } else {
      res.json({ success: false, message: 'Payment not successful' });
    }
  } catch (error) { handleError(res, error); }
});

app.post('/api/admin/users/:id/approve-subscription', protect, admin, async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const plan = user.pendingSubscription;
    if (!plan) return res.status(400).json({ message: 'No pending subscription' });

    // Calculate subscription details
    const subscriptionDate = new Date();
    const subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    // Map plan to monthly price (in NGN)
    const planPrices: Record<string, number> = {
      'Free': 0,
      'Standard': 5000,
      'Pro': 10000,
      'Premium': 30000,
      'Basic': 5000,
      'Elite': 30000,
      'Regular': 20000,
      'Silver': 30000,
      'Gold': 50000,
      'Diamond': 80000
    };
    const subscriptionAmount = planPrices[plan] || 0;

    user.subscriptionTier = plan;
    user.pendingSubscription = undefined;
    user.subscriptionReceipt = undefined;
    user.subscriptionDate = subscriptionDate;
    user.subscriptionEndDate = subscriptionEndDate;
    user.subscriptionAmount = subscriptionAmount;
    await user.save();

    res.json({ message: 'Subscription approved' });
  } catch (error) { handleError(res, error); }
});

app.post('/api/admin/create-admin', protect, admin, async (req: ExpressRequest, res: ExpressResponse) => {
  const { fullName, email, password, role } = req.body;
  try {
     const salt = await bcrypt.genSalt(10);
     const hashedPassword = await bcrypt.hash(password, salt);
     const newAdmin = await User.create({
         fullName,
         email,
         password: hashedPassword,
         role: 'client',
         isAdmin: true,
         adminRole: role
     });
     
     res.status(201).json({ 
       ...newAdmin.toObject(), 
       fullName: newAdmin.fullName, 
       isAdmin: newAdmin.isAdmin, 
       adminRole: newAdmin.adminRole 
     });
  } catch (error) { handleError(res, error); }
});

// ============================================================================
// ROUTES: SUPPORT TICKETS
// ============================================================================
app.post('/api/support', protect, async (req: ExpressRequest, res: ExpressResponse) => {
    const authReq = req as AuthRequest;
    const { category, subject, message } = req.body;
    try {
        const ticket = await SupportTicket.create({
            userId: authReq.user!.id,
            category,
            subject,
            description: message
        });
        res.status(201).json(ticket);
    } catch (error) { 
        handleError(res, error);
    }
});

app.get('/api/support/my', protect, async (req: ExpressRequest, res: ExpressResponse) => {
    const authReq = req as AuthRequest;
    try {
        const tickets = await SupportTicket.find({ userId: authReq.user!.id })
            .sort({ createdAt: -1 })
            .lean();
        
        res.json(tickets.map(r => ({
            id: r._id.toString(),
            userId: r.userId,
            category: r.category,
            subject: r.subject,
            message: r.description,
            status: r.status || 'Open',
            adminResponse: r.adminNotes,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
        })));
    } catch (error) { 
        handleError(res, error);
    }
});

app.get('/api/admin/support', protect, admin, async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const tickets = await SupportTicket.find()
            .sort({ status: 1, createdAt: -1 })
            .lean();
        
        // Get user details for each ticket
        const ticketsWithUser = await Promise.all(tickets.map(async (r) => {
            const user = await User.findById(r.userId).lean();
            return {
                id: r._id.toString(),
                userId: r.userId,
                userName: user?.fullName || 'Unknown',
                userRole: user?.role || 'User',
                category: r.category,
                subject: r.subject,
                message: r.description,
                status: r.status || 'Open',
                adminResponse: r.adminNotes,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            };
        }));
        
        res.json(ticketsWithUser);
    } catch (error) { 
        handleError(res, error);
    }
});

app.post('/api/admin/support/:id/resolve', protect, admin, async (req: ExpressRequest, res: ExpressResponse) => {
    const { adminResponse } = req.body;
    try {
        const ticket = await SupportTicket.findByIdAndUpdate(
            req.params.id,
            { 
                adminNotes: adminResponse, 
                status: 'Resolved',
                updatedAt: new Date()
            },
            { new: true }
        );
        res.json(ticket);
    } catch (error) { 
        handleError(res, error);
    }
});

// ============================================================================
// ROUTES: CHAT
// ============================================================================
app.post('/api/chats', protect, async (req: ExpressRequest, res: ExpressResponse) => {
    const authReq = req as AuthRequest;
    const { participantId } = req.body;
    const userId = authReq.user!.id;

    try {
        // Check if chat already exists
        const existingChat = await Chat.findOne({
            $or: [
                { clientId: userId, cleanerId: participantId },
                { clientId: participantId, cleanerId: userId }
            ]
        });

        if (existingChat) {
            return res.json({ 
                id: existingChat._id.toString(), 
                participants: [existingChat.clientId, existingChat.cleanerId], 
                participantNames: {} 
            }); 
        }

        const chat = await Chat.create({
            clientId: userId,
            cleanerId: participantId
        });
        
        res.status(201).json({ 
            id: chat._id.toString(), 
            participants: [userId, participantId], 
            participantNames: {} 
        });
    } catch (error) { handleError(res, error, 'Failed to create chat'); }
});

app.get('/api/chats', protect, async (req: ExpressRequest, res: ExpressResponse) => {
    const authReq = req as AuthRequest;
    try {
        const chats = await Chat.find({
            $or: [{ clientId: authReq.user!.id }, { cleanerId: authReq.user!.id }]
        }).lean();

        const chatsWithDetails = await Promise.all(chats.map(async (c) => {
            let lastMessage = undefined;
            if (c.lastMessageId) {
                const msg = await Message.findById(c.lastMessageId).lean();
                if (msg) {
                    lastMessage = {
                        text: msg.content,
                        senderId: msg.senderId,
                        timestamp: msg.timestamp
                    };
                }
            }

            // Get participant names
            const client = await User.findById(c.clientId).lean();
            const cleaner = await User.findById(c.cleanerId).lean();

            return {
                id: c._id.toString(),
                participants: [c.clientId, c.cleanerId],
                participantNames: {
                    [c.clientId]: client?.fullName || 'User',
                    [c.cleanerId]: cleaner?.fullName || 'User'
                },
                lastMessage,
                updatedAt: lastMessage?.timestamp || c.createdAt
            };
        }));

        // Sort by most recent
        chatsWithDetails.sort((a, b) => {
            const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return timeB - timeA;
        });

        res.json(chatsWithDetails);
    } catch (error) { handleError(res, error); }
});

app.get('/api/chats/:id/messages', protect, async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const messages = await Message.find({ chatId: req.params.id })
            .sort({ timestamp: 1 })
            .lean();
        
        const formattedMessages = messages.map(r => ({
            id: r._id.toString(),
            chatId: r.chatId,
            senderId: r.senderId,
            text: r.content,
            timestamp: r.timestamp
        }));
        res.json(formattedMessages);
    } catch (error) { handleError(res, error); }
});

app.post('/api/chats/:id/messages', protect, async (req: ExpressRequest, res: ExpressResponse) => {
    const authReq = req as AuthRequest;
    const { text } = req.body;
    try {
        const message = await Message.create({
            chatId: req.params.id,
            senderId: authReq.user!.id,
            content: text
        });
        
        // Update chat last message
        await Chat.findByIdAndUpdate(req.params.id, { 
            lastMessageId: message._id.toString(),
            updatedAt: new Date()
        });

        res.status(201).json({
            id: message._id.toString(),
            chatId: message.chatId,
            senderId: message.senderId,
            text: message.content,
            timestamp: message.timestamp
        });
    } catch (error) { handleError(res, error); }
});

// ============================================================================
// ROUTES: AI & MISC
// ============================================================================
app.post('/api/search/ai', async (req: ExpressRequest, res: ExpressResponse) => {
  const { query } = req.body;
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a helper for a cleaning service app in Nigeria. 
        Extract key search terms (location, service type, budget) from this user query: "${query}".
        Return ONLY a JSON object with keys: "location" (string), "service" (string), "maxPrice" (number). 
        If info is missing, use null.
        Example: {"location": "Lagos", "service": "Deep Cleaning", "maxPrice": 50000}`
    });
    
    const text = response.text;
    if (!text) {
        throw new Error("No response from AI");
    }
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const criteria = JSON.parse(cleanJson);

    // Build MongoDB Query based on extracted criteria
    const filter: any = { role: 'cleaner', isSuspended: false };

    if (criteria.location) {
        filter.$or = [
            { city: { $regex: criteria.location, $options: 'i' } },
            { state: { $regex: criteria.location, $options: 'i' } },
            { otherCity: { $regex: criteria.location, $options: 'i' } }
        ];
    }
    
    if (criteria.service) {
        filter.services = { $regex: criteria.service, $options: 'i' };
    }
    
    if (criteria.maxPrice) {
        filter.$or = filter.$or || [];
        filter.$or.push(
            { chargeHourly: { $lte: criteria.maxPrice } },
            { chargeDaily: { $lte: criteria.maxPrice } }
        );
    }

    const users = await User.find(filter).select('_id').lean();
    res.json({ matchingIds: users.map(u => u._id.toString()) });

  } catch (error) { 
      console.error(error);
      res.json({ matchingIds: [] });
  }
});

app.post('/api/contact', (req: ExpressRequest, res: ExpressResponse) => {
    console.log('Contact Form:', req.body);
    res.json({ message: 'Message received' });
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  if (!MONGO_URL) {
      console.warn("WARNING: MONGO_URL is not set. Database features will fail.");
  }
  if (!process.env.API_KEY) {
      console.warn("WARNING: API_KEY is not set. AI features will fail.");
  }
});

// Serve static files in production
// Place this AFTER API routes so API requests aren't intercepted by the static handler
if (process.env.NODE_ENV === 'production') {
  // Assuming the build output is in the 'dist' folder at the root level relative to where this script runs
  // If backend/index.ts is run via ts-node, __dirname is .../backend. ../dist is .../dist.
  // If compiled to dist/backend/index.js, adjusting path might be needed. 
  // Standard monorepo or simple deployment usually puts `dist` (frontend) and `backend` as siblings.
  app.use(express.static(path.join(__dirname_local, '../dist')));

  app.get('*', (req: ExpressRequest, res: ExpressResponse) => {
    res.sendFile(path.join(__dirname_local, '../dist/index.html'));
  });
}

app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});
