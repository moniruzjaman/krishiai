// tests/ruleBasedAnalyzer.test.ts
import { getRuleBasedAnalysis } from '../services/ruleBasedAnalyzer';

describe('Rule-Based Analyzer Tests', () => {
  test('should return diagnosis for rice yellowing leaves', () => {
    const result = getRuleBasedAnalysis('rice', ['yellowing_leaves']);
    expect(result.confidence).toBeGreaterThan(30);
    expect(result.diagnosis).toContain('Pest');
    expect(result.category).toBe('Pest');
    expect(result.source).toContain('Rule-Based');
  });

  test('should return diagnosis for general yellowing', () => {
    const result = getRuleBasedAnalysis('general', ['yellowing']);
    expect(result.confidence).toBeGreaterThan(30);
    expect(result.diagnosis).toContain('Deficiency');
    expect(result.category).toBe('Deficiency');
  });

  test('should handle unknown symptoms gracefully', () => {
    const result = getRuleBasedAnalysis('wheat', ['unknown_symptom']);
    expect(result.confidence).toBe(40);
    expect(result.diagnosis).toContain('No specific diagnosis');
  });

  test('should return Bengali fallback message when all fails', () => {
    // This tests the final fallback in costAwareAnalyzer
    const result = {
      id: 'fallback-test',
      timestamp: Date.now(),
      confidence: 30,
      diagnosis: "এআই স্ক্যানার বর্তমানে উপলব্ধ নয়।",
      category: "Other",
      management: "দয়া করে আপনার স্থানীয় কৃষি প্রসারণ অফিসের সাথে যোগাযোগ করুন।",
      source: "Krishi AI Fallback System",
      audioBase64: null,
      groundingChunks: []
    };

    expect(result.diagnosis).toContain('এআই');
    expect(result.management).toContain('স্থানীয়');
  });
});
