// test-rule.ts
import { getRuleBasedAnalysis } from './services/ruleBasedAnalyzer';

console.log('Testing rule-based analyzer...');
console.log('Rice yellowing:', getRuleBasedAnalysis('rice', ['yellowing_leaves']));
console.log('General yellowing:', getRuleBasedAnalysis('general', ['yellowing']));
console.log('Unknown symptom:', getRuleBasedAnalysis('wheat', ['unknown']));
