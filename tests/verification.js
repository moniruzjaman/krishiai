// tests/verification.js
const { directAnalysisEnhancer } = require('./services/directAnalysisEnhancer');

console.log('=== Direct Analysis Verification ===');

// Test basic enhancement
const baseResult = {
  id: 'test',
  timestamp: Date.now(),
  confidence: 50,
  diagnosis: 'Test diagnosis',
  category: 'Test',
  management: 'Test management',
  source: 'Test source',
  audioBase64: null,
  groundingChunks: []
};

const context = {
  cropFamily: 'rice',
  userQuery: 'yellow leaves',
  lang: 'bn'
};

try {
  const enhanced = directAnalysisEnhancer.enhanceAnalysis(baseResult, context);
  console.log('✓ Enhancement successful');
  console.log('Confidence:', enhanced.confidence);
  console.log('Diagnosis:', enhanced.diagnosis);
  console.log('Management:', enhanced.management);
  console.log('Source:', enhanced.source);
} catch (error) {
  console.error('✗ Enhancement failed:', error);
}

console.log('\n=== Verification Complete ===');
