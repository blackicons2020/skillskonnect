import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const setupDatabase = async () => {
  console.log('🚀 Setting up CleanConnect database...\n');

  // Try different authentication methods
  const passwords = [
    process.env.DB_PASSWORD,
    '',
    'postgres',
    'admin',
    'root'
  ];

  let defaultPool = null;
  let connected = false;
  let workingPassword = '';

  for (const password of passwords) {
    try {
      console.log(`Trying to connect${password ? ' with password...' : ' without password...'}`);
      defaultPool = new pg.Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: password || undefined,
        port: 5432,
      });
      
      // Test the connection
      await defaultPool.query('SELECT 1');
      console.log('✅ Connected to PostgreSQL!\n');
      connected = true;
      workingPassword = password;
      break;
    } catch (error) {
      if (defaultPool) await defaultPool.end();
      continue;
    }
  }

  if (!connected) {
    console.error('❌ Could not connect to PostgreSQL with any known password.');
    console.error('Please update DB_PASSWORD in your .env file with your PostgreSQL password.\n');
    process.exit(1);
  }

  try {
    // Check if database exists
    const dbCheck = await defaultPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'cleanconnect'"
    );

    if (dbCheck.rows.length === 0) {
      console.log('📦 Creating cleanconnect database...');
      await defaultPool.query('CREATE DATABASE cleanconnect');
      console.log('✅ Database created successfully!\n');
    } else {
      console.log('✅ Database already exists\n');
    }
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    process.exit(1);
  } finally {
    await defaultPool.end();
  }

  // Now connect to the cleanconnect database to create tables
  // Use the same authentication that worked above
  const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'cleanconnect',
    password: workingPassword || undefined,
    port: 5432,
  });

  try {
    console.log('📝 Creating tables...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        phone_number VARCHAR(20),
        gender VARCHAR(20) DEFAULT 'Male',
        role VARCHAR(20) NOT NULL DEFAULT 'client',
        state VARCHAR(100),
        city VARCHAR(100),
        other_city VARCHAR(100),
        address TEXT,
        client_type VARCHAR(20),
        cleaner_type VARCHAR(20),
        company_name VARCHAR(100),
        company_address TEXT,
        experience INTEGER,
        services JSONB,
        bio TEXT,
        charge_hourly DECIMAL(10, 2),
        charge_daily DECIMAL(10, 2),
        charge_per_contract DECIMAL(10, 2),
        charge_per_contract_negotiable BOOLEAN DEFAULT false,
        bank_name VARCHAR(100),
        account_number VARCHAR(20),
        profile_photo TEXT,
        government_id TEXT,
        business_reg_doc TEXT,
        subscription_tier VARCHAR(20) DEFAULT 'Free',
        pending_subscription VARCHAR(20),
        subscription_receipt JSONB,
        subscription_end_date DATE,
        monthly_new_clients_ids JSONB,
        monthly_usage_reset_date DATE,
        is_admin BOOLEAN DEFAULT false,
        admin_role VARCHAR(50),
        is_suspended BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES users(id) ON DELETE CASCADE,
        cleaner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        service VARCHAR(100) NOT NULL,
        date VARCHAR(50),
        amount DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2),
        status VARCHAR(20) DEFAULT 'Upcoming',
        payment_method VARCHAR(20),
        payment_status VARCHAR(50) DEFAULT 'Pending Payment',
        payment_receipt JSONB,
        job_approved_by_client BOOLEAN DEFAULT false,
        review_submitted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Bookings table created');

    // Create reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
        cleaner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        reviewer_name VARCHAR(100),
        rating DECIMAL(3, 1),
        timeliness DECIMAL(3, 1),
        thoroughness DECIMAL(3, 1),
        conduct DECIMAL(3, 1),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Reviews table created');

    // Create chats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participants JSONB NOT NULL,
        participant_names JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Chats table created');

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Messages table created');

    // Create support tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100),
        subject VARCHAR(255),
        message TEXT,
        status VARCHAR(20) DEFAULT 'Open',
        admin_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Support tickets table created');

    console.log('\n🎉 Database setup complete!');
    console.log('You can now start the server with: npm run dev\n');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

setupDatabase();
