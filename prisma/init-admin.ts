import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

/**
 * Production-grade admin initialization script
 * Creates a secure admin user with validated password requirements
 * 
 * Usage: npm run init-admin
 */

interface AdminCredentials {
  email: string;
  name: string;
  password: string;
}

/**
 * Validate password strength requirements for banking environment
 */
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common patterns
  const commonPatterns = [
    'password', 'admin', '123456', 'qwerty', 'abc123', 
    'letmein', 'welcome', 'monkey', 'dragon', 'master'
  ];
  
  const lowerPassword = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      errors.push(`Password cannot contain common pattern: ${pattern}`);
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Prompt for user input with readline
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt for password with hidden input
 */
function promptPassword(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    // Note: In production, use a package like 'read' for truly hidden input
    // For now, we'll display asterisks
    let password = '';
    
    process.stdout.write(question);
    
    // Set stdin to raw mode to capture individual keystrokes
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    process.stdin.on('data', (char) => {
      const charStr = char.toString();
      
      if (charStr === '\n' || charStr === '\r' || charStr === '\u0004') {
        // Enter key pressed
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        process.stdout.write('\n');
        rl.close();
        resolve(password);
      } else if (charStr === '\u0003') {
        // Ctrl+C pressed
        process.exit(0);
      } else if (charStr === '\u007f' || charStr === '\b') {
        // Backspace pressed
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += charStr;
        process.stdout.write('*');
      }
    });
  });
}

/**
 * Collect admin credentials from command line
 */
async function collectCredentials(): Promise<AdminCredentials> {
  console.log('\n=== Admin User Initialization ===\n');
  console.log('This script will create the initial administrator account.');
  console.log('Password requirements:');
  console.log('  - Minimum 12 characters');
  console.log('  - At least one uppercase letter');
  console.log('  - At least one lowercase letter');
  console.log('  - At least one number');
  console.log('  - At least one special character');
  console.log('  - Cannot contain common patterns\n');
  
  // Get email
  let email = '';
  while (!email) {
    email = await prompt('Admin Email: ');
    if (!validateEmail(email)) {
      console.log('❌ Invalid email format. Please try again.\n');
      email = '';
    }
  }
  
  // Get name
  let name = '';
  while (!name) {
    name = await prompt('Admin Name: ');
    if (!name || name.length < 2) {
      console.log('❌ Name must be at least 2 characters. Please try again.\n');
      name = '';
    }
  }
  
  // Get password
  let password = '';
  let passwordValid = false;
  while (!passwordValid) {
    password = await promptPassword('Admin Password: ');
    const validation = validatePassword(password);
    
    if (!validation.valid) {
      console.log('\n❌ Password does not meet requirements:');
      validation.errors.forEach(err => console.log(`   - ${err}`));
      console.log('');
    } else {
      // Confirm password
      const confirmPassword = await promptPassword('Confirm Password: ');
      if (password !== confirmPassword) {
        console.log('\n❌ Passwords do not match. Please try again.\n');
      } else {
        passwordValid = true;
      }
    }
  }
  
  return { email, name, password };
}

/**
 * Main initialization function
 */
async function main() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (existingAdmin) {
      console.log('❌ Error: An admin user already exists in the database.');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log('\nIf you need to reset the admin account, please:');
      console.log('  1. Delete the existing admin user from the database');
      console.log('  2. Run this script again');
      process.exit(1);
    }
    
    // Collect credentials
    const credentials = await collectCredentials();
    
    // Hash password with high cost factor for banking security
    console.log('\n⏳ Hashing password (this may take a moment)...');
    const hashedPassword = await hash(credentials.password, 12);
    
    // Create admin user
    console.log('⏳ Creating admin user...');
    const adminUser = await prisma.user.create({
      data: {
        email: credentials.email,
        name: credentials.name,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'active',
        avatar: credentials.name.substring(0, 2).toUpperCase(),
        mfaEnabled: false,
        failedLoginAttempts: 0,
      },
    });
    
    // Create initial audit log entry
    console.log('⏳ Creating audit log entry...');
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        actionType: 'CREATE',
        entityType: 'USER',
        entityId: adminUser.id,
        changeSummary: 'System initialization - Admin user created via init-admin script',
        ipAddress: 'localhost',
        sessionId: 'init-admin-script',
      },
    });
    
    console.log('\n✅ Admin user successfully created!');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log('\nYou can now log in to the application with these credentials.');
    console.log('\n⚠️  IMPORTANT: Store your password securely. It cannot be recovered.');
    
  } catch (error: any) {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
main();
