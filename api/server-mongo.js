// Skills Konnect API Server
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const MONGO_URL = process.env.MONGO_URL;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==================== MONGOOSE SCHEMAS ====================

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, required: true },
  role: { type: String, default: 'user' },
  isProfileComplete: { type: Boolean, default: false },
  fullName: String,
  gender: String,
  phoneCountryCode: String,
  phoneNumber: String,
  phone: String,
  country: String,
  state: String,
  city: String,
  otherCity: String,
  address: String,
  streetAddress: String,
  officeAddress: String,
  workplaceAddress: String,
  profilePhoto: String,
  profilePicture: String,
  
  // Company fields
  companyName: String,
  companyRegistrationNumber: String,
  companyAddress: String,
  cleanerType: String,
  clientType: String,
  businessName: String,
  businessRegistrationNumber: String,
  businessEmail: String,
  businessPhone: String,
  businessAddress: String,
  
  // Worker fields
  services: [String],
  skillType: [String],
  experience: Number,
  yearsOfExperience: Number,
  bio: String,
  professionalExperience: String,
  chargeHourly: Number,
  chargeDaily: Number,
  chargePerContract: Number,
  chargePerContractNegotiable: Boolean,
  chargeRate: Number,
  chargeRateType: String,
  
  // Bank details
  bankName: String,
  accountNumber: String,
  accountName: String,
  
  // Verification
  isVerified: { type: Boolean, default: false },
  verificationDocuments: {
    governmentId: String,
    companyRegistrationCert: String,
    skillTrainingCert: String
  },
  
  // Admin
  isAdmin: { type: Boolean, default: false },
  adminRole: String,
  isSuspended: { type: Boolean, default: false },
  blockedUsers: [String],
  
  // Subscription
  subscriptionTier: String,
  pendingSubscription: String,
  subscriptionEndDate: Date,
  subscriptionDate: Date,
  subscriptionAmount: Number,
  
  // Bookings & Jobs
  bookingHistory: [mongoose.Schema.Types.Mixed],
  postedJobs: [mongoose.Schema.Types.Mixed],
  appliedJobs: [String],
  
  // Reviews
  reviewsData: [mongoose.Schema.Types.Mixed],
  
  // Usage tracking
  monthlyNewClientsIds: [String],
  monthlyUsageResetDate: String,
  monthlyJobPostsCount: Number,
  
  // Legacy nested fields
  pricing: {
    hourly: Number,
    daily: Number,
    contract: Number
  },
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountName: String
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    reviews: [{
      clientId: String,
      clientName: String,
      rating: Number,
      comment: String,
      date: Date
    }]
  },
  subscriptionPlan: {
    type: String,
    default: 'free'
  }
}, { timestamps: true, strict: false });

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  service: { type: String, required: true },
  category: String, // Legacy field
  location: String,
  state: String,
  city: String,
  budget: Number,
  budgetType: { type: String, default: 'Fixed', enum: ['Hourly', 'Daily', 'Monthly', 'Fixed'] },
  startDate: String,
  endDate: String,
  postedDate: { type: String, default: () => new Date().toISOString() },
  clientId: { type: String, required: true },
  clientName: String,
  clientEmail: String,
  status: { type: String, default: 'Open', enum: ['Open', 'In Progress', 'Completed', 'Cancelled', 'open', 'assigned', 'closed', 'active'] },
  visibility: { type: String, default: 'Subscribers Only', enum: ['Public', 'Subscribers Only'] },
  requirements: [String],
  selectedWorkerId: String,
  applicants: [{
    workerId: String,
    workerName: String,
    workerEmail: String,
    positionApplied: String,
    proposal: String,
    proposedPrice: Number,
    appliedAt: Date,
    status: { type: String, default: 'pending' }
  }],
  assignedWorker: {
    workerId: String,
    workerName: String,
    workerEmail: String
  }
}, { timestamps: true });

// Add toJSON transforms to map _id to id
JobSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    // Map category to service for backward compatibility
    if (!ret.service && ret.category) ret.service = ret.category;
    return ret;
  }
});

const BookingSchema = new mongoose.Schema({
  service: { type: String, required: true },
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  totalAmount: Number,
  status: { type: String, default: 'Upcoming', enum: ['Upcoming', 'Completed', 'Cancelled'] },
  clientName: String,
  cleanerName: String,
  clientId: { type: String, required: true },
  cleanerId: { type: String, required: true },
  reviewSubmitted: { type: Boolean, default: false },
  paymentMethod: { type: String, required: true, enum: ['Escrow', 'Direct'] },
  paymentStatus: { type: String, default: 'Not Applicable', enum: ['Pending Payment', 'Pending Admin Confirmation', 'Confirmed', 'Pending Payout', 'Paid', 'Not Applicable'] },
  paymentReceipt: {
    name: String,
    dataUrl: String
  },
  jobApprovedByClient: { type: Boolean, default: false }
}, { timestamps: true });

BookingSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const ChatSchema = new mongoose.Schema({
  participants: [String],
  participantNames: {
    type: Map,
    of: String
  },
  messages: [{
    senderId: String,
    senderName: String,
    text: String,
    timestamp: Date,
    read: { type: Boolean, default: false }
  }],
  lastMessage: {
    text: String,
    timestamp: Date,
    senderId: String
  }
}, { timestamps: true });

ChatSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    // Convert Map to plain object for JSON serialization
    if (ret.participantNames instanceof Map) {
      ret.participantNames = Object.fromEntries(ret.participantNames);
    }
    return ret;
  }
});

const SupportTicketSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: String,
  userEmail: String,
  userRole: { type: String, default: 'user' },
  category: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Open', 'Resolved'], default: 'Open' },
  adminResponse: { type: String, default: '' }
}, { timestamps: true });

SupportTicketSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.createdAt = ret.createdAt ? ret.createdAt.toISOString() : null;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Notification Schema
const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ['subscription', 'booking', 'verification', 'system', 'review', 'job'] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.createdAt = ret.createdAt ? ret.createdAt.toISOString() : null;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const ReportSchema = new mongoose.Schema({
  reporterId: { type: String, required: true },
  reportedUserId: { type: String, required: true },
  reason: { type: String, required: true },
  details: { type: String, default: '' },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

// Create models
const User = mongoose.model('User', UserSchema);
const Job = mongoose.model('Job', JobSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Chat = mongoose.model('Chat', ChatSchema);
const SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Report = mongoose.model('Report', ReportSchema);

// Helper: Create a notification for a user
async function createNotification(userId, type, title, message) {
  try {
    await Notification.create({ userId, type, title, message });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

// ==================== MONGODB CONNECTION ====================

mongoose.connect(MONGO_URL)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Create super admin if doesn't exist
    try {
      const adminEmail = 'superadmin@skillskonnect.online';
      const existingAdmin = await User.findOne({ email: adminEmail });
      
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('SuperAdmin@2026!', 10);
        await User.create({
          email: adminEmail,
          password: hashedPassword,
          userType: 'admin',
          role: 'super-admin',
          fullName: 'Super Admin',
          isAdmin: true,
          isProfileComplete: true
        });
        console.log('✅ Super admin account created');
      } else if (!existingAdmin.isAdmin) {
        // Fix existing admin if isAdmin flag is missing
        existingAdmin.isAdmin = true;
        existingAdmin.role = 'super-admin';
        existingAdmin.userType = 'admin';
        await existingAdmin.save();
        console.log('✅ Fixed super admin account');
      }
    } catch (error) {
      console.error('Error creating super admin:', error.message);
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    // Do not call process.exit — serverless environments cannot exit the process
  });

// ==================== AUTH MIDDLEWARE ====================

// Helper to strip MongoDB-internal fields from an object (recursive)
function stripMongoFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripMongoFields);
  const cleaned = { ...obj };
  delete cleaned._id;
  delete cleaned.__v;
  // Recurse into nested objects/arrays
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] && typeof cleaned[key] === 'object') {
      cleaned[key] = stripMongoFields(cleaned[key]);
    }
  }
  return cleaned;
}

// Helper to normalize user data for frontend compatibility
function normalizeUser(user) {
  const userObj = user.toObject ? user.toObject() : { ...user };
  // Map _id to id
  if (userObj._id) {
    userObj.id = userObj._id.toString();
    delete userObj._id;  // Remove _id after mapping to id
  }
  // Map userType to role for frontend compatibility (but don't override admin roles)
  if ((userObj.role === 'user' || !userObj.role) && !['admin', 'super-admin'].includes(userObj.role)) {
    if (userObj.userType === 'client' || userObj.userType === 'Client (Individual)' || userObj.userType === 'Client (Registered Company)') userObj.role = 'client';
    else if (userObj.userType === 'worker' || userObj.userType === 'Worker (Individual)' || userObj.userType === 'Worker (Registered Company)') userObj.role = 'cleaner';
  }
  // Add isAdmin flag - check both role and userType for admin status
  userObj.isAdmin = ['admin', 'super-admin'].includes(userObj.role) || userObj.userType === 'admin';
  // Remove sensitive fields
  delete userObj.password;
  delete userObj.__v;
  return userObj;
}

// Helper: verify admin — checks JWT first, falls back to DB for old tokens without role in payload
const verifyAdmin = async (req) => {
  if (req.user.isAdmin) return true;
  if (req.user.role === 'admin' || req.user.role === 'super-admin') return true;
  // Fallback DB lookup for old JWTs that pre-date the role field in token
  const dbUser = await User.findOne({ email: req.user.email }).select('isAdmin role');
  return dbUser && (dbUser.isAdmin || dbUser.role === 'admin' || dbUser.role === 'super-admin');
};

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      email: decoded.email,
      userType: decoded.userType,
      role: decoded.role || decoded.userType || 'user',
      isAdmin: decoded.isAdmin || false
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ==================== AUTH ROUTES ====================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and userType are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const role = userType === 'admin' ? 'admin' : 'user';

    const newUser = await User.create({
      email,
      password: hashedPassword,
      userType,
      role,
      isProfileComplete: false
    });

    const token = jwt.sign(
      { email: newUser.email, userType: newUser.userType, role: newUser.role, isAdmin: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: normalizeUser(newUser)
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email: user.email, userType: user.userType, role: user.role, isAdmin: user.isAdmin || false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: normalizeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== EMAIL HELPERS ====================

// Shared nodemailer transporter factory
const createMailTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const isMockEmail = () => !process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.example.com';

// Send account verification email
const sendVerificationEmail = async (to, verifyUrl) => {
  if (isMockEmail()) {
    console.log('==================================================');
    console.log(' 📧 [MOCK EMAIL] Account Verification Link');
    console.log(` To:  ${to}`);
    console.log(` URL: ${verifyUrl}`);
    console.log('==================================================');
    return;
  }
  await createMailTransporter().sendMail({
    from: `"${process.env.FROM_NAME || 'Skills Konnect'}" <${process.env.FROM_EMAIL || 'no-reply@skillskonnect.online'}>`,
    to,
    subject: 'Verify your Skills Konnect email address',
    text: `Welcome to Skills Konnect!\n\nClick the link below to verify your email (valid for 24 hours):\n${verifyUrl}\n\nIf you did not create this account, please ignore this email.`,
    html: `<h2>Welcome to Skills Konnect!</h2><p>Click the button below to verify your email address. This link is valid for 24 hours.</p><p style="margin:24px 0"><a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Verify My Email</a></p><p>Or copy this link: ${verifyUrl}</p><p>If you did not create this account, please ignore this email.</p>`,
  });
};

// ==================== PASSWORD RESET ====================

// Helper: send email (uses nodemailer; falls back to console.log when SMTP is not configured)
const sendResetEmail = async (to, resetUrl) => {
  if (isMockEmail()) {
    console.log('==================================================');
    console.log(' 📧 [MOCK EMAIL] Password Reset Link');
    console.log(` To:  ${to}`);
    console.log(` URL: ${resetUrl}`);
    console.log('==================================================');
    return;
  }
  await createMailTransporter().sendMail({
    from: `"${process.env.FROM_NAME || 'Skills Konnect'}" <${process.env.FROM_EMAIL || 'no-reply@skillskonnect.online'}>`,
    to,
    subject: 'Reset your Skills Konnect password',
    text: `You requested a password reset.\n\nClick the link below (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset my password</a> (valid for 1 hour)</p><p>If you did not request this, ignore this email.</p>`,
  });
};

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Generate a secure, URL-safe token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'https://skillskonnect.online';
    const resetUrl = `${frontendUrl}/?token=${rawToken}&action=resetPassword`;

    await sendResetEmail(email, resetUrl);

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    user.password = await bcrypt.hash(password, 8);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== USER ROUTES ====================

app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(normalizeUser(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const updateData = { ...req.body };
    // Strip email, password and MongoDB system fields to prevent immutable field errors
    delete updateData.email;
    delete updateData.password;
    delete updateData._id;
    delete updateData.__v;
    delete updateData.id;  // Frontend id field, not needed in DB
    // Strip _id from all nested arrays (postedJobs, bookingHistory, reviewsData, etc.)
    for (const key of Object.keys(updateData)) {
      if (Array.isArray(updateData[key])) {
        updateData[key] = updateData[key].map(item => {
          if (item && typeof item === 'object') {
            const cleaned = { ...item };
            delete cleaned._id;
            delete cleaned.__v;
            return cleaned;
          }
          return item;
        });
      } else if (updateData[key] && typeof updateData[key] === 'object') {
        const cleaned = { ...updateData[key] };
        delete cleaned._id;
        delete cleaned.__v;
        updateData[key] = cleaned;
      }
    }

    // Persist correct role in DB when userType is being updated
    const WORKER_TYPES = ['worker', 'Worker (Individual)', 'Worker (Registered Company)'];
    const CLIENT_TYPES = ['client', 'Client (Individual)', 'Client (Registered Company)'];
    if (updateData.userType) {
      if (WORKER_TYPES.includes(updateData.userType)) {
        updateData.role = 'cleaner';
      } else if (CLIENT_TYPES.includes(updateData.userType)) {
        updateData.role = 'client';
      }
    }

    // Auto-set isProfileComplete to true when required fields are present
    const user = await User.findOne({ email: req.user.email });
    if (user && updateData.fullName && updateData.phoneNumber && updateData.country) {
      const effectiveUserType = updateData.userType || user.userType;
      if (WORKER_TYPES.includes(effectiveUserType)) {
        // Worker needs: services or skillType, plus at least one pricing option
        const skills = (updateData.services && updateData.services.length > 0)
          ? updateData.services
          : (updateData.skillType && updateData.skillType.length > 0 ? updateData.skillType : []);
        if (skills.length > 0 &&
           (updateData.chargeHourly || updateData.chargeDaily || updateData.chargePerContract || updateData.chargeRate)) {
          updateData.isProfileComplete = true;
        }
      } else if (CLIENT_TYPES.includes(effectiveUserType)) {
        // Client just needs basic info
        updateData.isProfileComplete = true;
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: updateData },
      { new: true }
    );

    res.json(normalizeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const { role, userType, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (userType) query.userType = userType;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:userId/review', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const workerId = req.params.userId;

    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const client = await User.findOne({ email: req.user.email });

    const review = {
      clientId: client._id.toString(),
      clientName: client.fullName || client.email,
      rating: Number(rating),
      comment,
      date: new Date()
    };

    worker.ratings.reviews.push(review);
    worker.ratings.count = worker.ratings.reviews.length;
    worker.ratings.average = 
      worker.ratings.reviews.reduce((sum, r) => sum + r.rating, 0) / worker.ratings.count;

    await worker.save();

    res.json({
      message: 'Review submitted successfully',
      ratings: worker.ratings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== JOB ROUTES ====================

app.post('/api/jobs', authenticateToken, async (req, res) => {
  try {
    const client = await User.findOne({ email: req.user.email });
    
    const jobData = {
      title: req.body.title,
      description: req.body.description,
      service: req.body.service || req.body.category,
      category: req.body.category || req.body.service,
      location: req.body.location,
      state: req.body.state,
      city: req.body.city,
      budget: req.body.budget,
      budgetType: req.body.budgetType || 'Fixed',
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      postedDate: req.body.postedDate || new Date().toISOString(),
      visibility: req.body.visibility || 'Subscribers Only',
      requirements: req.body.requirements || [],
      clientId: client._id.toString(),
      clientName: client.fullName || client.email,
      clientEmail: client.email,
      status: 'Open',
      applicants: []
    };

    const newJob = await Job.create(jobData);
    
    // Also add to user's postedJobs array
    await User.findByIdAndUpdate(client._id, {
      $push: { postedJobs: newJob.toJSON() },
      $inc: { monthlyJobPostsCount: 1 }
    });
    
    res.status(201).json(newJob);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const { status, category, clientId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (clientId) query.clientId = clientId;

    // Fetch from Jobs collection
    const jobsFromCollection = await Job.find(query).sort({ createdAt: -1 });
    const jobIdsInCollection = new Set(jobsFromCollection.map(j => j._id.toString()));

    // Also gather legacy jobs from users' postedJobs arrays (jobs posted before Jobs collection was used)
    const usersWithJobs = await User.find({ 'postedJobs.0': { $exists: true } }).select('postedJobs fullName email');
    const legacyJobs = [];
    for (const user of usersWithJobs) {
      if (!user.postedJobs) continue;
      for (const job of user.postedJobs) {
        const jobId = job.id || (job._id ? job._id.toString() : null);
        // Skip if already in Jobs collection
        if (jobId && jobIdsInCollection.has(jobId)) continue;
        // Apply filters
        if (clientId && job.clientId !== clientId) continue;
        if (status && job.status !== status) continue;
        // Ensure required fields
        const normalizedJob = {
          id: jobId || `legacy-${Date.now()}-${Math.random()}`,
          title: job.title || 'Untitled Job',
          description: job.description || '',
          service: job.service || job.category || 'General',
          location: job.location || '',
          state: job.state || '',
          city: job.city || '',
          budget: job.budget || 0,
          budgetType: job.budgetType || 'Fixed',
          startDate: job.startDate || '',
          postedDate: job.postedDate || job.createdAt || new Date().toISOString(),
          status: job.status || 'Open',
          clientId: job.clientId || user._id.toString(),
          clientName: job.clientName || user.fullName || user.email,
          applicants: job.applicants || [],
          visibility: job.visibility || 'Subscribers Only'
        };
        legacyJobs.push(normalizedJob);
      }
    }

    // Merge: collection jobs first, then legacy jobs
    const allJobs = [
      ...jobsFromCollection.map(j => j.toJSON()),
      ...legacyJobs
    ];

    res.json(allJobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (job.clientId !== user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.jobId,
      { $set: req.body },
      { new: true }
    );

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (job.clientId !== user._id.toString() && !user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Job.findByIdAndDelete(req.params.jobId);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/jobs/:jobId/cancel', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (job.clientId !== user._id.toString() && !user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.jobId,
      { $set: { status: 'Cancelled' } },
      { new: true }
    );

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/api/jobs/:jobId/apply', authenticateToken, async (req, res) => {
  try {
    const { proposal, proposedPrice } = req.body;
    const worker = await User.findOne({ email: req.user.email });

    const workerUserTypes = ['worker', 'Worker (Individual)', 'Worker (Registered Company)'];
    if (!workerUserTypes.includes(worker.userType)) {
      return res.status(403).json({ error: 'Only workers can apply to jobs' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const alreadyApplied = job.applicants.some(
      app => app.workerId === worker._id.toString()
    );

    if (alreadyApplied) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    const application = {
      workerId: worker._id.toString(),
      workerName: worker.fullName || worker.email,
      workerEmail: worker.email,
      positionApplied: job.service || job.category || job.title || 'General',
      proposal: proposal || '',
      proposedPrice: proposedPrice ? Number(proposedPrice) : 0,
      appliedAt: new Date(),
      status: 'pending'
    };

    // Use $push with runValidators:false to avoid full document validation
    // This prevents failures on legacy jobs missing required fields
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.jobId,
      { $push: { applicants: application } },
      { new: true, runValidators: false }
    );

    // Persist appliedJobs on the worker using $addToSet to avoid duplicates
    // This is atomic and doesn't require sending the full user object from the client
    await User.findByIdAndUpdate(
      worker._id,
      { $addToSet: { appliedJobs: req.params.jobId } },
      { runValidators: false }
    );

    res.json({
      message: 'Application submitted successfully',
      job: updatedJob
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs/:jobId/applicants', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (job.clientId !== user._id.toString() && !user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Enrich applicants with full worker profile data
    const workerIds = job.applicants.map(a => a.workerId).filter(Boolean);
    const workerProfiles = await User.find({ _id: { $in: workerIds } }).select('-password');
    const profileMap = {};
    workerProfiles.forEach(w => { profileMap[w._id.toString()] = w; });

    const enrichedApplicants = job.applicants.map(applicant => {
      const profile = profileMap[applicant.workerId];
      const p = profile ? (profile.toObject ? profile.toObject() : { ...profile }) : {};
      return {
        // Application-specific fields
        workerId: applicant.workerId,
        workerName: applicant.workerName,
        workerEmail: applicant.workerEmail,
        positionApplied: applicant.positionApplied || job.service || job.category || job.title || 'General',
        proposal: applicant.proposal || '',
        proposedPrice: applicant.proposedPrice || 0,
        appliedAt: applicant.appliedAt,
        status: applicant.status || 'pending',
        // Worker profile fields mirrored as User-shape fields for the modal
        id: applicant.workerId,
        fullName: p.fullName || applicant.workerName || applicant.workerEmail,
        email: p.email || applicant.workerEmail,
        profilePicture: p.profilePicture || p.profilePhoto || null,
        bio: p.bio || null,
        services: p.services || [],
        city: p.city || null,
        state: p.state || null,
        yearsOfExperience: p.yearsOfExperience || p.experience || null,
        subscriptionTier: p.subscriptionTier || null,
        isVerified: p.isVerified || false,
        phoneNumber: p.phone || p.phoneNumber || null,
        userType: p.userType || 'worker',
        chargeHourly: p.chargeHourly || null,
        chargeDaily: p.chargeDaily || null,
      };
    });

    res.json(enrichedApplicants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/jobs/:jobId/assign', authenticateToken, async (req, res) => {
  try {
    const { workerId } = req.body;
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (job.clientId !== user._id.toString() && !user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const applicant = job.applicants.find(app => app.workerId === workerId);
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant not found' });
    }

    job.assignedWorker = {
      workerId: applicant.workerId,
      workerName: applicant.workerName,
      workerEmail: applicant.workerEmail
    };
    job.status = 'assigned';

    // Update applicant statuses
    job.applicants = job.applicants.map(app => ({
      ...app,
      status: app.workerId === workerId ? 'accepted' : 'rejected'
    }));

    await job.save();

    res.json({
      message: 'Worker assigned successfully',
      job
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHAT ROUTES ====================

app.post('/api/chats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const userId = user._id.toString();
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [userId, participantId] }
    });

    // Create new chat if it doesn't exist
    if (!chat) {
      const otherUser = await User.findById(participantId);
      if (!otherUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      chat = await Chat.create({
        participants: [userId, participantId],
        participantNames: new Map([
          [userId, user.fullName || user.email],
          [participantId, otherUser.fullName || otherUser.email]
        ]),
        messages: []
      });
    } else {
      // Backfill participantNames if missing on existing chat
      const names = chat.participantNames;
      if (!names || names.size === 0) {
        const otherUser = await User.findById(participantId);
        chat.participantNames = new Map([
          [userId, user.fullName || user.email],
          [participantId, otherUser ? (otherUser.fullName || otherUser.email) : 'Unknown User']
        ]);
        await chat.save();
      }
    }

    // Serialize to plain object
    const chatObj = chat.toObject();
    chatObj.id = chatObj._id.toString();
    delete chatObj._id;
    delete chatObj.__v;
    if (chatObj.participantNames instanceof Map) {
      chatObj.participantNames = Object.fromEntries(chatObj.participantNames);
    }

    res.json(chatObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const userId = user._id.toString();

    const blockedUserIds = (user.blockedUsers || []).map(id => id.toString());
    const allChats = await Chat.find({
      participants: userId
    }).sort({ 'lastMessage.timestamp': -1 });
    const chats = blockedUserIds.length > 0
      ? allChats.filter(chat => !chat.participants.some(p => blockedUserIds.includes(p.toString()) && p.toString() !== userId))
      : allChats;

    // Serialize chats properly, ensuring participantNames is a plain object
    const serializedChats = await Promise.all(chats.map(async (chat) => {
      // Backfill participantNames if missing
      if (!chat.participantNames || chat.participantNames.size === 0) {
        const otherParticipantId = chat.participants.find(p => p !== userId);
        if (otherParticipantId) {
          const otherUser = await User.findById(otherParticipantId);
          chat.participantNames = new Map([
            [userId, user.fullName || user.email],
            [otherParticipantId, otherUser ? (otherUser.fullName || otherUser.email) : 'Unknown User']
          ]);
          await chat.save();
        }
      }

      const chatObj = chat.toObject();
      chatObj.id = chatObj._id.toString();
      delete chatObj._id;
      delete chatObj.__v;
      // Convert Map to plain object
      if (chatObj.participantNames instanceof Map) {
        chatObj.participantNames = Object.fromEntries(chatObj.participantNames);
      }
      // Ensure participantNames is always a plain object
      if (!chatObj.participantNames || typeof chatObj.participantNames !== 'object') {
        chatObj.participantNames = {};
      }
      // Compute unread count: messages not sent by current user that are unread
      chatObj.unreadCount = (chat.messages || []).filter(
        msg => msg.senderId !== userId && !msg.read
      ).length;
      // Strip full messages array from list response (only keep lastMessage)
      delete chatObj.messages;
      return chatObj;
    }));

    res.json(serializedChats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const userId = user._id.toString();
    const otherUserId = req.params.otherUserId;

    let chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] }
    });

    if (!chat) {
      const otherUser = await User.findById(otherUserId);
      chat = await Chat.create({
        participants: [userId, otherUserId],
        participantNames: new Map([
          [userId, user.fullName || user.email],
          [otherUserId, otherUser ? (otherUser.fullName || otherUser.email) : 'Unknown User']
        ]),
        messages: [],
        lastMessage: null
      });
    } else if (!chat.participantNames || chat.participantNames.size === 0) {
      // Backfill participantNames if missing
      const otherUser = await User.findById(otherUserId);
      chat.participantNames = new Map([
        [userId, user.fullName || user.email],
        [otherUserId, otherUser ? (otherUser.fullName || otherUser.email) : 'Unknown User']
      ]);
      await chat.save();
    }

    const chatObj = chat.toObject();
    chatObj.id = chatObj._id.toString();
    delete chatObj._id;
    delete chatObj.__v;
    if (chatObj.participantNames instanceof Map) {
      chatObj.participantNames = Object.fromEntries(chatObj.participantNames);
    }

    res.json(chatObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a specific chat
app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const userId = user._id.toString();
    const chatId = req.params.chatId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify user is a participant
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return messages with proper id fields
    const messages = chat.messages.map((msg, index) => ({
      id: msg._id ? msg._id.toString() : `${chatId}-msg-${index}`,
      senderId: msg.senderId,
      senderName: msg.senderName,
      text: msg.text,
      timestamp: msg.timestamp,
      read: msg.read
    }));

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message in a specific chat
app.post('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const user = await User.findOne({ email: req.user.email });
    const userId = user._id.toString();
    const chatId = req.params.chatId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify user is a participant
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = {
      senderId: userId,
      senderName: user.fullName || user.email,
      text,
      timestamp: new Date(),
      read: false
    };

    chat.messages.push(message);
    chat.lastMessage = {
      text,
      timestamp: message.timestamp,
      senderId: userId
    };

    await chat.save();

    // Return the new message with id
    const newMessage = chat.messages[chat.messages.length - 1];
    res.json({
      id: newMessage._id ? newMessage._id.toString() : `${chatId}-msg-${chat.messages.length - 1}`,
      senderId: newMessage.senderId,
      senderName: newMessage.senderName,
      text: newMessage.text,
      timestamp: newMessage.timestamp,
      read: newMessage.read
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/chats/:chatId/read', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const userId = user._id.toString();

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    chat.messages.forEach(msg => {
      if (msg.senderId !== userId) {
        msg.read = true;
      }
    });

    await chat.save();
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Block a user
app.post('/api/users/:userId/block', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const targetId = req.params.userId;
    if (user._id.toString() === targetId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }
    user.blockedUsers = user.blockedUsers || [];
    if (!user.blockedUsers.includes(targetId)) {
      user.blockedUsers.push(targetId);
      await user.save();
    }
    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unblock a user
app.delete('/api/users/:userId/block', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const targetId = req.params.userId;
    user.blockedUsers = (user.blockedUsers || []).filter(id => id.toString() !== targetId);
    await user.save();
    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report a user
app.post('/api/users/:userId/report', authenticateToken, async (req, res) => {
  try {
    const reporter = await User.findOne({ email: req.user.email });
    const targetId = req.params.userId;
    const { reason, details } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    await Report.create({
      reporterId: reporter._id.toString(),
      reportedUserId: targetId,
      reason,
      details: details || ''
    });
    res.json({ message: 'Report submitted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEARCH ROUTES ====================

app.get('/api/search/workers', authenticateToken, async (req, res) => {
  try {
    const { service, state, city, minRating } = req.query;
    const query = {
      userType: 'worker',
      isProfileComplete: true
    };

    if (service) {
      query.services = { $in: [service] };
    }
    if (state) query.state = state;
    if (city) query.city = city;
    if (minRating) {
      query['ratings.average'] = { $gte: Number(minRating) };
    }

    const workers = await User.find(query).select('-password');
    res.json(workers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SUBSCRIPTION ROUTES ====================

app.post('/api/users/subscription/upgrade', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!plan) {
      return res.status(400).json({ error: 'Plan name is required' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.pendingSubscription = plan;
    await user.save();

    // Notify admins about the subscription request
    const admins = await User.find({ isAdmin: true }).select('_id');
    for (const admin of admins) {
      await createNotification(
        admin._id.toString(),
        'subscription',
        'New Subscription Request',
        `${user.fullName || user.email} has requested an upgrade to the ${plan} plan.`
      );
    }

    res.json(normalizeUser(user.toObject()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/subscription/receipt', authenticateToken, async (req, res) => {
  try {
    const { name, dataUrl } = req.body;
    
    if (!name || !dataUrl) {
      return res.status(400).json({ error: 'Receipt name and dataUrl are required' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.subscriptionReceipt = { name, dataUrl };
    await user.save();

    res.json(normalizeUser(user.toObject()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (!await verifyAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const totalUsers = await User.countDocuments();
    const totalWorkers = await User.countDocuments({ userType: 'worker' });
    const totalClients = await User.countDocuments({ userType: 'client' });
    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ status: 'open' });

    res.json({
      totalUsers,
      totalWorkers,
      totalClients,
      totalJobs,
      activeJobs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (!await verifyAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await User.find({}).select('-password');
    res.json(users.map(u => normalizeUser(u)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:userId', authenticateToken, async (req, res) => {
  try {
    if (!await verifyAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of super-admin
    if (user.role === 'super-admin') {
      return res.status(403).json({ error: 'Cannot delete super admin account' });
    }

    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:userId — admin updates any user's profile fields
app.put('/api/admin/users/:userId', authenticateToken, async (req, res) => {
  try {
    if (!await verifyAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Strip MongoDB system fields and immutable fields
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;
    delete updateData.id;
    delete updateData.email;   // email is the identity field — don't allow admins to change it
    delete updateData.password;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.json(normalizeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users/:userId/approve-subscription', authenticateToken, async (req, res) => {
  try {
    // Check admin permission
    if (!await verifyAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.pendingSubscription) {
      return res.status(400).json({ error: 'No pending subscription for this user' });
    }

    // Move pending subscription to active subscription
    const approvedPlan = user.pendingSubscription;
    user.subscriptionTier = user.pendingSubscription;
    user.pendingSubscription = undefined;
    user.subscriptionReceipt = undefined;

    await user.save();

    // Notify the user about subscription approval
    await createNotification(
      user._id.toString(),
      'subscription',
      'Subscription Approved!',
      `Your ${approvedPlan} subscription has been approved and is now active. Enjoy your premium features!`
    );

    res.json({ 
      message: 'Subscription approved successfully',
      user: normalizeUser(user.toObject())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FRONTEND COMPATIBILITY ALIASES ====================

// Alias: /api/auth/register -> /api/auth/signup (same verification flow)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and userType are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const role = userType === 'admin' ? 'admin' : 'user';

    const newUser = await User.create({
      email,
      password: hashedPassword,
      userType,
      role,
      isProfileComplete: false
    });

    const token = jwt.sign(
      { email: newUser.email, userType: newUser.userType, role: newUser.role, isAdmin: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: normalizeUser(newUser)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== NOTIFICATION ROUTES ====================

// GET /api/notifications - Get notifications for the logged-in user
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:id/read - Mark a single notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/notifications/send - Admin sends notification to a user or all users
app.post('/api/admin/notifications/send', authenticateToken, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || !admin.isAdmin) return res.status(403).json({ error: 'Unauthorized' });

    const { userId, type, title, message, sendToAll } = req.body;
    
    if (sendToAll) {
      const users = await User.find({}).select('_id');
      const notifications = users.map(u => ({
        userId: u._id.toString(),
        type: type || 'system',
        title,
        message
      }));
      await Notification.insertMany(notifications);
      res.json({ message: `Notification sent to ${users.length} users` });
    } else if (userId) {
      await createNotification(userId, type || 'system', title, message);
      res.json({ message: 'Notification sent' });
    } else {
      res.status(400).json({ error: 'userId or sendToAll is required' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alias: GET /api/cleaners -> GET /api/users (workers only)
// Maps MongoDB User documents to frontend Cleaner interface format
// Includes ALL workers (free-tier and paid). Priority sorting happens on the frontend.
app.get('/api/cleaners', async (req, res) => {
  try {
    const workers = await User.find({
      $or: [
        { role: 'cleaner' },
        { userType: { $in: ['worker', 'Worker (Individual)', 'Worker (Registered Company)'] } }
      ],
      isSuspended: { $ne: true }
    }).select('-password');
    
    // Map to Cleaner interface expected by frontend
    const cleaners = workers.map(w => {
      const worker = w.toObject();
      return {
        id: worker._id.toString(),
        name: worker.fullName || worker.email?.split('@')[0] || 'Unknown',
        photoUrl: worker.profilePhoto || worker.profilePicture || '',
        rating: worker.ratings?.average || 0,
        reviews: worker.ratings?.count || (worker.reviewsData?.length || 0),
        serviceTypes: (worker.services && worker.services.length > 0) ? worker.services : (worker.skillType || []),
        state: worker.state || '',
        city: worker.city || '',
        otherCity: worker.otherCity || '',
        country: worker.country || 'Nigeria',
        experience: worker.experience || worker.yearsOfExperience || 0,
        bio: worker.bio || worker.professionalExperience || '',
        isVerified: worker.isVerified || false,
        chargeHourly: worker.chargeHourly || worker.pricing?.hourly || null,
        chargeDaily: worker.chargeDaily || worker.pricing?.daily || null,
        chargePerContract: worker.chargePerContract || worker.pricing?.contract || null,
        chargePerContractNegotiable: worker.chargePerContractNegotiable || false,
        subscriptionTier: worker.subscriptionTier || 'Free',
        accountNumber: worker.accountNumber || worker.bankAccount?.accountNumber || '',
        bankName: worker.bankName || worker.bankAccount?.bankName || '',
        phoneNumber: worker.phoneNumber || worker.phone || '',
        cleanerType: worker.cleanerType || 'Individual',
        reviewsData: worker.reviewsData || worker.ratings?.reviews || [],
      };
    });
    
    res.json(cleaners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alias: GET /api/cleaners/:id -> GET /api/users/:id
app.get('/api/cleaners/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SUPPORT TICKET ROUTES ====================

// POST /api/support - create a new support ticket (authenticated users)
app.post('/api/support', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { category, subject, message } = req.body;
    if (!category || !subject || !message) {
      return res.status(400).json({ error: 'category, subject, and message are required' });
    }

    const ticket = await SupportTicket.create({
      userId: user._id.toString(),
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role || 'user',
      category,
      subject,
      message
    });
    res.status(201).json(ticket.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/support/my - get tickets for the logged-in user
app.get('/api/support/my', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tickets = await SupportTicket.find({ userId: user._id.toString() }).sort({ createdAt: -1 });
    res.json(tickets.map(t => t.toJSON()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/support - get all tickets (admin only)
app.get('/api/admin/support', authenticateToken, async (req, res) => {
  try {
    if (!await verifyAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

    const tickets = await SupportTicket.find().sort({ createdAt: -1 });
    res.json(tickets.map(t => t.toJSON()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/support/:id/resolve - resolve a ticket (admin only)
app.post('/api/admin/support/:id/resolve', authenticateToken, async (req, res) => {
  try {
    if (!await verifyAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

    const { adminResponse } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status: 'Resolved', adminResponse: adminResponse || '' },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contact form endpoint - saves as a SupportTicket so admins can see it
app.post('/api/contact', async (req, res) => {
  try {
    const { topic, name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email, and message are required' });
    }

    const fullMessage = phone ? `${message}\n\n[Phone: ${phone}]` : message;

    await SupportTicket.create({
      userId: 'guest',
      userName: name,
      userEmail: email,
      userRole: 'Guest',
      category: topic || 'Other',
      subject: topic || 'Contact Form Enquiry',
      message: fullMessage
    });

    console.log('Contact form submission saved:', { name, email, topic });
    res.json({ message: 'Thank you for contacting us. We will get back to you soon.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BOOKING ROUTES ====================

app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch bookings from Bookings collection where user is client
    const bookings = await Booking.find({ clientId: user._id.toString() }).sort({ createdAt: -1 });
    
    // Return bookings with id field mapped
    const normalizedBookings = bookings.map(b => b.toJSON());
    
    res.json(normalizedBookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { cleanerId, service, date, amount, totalAmount, paymentMethod, serviceDescription } = req.body;
    
    // Get cleaner info
    const cleaner = await User.findById(cleanerId);
    if (!cleaner) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const newBooking = await Booking.create({
      clientId: user._id.toString(),
      clientName: user.fullName || user.email,
      cleanerId,
      cleanerName: cleaner.fullName || cleaner.email,
      service,
      date,
      amount,
      totalAmount: totalAmount || amount,
      paymentMethod,
      status: 'Upcoming',
      paymentStatus: paymentMethod === 'Direct' ? 'Not Applicable' : 'Pending Payment'
    });

    const bookingObj = newBooking.toObject();
    bookingObj.id = bookingObj._id.toString();
    delete bookingObj._id;
    delete bookingObj.__v;

    // Add booking to user's bookingHistory
    await User.findByIdAndUpdate(user._id, {
      $push: { bookingHistory: bookingObj }
    });

    res.status(201).json(bookingObj);

    // Notify the worker about the new booking
    await createNotification(
      cleanerId,
      'booking',
      'New Booking Request',
      `${user.fullName || user.email} has booked you for ${service} on ${date}.${serviceDescription ? ' Job description: ' + serviceDescription : ''} Please check your Messages and respond to accept or decline.`
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings/:bookingId/cancel', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify that the user is the client who made the booking
    const user = await User.findOne({ email: req.user.email });
    if (booking.clientId !== user._id.toString()) {
      return res.status(403).json({ error: 'You can only cancel your own bookings' });
    }

    // Update booking status
    booking.status = 'Cancelled';
    await booking.save();

    // Update user's bookingHistory
    await User.findByIdAndUpdate(user._id, {
      $set: {
        bookingHistory: user.bookingHistory?.map(b => 
          (b.id === req.params.bookingId || b._id?.toString() === req.params.bookingId) 
            ? { ...b, status: 'Cancelled' } 
            : b
        )
      }
    });

    res.json(booking.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings/:bookingId/complete', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify that the user is the client who made the booking
    const user = await User.findOne({ email: req.user.email });
    if (booking.clientId !== user._id.toString()) {
      return res.status(403).json({ error: 'You can only mark your own bookings as complete' });
    }

    // Update booking status
    booking.status = 'Completed';
    booking.jobApprovedByClient = true;
    
    // If payment method is Direct, mark payment as paid
    if (booking.paymentMethod === 'Direct') {
      booking.paymentStatus = 'Paid';
    }
    
    await booking.save();

    // Update user's bookingHistory
    const updatedBooking = booking.toJSON();
    await User.findByIdAndUpdate(user._id, {
      $set: {
        bookingHistory: user.bookingHistory?.map(b => 
          (b.id === req.params.bookingId || b._id?.toString() === req.params.bookingId) 
            ? { 
                ...b, 
                status: 'Completed', 
                jobApprovedByClient: true,
                paymentStatus: booking.paymentMethod === 'Direct' ? 'Paid' : b.paymentStatus
              } 
            : b
        )
      }
    });

    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings/:bookingId/review', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify that the user is the client who made the booking
    const user = await User.findOne({ email: req.user.email });
    if (booking.clientId !== user._id.toString()) {
      return res.status(403).json({ error: 'You can only review your own bookings' });
    }

    const { rating, comment, cleanerId } = req.body;

    // Add review to the worker
    const worker = await User.findById(cleanerId || booking.cleanerId);
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const review = {
      clientId: user._id.toString(),
      clientName: user.fullName || user.email,
      rating: Number(rating),
      comment,
      date: new Date()
    };

    // Add review to worker's ratings
    if (!worker.ratings) {
      worker.ratings = { average: 0, count: 0, reviews: [] };
    }
    worker.ratings.reviews.push(review);
    worker.ratings.count = worker.ratings.reviews.length;
    worker.ratings.average = 
      worker.ratings.reviews.reduce((sum, r) => sum + r.rating, 0) / worker.ratings.count;

    await worker.save();

    // Mark booking as reviewed
    booking.reviewSubmitted = true;
    await booking.save();

    // Update user's bookingHistory
    await User.findByIdAndUpdate(user._id, {
      $set: {
        bookingHistory: user.bookingHistory?.map(b => 
          (b.id === req.params.bookingId || b._id?.toString() === req.params.bookingId) 
            ? { ...b, reviewSubmitted: true } 
            : b
        )
      }
    });

    res.json({ message: 'Review submitted successfully', rating: worker.ratings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin get all users (duplicate alias - kept for compatibility)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (!await verifyAdmin(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const users = await User.find().select('-password');
    res.json(users.map(u => normalizeUser(u)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PAYMENT GATEWAY ENDPOINTS (Paystack & Flutterwave) ====================

// ── Paystack initialize ────────────────────────────────────────────────────────────────────
app.post('/api/payment/initialize', authenticateToken, async (req, res) => {
  try {
    const { email, amount, currency = 'NGN', plan, billingCycle } = req.body;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: 'Payment gateway not configured. Please add PAYSTACK_SECRET_KEY to environment variables.' });
    }

    const reference = `SUB_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Look up the user by email to get their ID
    const user = await User.findOne({ email: req.user.email });
    const userId = user ? user._id.toString() : null;

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack expects the smallest currency unit (kobo, pesewa, cents…)
        currency: currency.toUpperCase(),  // Pass local currency so Paystack charges in the right currency
        reference,
        callback_url: req.body.callback_url || `${req.headers.origin || 'https://skillskonnect.online'}/payment/verify`,
        metadata: { plan, billingCycle, userId }
      })
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return res.status(400).json({ message: paystackData.message || 'Payment initialization failed' });
    }

    // Store pending subscription
    if (userId) {
      await User.findByIdAndUpdate(userId, { pendingSubscription: plan });
    }

    res.json({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ message: error.message || 'Payment initialization failed' });
  }
});

// ── Flutterwave initialize ─────────────────────────────────────────────────────────────────
app.post('/api/payment/initialize-flutterwave', authenticateToken, async (req, res) => {
  try {
    const { email, amount, currency = 'USD', reference, redirect_url, customer, plan, billingCycle, customizations } = req.body;
    const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!FLW_SECRET_KEY) {
      return res.status(500).json({ message: 'Flutterwave not configured. Please add FLUTTERWAVE_SECRET_KEY to environment variables.' });
    }

    const user = await User.findOne({ email: req.user.email });
    const userId = user ? user._id.toString() : null;

    // Use AbortController so we don't hang if Flutterwave is slow
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const flwResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        tx_ref: reference || `SUB_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        amount,
        currency: currency.toUpperCase(),
        payment_options: 'card,banktransfer,ussd',
        redirect_url: redirect_url || `${req.headers.origin || 'https://skillskonnect.online'}/payment/verify`,
        customer: { email: customer?.email || email, name: customer?.name || 'Customer' },
        customizations: customizations || {
          title: 'SkillsKonnect Subscription',
          description: `${plan || 'Subscription'} — ${billingCycle || 'monthly'} billing`
        },
        meta: { plan, billingCycle, userId }
      })
    });
    clearTimeout(timeout);

    const flwData = await flwResponse.json();

    if (flwData.status !== 'success') {
      return res.status(400).json({ message: flwData.message || 'Flutterwave initialization failed' });
    }

    // Store pending subscription
    if (userId && plan) {
      await User.findByIdAndUpdate(userId, { pendingSubscription: plan });
    }

    res.json({ payment_link: flwData.data.link });
  } catch (error) {
    console.error('Flutterwave initialization error:', error);
    const message = error.name === 'AbortError'
      ? 'Flutterwave is taking too long to respond. Please try again.'
      : (error.message || 'Flutterwave initialization failed');
    res.status(500).json({ message });
  }
});

// ── Flutterwave verify ─────────────────────────────────────────────────────────────────────
app.get('/api/payment/verify-flutterwave/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { tx_ref } = req.query;
    const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!FLW_SECRET_KEY) {
      return res.status(500).json({ message: 'Flutterwave not configured' });
    }

    const flwResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${FLW_SECRET_KEY}` }
    });

    const flwData = await flwResponse.json();

    if (flwData.status === 'success' && flwData.data?.status === 'successful') {
      const plan = flwData.data.meta?.plan;
      const billingCycle = flwData.data.meta?.billingCycle || 'monthly';
      const userId = flwData.data.meta?.userId;
      const amount = flwData.data.amount;

      if (plan && userId) {
        const subscriptionDate = new Date();
        const durationMs = billingCycle === 'yearly'
          ? 365 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
        const subscriptionEndDate = new Date(Date.now() + durationMs);

        await User.findByIdAndUpdate(userId, {
          subscriptionTier: plan,
          subscriptionDate,
          subscriptionEndDate,
          subscriptionAmount: amount,
          pendingSubscription: null
        });
      }

      res.json({ success: true, message: 'Payment verified and subscription activated' });
    } else {
      res.json({ success: false, message: flwData.data?.status || 'Payment not successful' });
    }
  } catch (error) {
    console.error('Flutterwave verification error:', error);
    res.status(500).json({ message: error.message || 'Flutterwave verification failed' });
  }
});

app.get('/api/payment/verify/:reference', authenticateToken, async (req, res) => {
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
      const billingCycle = paystackData.data.metadata?.billingCycle || 'monthly';
      const amount = paystackData.data.amount / 100; // Convert from kobo back to NGN
      const userId = paystackData.data.metadata?.userId;

      if (plan && userId) {
        const subscriptionDate = new Date();
        const durationMs = billingCycle === 'yearly'
          ? 365 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
        const subscriptionEndDate = new Date(Date.now() + durationMs);

        await User.findByIdAndUpdate(userId, {
          subscriptionTier: plan,
          subscriptionDate,
          subscriptionEndDate,
          subscriptionAmount: amount,
          pendingSubscription: null
        });
      }

      res.json({ success: true, message: 'Payment verified and subscription activated' });
    } else {
      res.json({ success: false, message: 'Payment not successful' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: error.message || 'Payment verification failed' });
  }
});

// ==================== PAYMENT WEBHOOKS ====================

// Paystack webhook — receives server-to-server payment notifications
app.post('/api/payment/webhook', async (req, res) => {
  try {
    // Verify webhook signature
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const data = event.data;
      const plan = data.metadata?.plan;
      const billingCycle = data.metadata?.billingCycle || 'monthly';
      const userId = data.metadata?.userId;
      const amount = data.amount / 100;

      if (plan && userId) {
        const subscriptionDate = new Date();
        const durationMs = billingCycle === 'yearly'
          ? 365 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
        const subscriptionEndDate = new Date(Date.now() + durationMs);

        await User.findByIdAndUpdate(userId, {
          subscriptionTier: plan,
          subscriptionDate,
          subscriptionEndDate,
          subscriptionAmount: amount,
          pendingSubscription: null
        });
        console.log(`Webhook: Subscription activated for user ${userId} — ${plan} (${billingCycle})`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ received: true }); // Always return 200 so Paystack doesn't retry
  }
});

// ==================== SYSTEM NOTIFICATION JOBS ====================

async function sendSystemNotifications() {
  try {
    const now = new Date();
    const allUsers = await User.find({ isAdmin: { $ne: true } });

    for (const u of allUsers) {
      const uid = u._id.toString();

      // --- 1. Nudge un-subscribed / free-tier users ---
      const isFree = !u.subscriptionTier || u.subscriptionTier === 'Free';
      if (isFree) {
        // Only send this nudge once every 3 days to avoid spam
        const recent = await Notification.findOne({
          userId: uid,
          type: 'subscription',
          title: { $regex: /upgrade/i },
          createdAt: { $gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }
        });
        if (!recent) {
          const isWorker = u.role === 'cleaner' || (u.userType || '').toLowerCase().includes('worker');
          await createNotification(
            uid, 'subscription',
            '🚀 Upgrade Your Plan',
            isWorker
              ? 'You are currently on the Free plan. Upgrade now to receive more client bookings, appear higher in search results, and grow your business.'
              : 'You are on the Free plan. Upgrade to post more jobs, access verified workers, and unlock premium client features.'
          );
        }
      }

      // --- 2. Subscription expiring in 7 days ---
      if (u.subscriptionEndDate && u.subscriptionTier && u.subscriptionTier !== 'Free') {
        const endDate = new Date(u.subscriptionEndDate);
        const msLeft = endDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
          const alreadySent = await Notification.findOne({
            userId: uid,
            type: 'subscription',
            title: { $regex: /expir/i },
            createdAt: { $gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) } // within 20h
          });
          if (!alreadySent) {
            await createNotification(
              uid, 'subscription',
              `⚠️ Subscription Expiring in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`,
              `Your ${u.subscriptionTier} subscription expires on ${endDate.toLocaleDateString()}. Renew now to avoid service interruption and keep all your premium benefits.`
            );
          }
        }
        // --- 3. Subscription just expired ---
        if (daysLeft <= 0 && daysLeft >= -1) {
          const alreadySent = await Notification.findOne({
            userId: uid,
            type: 'subscription',
            title: { $regex: /expired/i },
            createdAt: { $gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) }
          });
          if (!alreadySent) {
            await createNotification(
              uid, 'subscription',
              '❌ Subscription Expired',
              `Your ${u.subscriptionTier} subscription has expired. Your account has been moved to the Free plan. Renew now to restore your premium features.`
            );
          }
        }
      }

      // --- 4. Profile incomplete reminder ---
      const profileIncomplete = !u.phoneNumber || !u.country || !u.userType;
      if (profileIncomplete) {
        const recentProfileNote = await Notification.findOne({
          userId: uid,
          type: 'system',
          title: { $regex: /profile/i },
          createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        });
        if (!recentProfileNote) {
          await createNotification(
            uid, 'system',
            '📝 Complete Your Profile',
            'Your profile is incomplete. A complete profile helps clients find you faster and builds trust. Head to your dashboard to fill in the missing details.'
          );
        }
      }

      // --- 5. Unverified worker reminder ---
      const isWorkerUser = u.role === 'cleaner' || (u.userType || '').toLowerCase().includes('worker');
      if (isWorkerUser && !u.isVerified) {
        const recentVerifyNote = await Notification.findOne({
          userId: uid,
          type: 'verification',
          createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        });
        if (!recentVerifyNote) {
          await createNotification(
            uid, 'verification',
            '✅ Get Verified Today',
            'Verified workers get 3× more bookings and appear with a trust badge. Upload your documents in the Verification tab of your dashboard.'
          );
        }
      }
    }
    console.log(`[SystemNotifications] Processed ${allUsers.length} users at ${now.toISOString()}`);
  } catch (err) {
    console.error('[SystemNotifications] Error:', err.message);
  }
}

// Run system notifications only in persistent server environments (not Vercel serverless)
if (!process.env.VERCEL) {
  setTimeout(() => {
    sendSystemNotifications();
    setInterval(sendSystemNotifications, 12 * 60 * 60 * 1000);
  }, 10000);
}

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ==================== START SERVER ====================

// Export the Express app for Vercel serverless runtime
export default app;

// Only start a standalone HTTP server when NOT running on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
  });
}
