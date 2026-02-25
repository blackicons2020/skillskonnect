import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
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
  origin: process.env.CORS_ORIGIN || '*',
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
  
  // Subscription
  subscriptionTier: String,
  pendingSubscription: String,
  subscriptionReceipt: mongoose.Schema.Types.Mixed,
  subscriptionEndDate: String,
  trialStartDate: String,
  trialEndDate: String,
  
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
  status: { type: String, default: 'Open', enum: ['Open', 'In Progress', 'Completed', 'Cancelled', 'open', 'assigned', 'closed'] },
  visibility: { type: String, default: 'Subscribers Only', enum: ['Public', 'Subscribers Only'] },
  requirements: [String],
  selectedWorkerId: String,
  applicants: [{
    workerId: String,
    workerName: String,
    workerEmail: String,
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

// Create models
const User = mongoose.model('User', UserSchema);
const Job = mongoose.model('Job', JobSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Chat = mongoose.model('Chat', ChatSchema);

// ==================== MONGODB CONNECTION ====================

mongoose.connect(MONGO_URL)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Create super admin if doesn't exist
    try {
      const adminEmail = 'superadmin@skillskonnect.ng';
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
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
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
    if (userObj.userType === 'client') userObj.role = 'client';
    else if (userObj.userType === 'worker') userObj.role = 'cleaner';
  }
  // Add isAdmin flag - check both role and userType for admin status
  userObj.isAdmin = ['admin', 'super-admin'].includes(userObj.role) || userObj.userType === 'admin';
  // Remove sensitive fields
  delete userObj.password;
  delete userObj.__v;
  return userObj;
}

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      userType: user.userType,
      role: user.role
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
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = userType === 'admin' ? 'admin' : 'user';

    const newUser = await User.create({
      email,
      password: hashedPassword,
      userType,
      role,
      isProfileComplete: false
    });

    const token = jwt.sign(
      { email: newUser.email, userType: newUser.userType },
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
      { email: user.email, userType: user.userType },
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

    // Auto-set isProfileComplete to true when required fields are present
    const user = await User.findOne({ email: req.user.email });
    if (user && updateData.fullName && updateData.phoneNumber && updateData.country) {
      if (user.userType === 'worker') {
        // Worker needs: services, experience/pricing
        if (updateData.services && updateData.services.length > 0 && 
           (updateData.chargeHourly || updateData.chargeDaily || updateData.chargePerContract)) {
          updateData.isProfileComplete = true;
        }
      } else if (user.userType === 'client') {
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
    if (job.clientId !== user._id.toString() && req.user.role !== 'admin') {
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
    if (job.clientId !== user._id.toString() && req.user.role !== 'admin') {
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

    if (worker.userType !== 'worker') {
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
      proposal,
      proposedPrice: Number(proposedPrice),
      appliedAt: new Date(),
      status: 'pending'
    };

    job.applicants.push(application);
    await job.save();

    res.json({
      message: 'Application submitted successfully',
      job
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
    if (job.clientId !== user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(job.applicants);
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
    if (job.clientId !== user._id.toString() && req.user.role !== 'admin') {
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

    const chats = await Chat.find({
      participants: userId
    }).sort({ 'lastMessage.timestamp': -1 });

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
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
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
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
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
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
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

app.post('/api/admin/users/:userId/approve-subscription', authenticateToken, async (req, res) => {
  try {
    // Check admin permission
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
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
    user.subscriptionTier = user.pendingSubscription;
    user.pendingSubscription = undefined;
    user.subscriptionReceipt = undefined;

    await user.save();

    res.json({ 
      message: 'Subscription approved successfully',
      user: normalizeUser(user.toObject())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FRONTEND COMPATIBILITY ALIASES ====================

// Alias: /api/auth/register -> /api/auth/signup
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and userType are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = userType === 'admin' ? 'admin' : 'user';

    const newUser = await User.create({
      email,
      password: hashedPassword,
      userType,
      role,
      isProfileComplete: false
    });

    const token = jwt.sign(
      { email: newUser.email, userType: newUser.userType },
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

// Alias: GET /api/cleaners -> GET /api/users (workers only)
// Maps MongoDB User documents to frontend Cleaner interface format
app.get('/api/cleaners', async (req, res) => {
  try {
    const workers = await User.find({ userType: 'worker', isProfileComplete: true }).select('-password');
    
    // Map to Cleaner interface expected by frontend
    const cleaners = workers.map(w => {
      const worker = w.toObject();
      return {
        id: worker._id.toString(),
        name: worker.fullName || worker.email?.split('@')[0] || 'Unknown',
        photoUrl: worker.profilePhoto || worker.profilePicture || '',
        rating: worker.ratings?.average || 0,
        reviews: worker.ratings?.count || (worker.reviewsData?.length || 0),
        serviceTypes: worker.services || worker.skillType || [],
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

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    // Just log and return success - can be enhanced later
    console.log('Contact form submission:', req.body);
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

    const { cleanerId, service, date, amount, totalAmount, paymentMethod } = req.body;
    
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

// Admin get all users
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
});
