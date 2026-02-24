import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function fixExistingProfiles() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('\n✅ Connected to MongoDB\n');

    // Find workers with complete data but isProfileComplete = false
    const workersToFix = await User.find({ 
      userType: 'worker',
      $or: [
        { isProfileComplete: false },
        { isProfileComplete: { $exists: false } }
      ],
      fullName: { $exists: true, $ne: '' },
      phoneNumber: { $exists: true, $ne: '' },
      services: { $exists: true, $ne: [] }
    });

    console.log(`Found ${workersToFix.length} workers to fix\n`);

    for (const worker of workersToFix) {
      const hasPrice = worker.chargeHourly || worker.chargeDaily || worker.chargePerContract;
      if (hasPrice) {
        console.log(`✓ Fixing: ${worker.email} - ${worker.fullName}`);
        await User.findByIdAndUpdate(
          worker._id,
          { $set: { isProfileComplete: true } }
        );
      }
    }

    // Find clients with complete data but isProfileComplete = false
    const clientsToFix = await User.find({ 
      userType: 'client',
      $or: [
        { isProfileComplete: false },
        { isProfileComplete: { $exists: false } }
      ],
      fullName: { $exists: true, $ne: '' },
      phoneNumber: { $exists: true, $ne: '' }
    });

    console.log(`\nFound ${clientsToFix.length} clients to fix\n`);

    for (const client of clientsToFix) {
      console.log(`✓ Fixing: ${client.email} - ${client.fullName}`);
      await User.findByIdAndUpdate(
        client._id,
        { $set: { isProfileComplete: true } }
      );
    }

    // Show results
    const completedWorkers = await User.countDocuments({ userType: 'worker', isProfileComplete: true });
    const completedClients = await User.countDocuments({ userType: 'client', isProfileComplete: true });

    console.log(`\n📊 RESULTS:`);
    console.log(`   Completed Workers: ${completedWorkers}`);
    console.log(`   Completed Clients: ${completedClients}\n`);

    await mongoose.disconnect();
    console.log('✅ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

fixExistingProfiles();
