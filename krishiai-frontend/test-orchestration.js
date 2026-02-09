import { getOrchestrationService } from './src/services/orchestrationInit';

const orchestration = getOrchestrationService();

console.log('Orchestration service initialized');
console.log('Testing basic functionality...');

try {
  console.log('Orchestration service is ready');
} catch (error) {
  console.error('Error initializing orchestration:', error);
}