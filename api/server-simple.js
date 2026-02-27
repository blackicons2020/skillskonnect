import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// In-memory storage (for development without database)
const users = new Map();
const bookings = new Map();
const chats = new Map();
const messages = new Map();
const reviews = new Map();

// Data persistence utilities
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  bookings: path.join(DATA_DIR, 'bookings.json'),
  chats: path.join(DATA_DIR, 'chats.json'),
  messages: path.join(DATA_DIR, 'messages.json'),
  reviews: path.join(DATA_DIR, 'reviews.json')
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load data from files
const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILES.users)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILES.users, 'utf8'));
      data.forEach(([key, value]) => users.set(key, value));
      console.log(`✓ Loaded ${users.size} users from storage`);
    }
    if (fs.existsSync(DATA_FILES.bookings)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILES.bookings, 'utf8'));
      data.forEach(([key, value]) => bookings.set(key, value));
      console.log(`✓ Loaded ${bookings.size} bookings from storage`);
    }
    if (fs.existsSync(DATA_FILES.chats)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILES.chats, 'utf8'));
      data.forEach(([key, value]) => chats.set(key, value));
      console.log(`✓ Loaded ${chats.size} chats from storage`);
    }
    if (fs.existsSync(DATA_FILES.messages)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILES.messages, 'utf8'));
      data.forEach(([key, value]) => messages.set(key, value));
      console.log(`✓ Loaded ${messages.size} messages from storage`);
    }
    if (fs.existsSync(DATA_FILES.reviews)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILES.reviews, 'utf8'));
      data.forEach(([key, value]) => reviews.set(key, value));
      console.log(`✓ Loaded ${reviews.size} reviews from storage`);
    }
  } catch (error) {
    console.error('Error loading data:', error.message);
  }
};

// Save data to files
const saveData = () => {
  try {
    fs.writeFileSync(DATA_FILES.users, JSON.stringify([...users]), 'utf8');
    fs.writeFileSync(DATA_FILES.bookings, JSON.stringify([...bookings]), 'utf8');
    fs.writeFileSync(DATA_FILES.chats, JSON.stringify([...chats]), 'utf8');
    fs.writeFileSync(DATA_FILES.messages, JSON.stringify([...messages]), 'utf8');
    fs.writeFileSync(DATA_FILES.reviews, JSON.stringify([...reviews]), 'utf8');
  } catch (error) {
    console.error('Error saving data:', error.message);
  }
};

// Auto-save every 30 seconds
setInterval(saveData, 30000);

// Save data on process exit
process.on('SIGINT', () => {
  console.log('\nSaving data before exit...');
  saveData();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('\nSaving data before exit...');
  saveData();
  process.exit();
});

// Seed admin users on startup
const seedAdmins = async () => {
  const admins = [
    { email: 'superadmin@skillskonnect.online', name: 'Super Admin', role: 'Super', password: 'SuperAdmin@2026!' }
  ];

  for (const admin of admins) {
    // Check if admin already exists
    let adminExists = false;
    for (const [id, user] of users) {
      if (user.email === admin.email) {
        adminExists = true;
        break;
      }
    }
    
    if (adminExists) {
      console.log(`Admin ${admin.email} already exists, skipping...`);
      continue;
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(admin.password, salt);
    
    const id = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const adminUser = {
      id,
      email: admin.email,
      password: hashedPassword,
      role: 'admin',
      fullName: admin.name,
      phoneNumber: '0000000000',
      gender: 'Male',
      state: '',
      city: '',
      address: '',
      isAdmin: true,
      adminRole: admin.role,
      subscriptionTier: 'Premium',
      bookingHistory: [],
      services: [],
      isSuspended: false,
      createdAt: new Date().toISOString()
    };

    users.set(id, adminUser);
    console.log(`✓ Created admin account: ${admin.email}`);
  }
  saveData();
};

// Utility functions
const generateToken = (id, role, isAdmin, adminRole) => {
  return jwt.sign({ id, role, isAdmin, adminRole }, JWT_SECRET, { expiresIn: '30d' });
};

// Middleware
const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'client', gender = 'Male' } = req.body;
    
    // Check if user exists
    for (const [id, user] of users) {
      if (user.email === email) {
        return res.status(400).json({ message: 'User already exists' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser = {
      id,
      email,
      password: hashedPassword,
      role: role || 'client',
      fullName: '',
      phoneNumber: '',
      gender: gender || 'Male',
      state: '',
      city: '',
      address: '',
      isAdmin: false,
      subscriptionTier: 'Free',
      bookingHistory: [],
      services: [],
      isSuspended: false,
      createdAt: new Date().toISOString()
    };

    users.set(id, newUser);
    saveData();

    const userData = { ...newUser };
    delete userData.password;

    res.status(201).json({
      ...userData,
      token: generateToken(id, newUser.role, false, null)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    let foundUser = null;
    for (const [id, user] of users) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (foundUser.isSuspended) {
      return res.status(403).json({ message: 'Account is suspended.' });
    }

    const userData = { ...foundUser };
    delete userData.password;

    res.json({
      token: generateToken(foundUser.id, foundUser.role, foundUser.isAdmin || false, foundUser.adminRole),
      user: userData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// USER ROUTES
app.get('/api/users/me', protect, (req, res) => {
  try {
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = { ...user };
    delete userData.password;
    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/me', protect, (req, res) => {
  try {
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'password' && key !== 'email') {
        user[key] = updates[key];
      }
    });
    
    // Auto-set role based on userType
    if (updates.userType) {
      if (updates.userType.includes('Client')) {
        user.role = 'client';
      } else if (updates.userType.includes('Worker')) {
        user.role = 'cleaner';
      }
    }

    users.set(req.user.id, user);
    saveData();

    const userData = { ...user };
    delete userData.password;
    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CLEANERS ROUTE
app.get('/api/cleaners', (req, res) => {
  try {
    const cleaners = [];
    for (const [id, user] of users) {
      if (user.role === 'cleaner' && !user.isSuspended) {
        cleaners.push({
          id: user.id,
          name: user.fullName || 'Unnamed Cleaner',
          photoUrl: user.profilePhoto || 'https://avatar.iran.liara.run/public',
          rating: 5.0,
          reviews: 0,
          serviceTypes: user.services || [],
          state: user.state || '',
          city: user.city || '',
          otherCity: user.otherCity || '',
          experience: user.experience || 0,
          bio: user.bio || '',
          isVerified: user.isVerified || false,
          chargeHourly: user.chargeHourly,
          chargeDaily: user.chargeDaily,
          chargePerContract: user.chargePerContract,
          chargePerContractNegotiable: user.chargePerContractNegotiable,
          subscriptionTier: user.subscriptionTier || 'Free',
          cleanerType: user.cleanerType
        });
      }
    }
    res.json(cleaners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// JOBS ROUTE - Get all open jobs posted by clients
app.get('/api/jobs', (req, res) => {
  try {
    const jobs = [];
    for (const [id, user] of users) {
      if (user.role === 'client' && user.postedJobs) {
        // Only include open jobs
        const openJobs = user.postedJobs.filter(job => job.status === 'Open');
        jobs.push(...openJobs);
      }
    }
    // Sort by posted date, newest first
    jobs.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a job
app.put('/api/jobs/:jobId', protect, (req, res) => {
  try {
    const { jobId } = req.params;
    const updates = req.body;
    const user = users.get(req.user.id);
    
    if (!user || !user.postedJobs) {
      return res.status(404).json({ message: 'User or jobs not found' });
    }
    
    const jobIndex = user.postedJobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Verify ownership
    if (user.postedJobs[jobIndex].clientId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this job' });
    }
    
    // Update the job
    user.postedJobs[jobIndex] = {
      ...user.postedJobs[jobIndex],
      ...updates,
      id: jobId, // Preserve original ID
      clientId: req.user.id, // Preserve ownership
      postedDate: user.postedJobs[jobIndex].postedDate // Preserve original date
    };
    
    users.set(req.user.id, user);
    saveData();
    
    res.json(user.postedJobs[jobIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel a job
app.put('/api/jobs/:jobId/cancel', protect, (req, res) => {
  try {
    const { jobId } = req.params;
    const user = users.get(req.user.id);
    
    if (!user || !user.postedJobs) {
      return res.status(404).json({ message: 'User or jobs not found' });
    }
    
    const jobIndex = user.postedJobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Verify ownership
    if (user.postedJobs[jobIndex].clientId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this job' });
    }
    
    // Update status to Cancelled
    user.postedJobs[jobIndex].status = 'Cancelled';
    
    users.set(req.user.id, user);
    saveData();
    
    res.json(user.postedJobs[jobIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a job
app.delete('/api/jobs/:jobId', protect, (req, res) => {
  try {
    const { jobId } = req.params;
    const user = users.get(req.user.id);
    
    if (!user || !user.postedJobs) {
      return res.status(404).json({ message: 'User or jobs not found' });
    }
    
    const jobIndex = user.postedJobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Verify ownership
    if (user.postedJobs[jobIndex].clientId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }
    
    // Remove the job
    user.postedJobs.splice(jobIndex, 1);
    
    users.set(req.user.id, user);
    saveData();
    
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get job applicants (for clients to view who applied to their jobs)
app.get('/api/jobs/:jobId/applicants', protect, (req, res) => {
  try {
    const { jobId } = req.params;
    const user = users.get(req.user.id);
    
    if (!user || !user.postedJobs) {
      return res.status(404).json({ message: 'User or jobs not found' });
    }
    
    // Find the job
    const job = user.postedJobs.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Verify ownership
    if (job.clientId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view applicants for this job' });
    }
    
    // Get applicant details (limited info for privacy)
    const applicants = [];
    if (job.applicants) {
      for (const applicantId of job.applicants) {
        const applicant = users.get(applicantId);
        if (applicant) {
          applicants.push({
            id: applicant.id,
            fullName: applicant.fullName,
            email: applicant.email,
            phoneNumber: applicant.phoneNumber,
            profilePicture: applicant.profilePicture,
            userType: applicant.userType,
            services: applicant.services,
            bio: applicant.bio,
            city: applicant.city,
            state: applicant.state,
            yearsOfExperience: applicant.yearsOfExperience,
            isVerified: applicant.isVerified,
            subscriptionTier: applicant.subscriptionTier,
            chargeHourly: applicant.chargeHourly,
            chargeDaily: applicant.chargeDaily,
            chargePerContract: applicant.chargePerContract
          });
        }
      }
    }
    
    res.json(applicants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Apply to a job (for workers)
app.post('/api/jobs/:jobId/apply', protect, (req, res) => {
  try {
    const { jobId } = req.params;
    const workerId = req.user.id;

    // Find the client who posted this job
    let clientUser = null;
    let jobFound = null;
    let jobIndex = -1;

    for (const [userId, user] of users.entries()) {
      if (user.postedJobs && Array.isArray(user.postedJobs)) {
        jobIndex = user.postedJobs.findIndex(j => j.id === jobId);
        if (jobIndex !== -1) {
          clientUser = user;
          jobFound = user.postedJobs[jobIndex];
          break;
        }
      }
    }

    if (!jobFound) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (jobFound.status !== 'Open') {
      return res.status(400).json({ message: 'This job is no longer accepting applications' });
    }

    // Initialize applicants array if it doesn't exist
    if (!jobFound.applicants) {
      jobFound.applicants = [];
    }

    // Check if worker already applied
    if (jobFound.applicants.includes(workerId)) {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }

    // Add worker to job's applicants
    jobFound.applicants.push(workerId);
    clientUser.postedJobs[jobIndex] = jobFound;

    // Update worker's appliedJobs array
    const worker = users.get(workerId);
    if (worker) {
      if (!worker.appliedJobs) {
        worker.appliedJobs = [];
      }
      if (!worker.appliedJobs.includes(jobId)) {
        worker.appliedJobs.push(jobId);
      }
    }

    saveData(); // Persist changes

    res.json({ 
      message: 'Application submitted successfully',
      job: jobFound
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// BOOKINGS ROUTES
app.post('/api/bookings', protect, (req, res) => {
  try {
    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const booking = {
      id: bookingId,
      clientId: req.user.id,
      ...req.body,
      status: 'Upcoming',
      createdAt: new Date().toISOString()
    };
    
    bookings.set(bookingId, booking);
    
    // Update user's booking history
    const user = users.get(req.user.id);
    if (user) {
      user.bookingHistory = user.bookingHistory || [];
      user.bookingHistory.push(booking);
      users.set(req.user.id, user);
    }
    
    saveData();

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CHATS ROUTES
app.post('/api/chats', protect, (req, res) => {
  try {
    const { participantId, participantName, currentUserName } = req.body;
    
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const chat = {
      id: chatId,
      participants: [req.user.id, participantId],
      participantNames: {
        [req.user.id]: currentUserName,
        [participantId]: participantName
      },
      updatedAt: new Date().toISOString()
    };
    
    chats.set(chatId, chat);
    saveData();
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/chats', protect, (req, res) => {
  try {
    const userChats = [];
    for (const [id, chat] of chats) {
      if (chat.participants.includes(req.user.id)) {
        // Add lastMessage to each chat
        const chatMessages = [];
        for (const [msgId, msg] of messages) {
          if (msg.chatId === id) {
            chatMessages.push(msg);
          }
        }
        chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const lastMessage = chatMessages[chatMessages.length - 1] || null;
        
        userChats.push({
          ...chat,
          lastMessage: lastMessage
        });
      }
    }
    res.json(userChats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages for a specific chat
app.get('/api/chats/:chatId/messages', protect, (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = chats.get(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Verify user is part of this chat
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view this chat' });
    }
    
    // Get all messages for this chat
    const chatMessages = [];
    for (const [msgId, msg] of messages) {
      if (msg.chatId === chatId) {
        chatMessages.push(msg);
      }
    }
    
    // Sort by timestamp
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json(chatMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a message in a chat
app.post('/api/chats/:chatId/messages', protect, (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    const chat = chats.get(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Verify user is part of this chat
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      id: messageId,
      chatId: chatId,
      senderId: req.user.id,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    
    messages.set(messageId, message);
    
    // Update chat's updatedAt
    chat.updatedAt = message.timestamp;
    chats.set(chatId, chat);
    
    saveData();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PAYMENT ROUTES
app.post('/api/payment/initialize', protect, async (req, res) => {
  try {
    const { amount, email, plan, billingCycle } = req.body;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY === 'sk_test_your_paystack_secret_key_here') {
      return res.status(400).json({ 
        message: 'Payment gateway not configured. Please add PAYSTACK_SECRET_KEY to .env file' 
      });
    }

    // Generate reference
    const reference = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        amount: Math.round(amount * 100), // Convert to kobo
        reference: reference,
        callback_url: `${req.headers.origin || 'http://localhost:3000'}/payment/verify`,
        metadata: {
          plan: plan,
          billingCycle: billingCycle,
          userId: req.user.id,
          userEmail: email
        }
      })
    });

    const result = await paystackResponse.json();
    
    if (!result.status) {
      return res.status(400).json({ 
        message: result.message || 'Payment initialization failed' 
      });
    }

    res.json({
      authorization_url: result.data.authorization_url,
      access_code: result.data.access_code,
      reference: result.data.reference
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/payment/verify/:reference', protect, async (req, res) => {
  try {
    const { reference } = req.params;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY === 'sk_test_your_paystack_secret_key_here') {
      return res.status(400).json({ 
        message: 'Payment gateway not configured' 
      });
    }

    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    const result = await paystackResponse.json();
    
    if (result.status && result.data.status === 'success') {
      // Update user subscription
      const user = users.get(req.user.id);
      if (user && result.data.metadata.plan) {
        user.subscriptionTier = result.data.metadata.plan;
        user.pendingSubscription = undefined;
        users.set(req.user.id, user);
        saveData();
      }

      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ADMIN ROUTES
app.get('/api/admin/users', protect, (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const allUsers = [];
    for (const [id, user] of users) {
      const userData = { ...user };
      delete userData.password;
      allUsers.push(userData);
    }
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start server
app.listen(PORT, async () => {
  loadData();
  
  // Always check and seed admins if they don't exist
  await seedAdmins();
  
  console.log(`\n🚀 Skills Konnect API Server running on http://localhost:${PORT}`);
  console.log(`💾 Data persistence enabled - changes are auto-saved`);
  console.log(`📊 Current data: ${users.size} users, ${bookings.size} bookings, ${chats.size} chats\n`);
  console.log(`👤 Admin Login Credentials:`);
  console.log(`   Email: superadmin@skillskonnect.online`);
  console.log(`   Password: SuperAdmin@2026!\n`);
});
