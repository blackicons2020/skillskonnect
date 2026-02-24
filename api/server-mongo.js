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
app.use(express.json());

// ==================== MONGOOSE SCHEMAS ====================

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, required: true },
  role: { type: String, default: 'user' },
  isProfileComplete: { type: Boolean, default: false },
  fullName: String,
  phone: String,
  state: String,
  city: String,
  address: String,
  profilePhoto: String,
  businessName: String,
  businessRegistrationNumber: String,
  businessEmail: String,
  businessPhone: String,
  businessAddress: String,
  services: [String],
  experience: Number,
  bio: String,
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
  },
  subscriptionEndDate: Date
}, { timestamps: true });

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  budget: Number,
  location: String,
  clientId: { type: String, required: true },
  clientName: String,
  clientEmail: String,
  status: { type: String, default: 'open' },
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

const ChatSchema = new mongoose.Schema({
  participants: [String],
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

// Create models
const User = mongoose.model('User', UserSchema);
const Job = mongoose.model('Job', JobSchema);
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
          isProfileComplete: true
        });
        console.log('✅ Super admin account created');
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

// Helper to normalize user data for frontend compatibility
function normalizeUser(user) {
  const userObj = user.toObject ? user.toObject() : { ...user };
  // Map _id to id
  if (userObj._id) {
    userObj.id = userObj._id.toString();
  }
  // Map userType to role for frontend compatibility
  if (userObj.role === 'user' || !userObj.role) {
    if (userObj.userType === 'client') userObj.role = 'client';
    else if (userObj.userType === 'worker') userObj.role = 'cleaner';
  }
  // Add isAdmin flag
  userObj.isAdmin = ['admin', 'super-admin'].includes(userObj.role);
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
      user: {
        email: newUser.email,
        userType: newUser.userType,
        role: newUser.role,
        isProfileComplete: newUser.isProfileComplete
      }
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
    delete updateData.email;
    delete updateData.password;

    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: updateData },
      { new: true }
    );

    res.json(normalizeUser(user));
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
      ...req.body,
      clientId: client._id.toString(),
      clientName: client.fullName || client.email,
      clientEmail: client.email,
      status: 'open'
    };

    const newJob = await Job.create(jobData);
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

    const jobs = await Job.find(query).sort({ createdAt: -1 });
    res.json(jobs);
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

app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const userId = user._id.toString();

    const chats = await Chat.find({
      participants: userId
    }).sort({ 'lastMessage.timestamp': -1 });

    res.json(chats);
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
      chat = await Chat.create({
        participants: [userId, otherUserId],
        messages: [],
        lastMessage: null
      });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chats/:otherUserId/messages', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const user = await User.findOne({ email: req.user.email });
    const userId = user._id.toString();
    const otherUserId = req.params.otherUserId;

    let chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] }
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [userId, otherUserId],
        messages: [],
        lastMessage: null
      });
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

    res.json({
      message: 'Message sent',
      chat
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
app.get('/api/cleaners', async (req, res) => {
  try {
    const workers = await User.find({ userType: 'worker', isProfileComplete: true }).select('-password');
    res.json(workers);
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

// Bookings endpoint (maps to jobs)
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const newJob = await Job.create({
      ...req.body,
      clientId: req.user.userId,
      status: 'open'
    });
    res.status(201).json(newJob);
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
