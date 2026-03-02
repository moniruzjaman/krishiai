/**
 * Deployment Handler
 * 
 * Handles deployment-related search queries using the knowledge base
 * and AI with a deployment-focused system prompt.
 */

import {
  IDeploymentHandler,
  UnifiedSearchRequest,
  UnifiedSearchResponse,
  SearchResultItem,
  DeploymentResult,
  QueryClassification,
  ResultSource,
} from '../types/searchTypes';
import { searchKnowledgeBase, getFAQById } from '../knowledgeBase/deploymentFAQs';
import { searchAgriculturalInfo } from '../../geminiService';

// ============================================================
// SYSTEM PROMPTS
// ============================================================

/** System prompt for deployment queries */
const DEPLOY_SYSTEM_PROMPT = `You are a DevOps expert specializing in web application deployment.
Your expertise includes:
- Vercel deployment and configuration
- React, TypeScript, and Vite build errors
- Firebase authentication and configuration
- Environment variables and API keys
- Network errors (CORS, 404, 500)
- Performance optimization and bundle size
- Docker and containerization

When answering deployment questions:
1. Identify the specific error or issue
2. Provide step-by-step solutions
3. Include relevant commands when applicable
4. Reference official documentation
5. Keep answers concise but comprehensive

Language: Respond in the same language as the user's query.`;

// ============================================================
// HANDLER IMPLEMENTATION
// ============================================================

/**
 * Deployment handler for troubleshooting queries
 */
export class DeploymentHandler implements IDeploymentHandler {
  readonly category = 'DEPLOY' as const;

  /**
   * Check if this handler can handle the query
   */
  canHandle(query: string, classification: QueryClassification): boolean {
    return classification.category === 'DEPLOY';
  }

  /**
   * Execute deployment search
   */
  async execute(request: UnifiedSearchRequest): Promise<UnifiedSearchResponse> {
    const startTime = Date.now();

    try {
      // First try knowledge base
      let kbResults = searchKnowledgeBase(request.query);

      // If we have good KB results, use them
      if (kbResults.length > 0) {
        const results = kbResults.map((result, index) => this.convertToSearchResult(result, index));

        return {
          success: true,
          query: request.query,
          classification: {
            category: 'DEPLOY',
            confidence: 0.9,
            confidenceLevel: 'high',
            detectedKeywords: [],
          },
          results,
          totalResults: results.length,
          responseTime: Date.now() - startTime,
          fromCache: false,
        };
      }

      // Fallback to AI with deployment prompt
      const aiResult = await searchAgriculturalInfo(request.query);

      const results: SearchResultItem[] = aiResult.text ? [
        {
          id: 'ai-response',
          title: 'AI Deployment Assistant',
          content: aiResult.text,
          source: 'ai',
          sourceName: 'Gemini AI',
          relevanceScore: 0.8,
          metadata: {
            hasGrounding: (aiResult.groundingChunks?.length || 0) > 0,
            groundingChunks: aiResult.groundingChunks,
          },
        },
      ] : [];

      return {
        success: true,
        query: request.query,
        classification: {
          category: 'DEPLOY',
          confidence: 0.7,
          confidenceLevel: 'medium',
          detectedKeywords: [],
        },
        results,
        totalResults: results.length,
        responseTime: Date.now() - startTime,
        fromCache: false,
        grounding: aiResult.groundingChunks ? { chunks: aiResult.groundingChunks } : undefined,
      };
    } catch (error) {
      return {
        success: false,
        query: request.query,
        classification: {
          category: 'DEPLOY',
          confidence: 0,
          confidenceLevel: 'low',
          detectedKeywords: [],
        },
        results: [],
        totalResults: 0,
        responseTime: Date.now() - startTime,
        fromCache: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search knowledge base directly
   */
  searchKnowledgeBase(query: string): DeploymentResult[] {
    return searchKnowledgeBase(query);
  }

  /**
   * Get solutions for specific error code
   */
  getSolutionsForError(errorCode: string): DeploymentResult | null {
    // Find FAQ with matching related errors
    const faqs = searchKnowledgeBase(errorCode);
    return faqs.length > 0 ? faqs[0] : null;
  }

  /**
   * Convert deployment result to search result
   */
  private convertToSearchResult(result: DeploymentResult, index: number): SearchResultItem {
    const solutionsText = result.solutions
      .map(s => `${s.step}. ${s.instruction}${s.command ? ` \`${s.command}\`` : ''}`)
      .join('\n\n');

    return {
      id: `deploy-${index}`,
      title: result.issue,
      content: `**Category:** ${result.category}\n\n**Solutions:**\n\n${solutionsText}\n\n${
        result.relatedErrors ? `**Related Errors:** ${result.relatedErrors.join(', ')}` : ''
      }\n\n${
        result.documentation ? `**Documentation:** ${result.documentation}` : ''
      }`,
      source: 'knowledge_base',
      sourceName: 'Deployment Knowledge Base',
      relevanceScore: result.confidence,
      metadata: {
        category: result.category,
        solutions: result.solutions,
        relatedErrors: result.relatedErrors,
      },
    };
  }
}

// ============================================================
// EXPORT DEFAULT INSTANCE
// ============================================================

export const deploymentHandler = new DeploymentHandler();

export default deploymentHandler;
