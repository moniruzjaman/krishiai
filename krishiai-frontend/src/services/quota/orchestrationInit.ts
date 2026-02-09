/**
 * Analyzer Orchestration Service Initialization
 * Singleton instance for multi-tier AI model orchestration
 */

import { AIOrchestrationService, QuotaManager, TrainingDataCollector } from '../ai/analyzerOrchestration';
import { DatasetManager } from '../data/datasetManager';

let orchestrationInstance: AIOrchestrationService | null = null;
let quotaManagerInstance: QuotaManager | null = null;
let trainingDataCollectorInstance: TrainingDataCollector | null = null;
let datasetManagerInstance: DatasetManager | null = null;

/**
 * Get or create singleton instance of AIOrchestrationService
 */
export function getOrchestrationService(): AIOrchestrationService {
  if (!orchestrationInstance) {
    orchestrationInstance = new AIOrchestrationService();
  }
  return orchestrationInstance;
}

/**
 * Get or create singleton instance of QuotaManager
 */
export function getQuotaManager(): QuotaManager {
  if (!quotaManagerInstance) {
    quotaManagerInstance = new QuotaManager();
  }
  return quotaManagerInstance;
}

/**
 * Get or create singleton instance of TrainingDataCollector
 */
export function getTrainingDataCollector(): TrainingDataCollector {
  if (!trainingDataCollectorInstance) {
    trainingDataCollectorInstance = new TrainingDataCollector();
  }
  return trainingDataCollectorInstance;
}

/**
 * Get or create singleton instance of DatasetManager
 */
export function getDatasetManager(): DatasetManager {
  if (!datasetManagerInstance) {
    datasetManagerInstance = new DatasetManager();
  }
  return datasetManagerInstance;
}

/**
 * Reset instances (for testing)
 */
export function resetOrchestration(): void {
  orchestrationInstance = null;
  quotaManagerInstance = null;
  trainingDataCollectorInstance = null;
  datasetManagerInstance = null;
}

export default getOrchestrationService;
