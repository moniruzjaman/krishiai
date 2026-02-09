// Simple test to check if orchestration system can be imported
// This will help identify the actual issue

console.log('Testing orchestration system...');

// Try to require the orchestration service
const fs = require('fs');
const path = require('path');

const orchestrationPath = path.join(__dirname, 'src/services/orchestrationInit.ts');

if (fs.existsSync(orchestrationPath)) {
  console.log('✅ orchestrationInit.ts file exists');
  
  const content = fs.readFileSync(orchestrationPath, 'utf8');
  console.log('✅ File content read successfully');
  console.log('✅ File size:', content.length, 'characters');
  
  // Check if it contains the getOrchestrationService function
  if (content.includes('getOrchestrationService')) {
    console.log('✅ getOrchestrationService function found');
  } else {
    console.log('❌ getOrchestrationService function not found');
  }
  
} else {
  console.log('❌ orchestrationInit.ts file not found');
}

console.log('\nTesting types...');
const typesPath = path.join(__dirname, 'src/types.ts');
if (fs.existsSync(typesPath)) {
  console.log('✅ types.ts file exists');
} else {
  console.log('❌ types.ts file not found');
}

console.log('\nTesting imports...');
const imports = [
  '../services/orchestrationInit',
  '../services/analyzerOrchestration',
  '../types'
];

for (const imp of imports) {
  try {
    console.log(`✅ Trying to require ${imp}`);
    // This will fail but shows the path
  } catch (e) {
    console.log(`❌ Cannot require ${imp}:`, e.message);
  }
}

console.log('\nSystem check complete.');