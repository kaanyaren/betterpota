import fs from 'fs';
import path from 'path';

// Simple script to prepare Convex deployment
console.log('Preparing Convex deployment...');

// Check if convex directory exists
const convexDir = path.join(process.cwd(), 'convex');
if (!fs.existsSync(convexDir)) {
  console.error('Convex directory not found');
  process.exit(1);
}

console.log('Convex functions ready:');
const files = fs.readdirSync(convexDir);
files.forEach(file => {
  if (file.endsWith('.ts')) {
    console.log(`  - ${file}`);
  }
});

console.log('\nTo deploy these functions to your Convex cloud:');
console.log('1. Run: npx convex login');
console.log('2. Run: npx convex deploy');
console.log('\nOr deploy through the Convex dashboard at: https://dashboard.convex.dev');