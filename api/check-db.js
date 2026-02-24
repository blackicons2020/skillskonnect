import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function checkDatabase() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('\n✅ Connected to MongoDB\n');

    const allUsers = await User.find({});
    console.log(`📊 Total users in database: ${allUsers.length}\n`);

    const workers = await User.find({ userType: 'worker' });
    console.log(`👷 Total workers: ${workers.length}`);

    const completedWorkers = await User.find({ userType: 'worker', isProfileComplete: true });
    console.log(`✓ Workers with completed profiles: ${completedWorkers.length}\n`);

    const clients = await User.find({ userType: 'client' });
    console.log(`👤 Total clients: ${clients.length}`);

    const completedClients = await User.find({ userType: 'client', isProfileComplete: true });
    console.log(`✓ Clients with completed profiles: ${completedClients.length}\n`);

    if (workers.length > 0) {
      console.log('📋 Worker Details:');
      workers.forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.email || 'No email'} - Completed: ${w.isProfileComplete || false} - Name: ${w.fullName || 'Not set'}`);
      });
      console.log('');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

checkDatabase();
