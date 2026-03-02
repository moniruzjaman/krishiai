/**
 * Deployment Knowledge Base
 * 
 * Common deployment issues and solutions for:
 * - Vercel
 * - React/TypeScript
 * - Firebase
 * - Build errors
 * - Environment configuration
 */

import { DeploymentResult, DeploymentCategory } from '../types/searchTypes';

// ============================================================
// KNOWLEDGE BASE ENTRIES
// ============================================================

export interface DeploymentFAQ {
  id: string;
  keywords: string[];
  issue: string;
  category: DeploymentCategory;
  solutions: {
    step: number;
    instruction: string;
    command?: string;
    files?: string[];
    links?: string[];
  }[];
  relatedErrors?: string[];
  documentation?: string;
}

/**
 * Common deployment issues and solutions
 */
export const DEPLOYMENT_FAQS: DeploymentFAQ[] = [
  // ========== BUILD ERRORS ==========
  {
    id: 'build-failed',
    keywords: ['build failed', 'npm run build', 'build error', 'compilation failed', 'বিল্ড ব্যর্থ'],
    issue: 'Build failed during deployment',
    category: 'build',
    solutions: [
      {
        step: 1,
        instruction: 'Run build locally to see full error details',
        command: 'npm run build',
      },
      {
        step: 2,
        instruction: 'Check for TypeScript errors',
        command: 'npx tsc --noEmit',
      },
      {
        step: 3,
        instruction: 'Clear node_modules and reinstall dependencies',
        command: 'rm -rf node_modules && npm install',
      },
      {
        step: 4,
        instruction: 'Check package.json for invalid scripts or dependencies',
        files: ['package.json'],
      },
      {
        step: 5,
        instruction: 'Verify all import paths are correct',
      },
    ],
    relatedErrors: ['MODULE_NOT_FOUND', 'SYNTAX_ERROR', 'TYPE_ERROR'],
  },
  {
    id: 'npm-install-failed',
    keywords: ['npm install failed', 'install error', 'dependency error', 'package.json error'],
    issue: 'npm install failed during build',
    category: 'build',
    solutions: [
      {
        step: 1,
        instruction: 'Check package.json for syntax errors',
        files: ['package.json'],
      },
      {
        step: 2,
        instruction: 'Clear npm cache and reinstall',
        command: 'npm cache clean --force && npm install',
      },
      {
        step: 3,
        instruction: 'Check for incompatible package versions',
        command: 'npm ls',
      },
      {
        step: 4,
        instruction: 'Try using npm ci for cleaner install',
        command: 'npm ci',
      },
    ],
  },
  {
    id: 'typescript-error',
    keywords: ['typescript error', 'type error', 'tsc error', 'type inference failed'],
    issue: 'TypeScript compilation error',
    category: 'build',
    solutions: [
      {
        step: 1,
        instruction: 'Run TypeScript compiler to see detailed errors',
        command: 'npx tsc --noEmit',
      },
      {
        step: 2,
        instruction: 'Check tsconfig.json configuration',
        files: ['tsconfig.json'],
      },
      {
        step: 3,
        instruction: 'Add type annotations or type guards where needed',
      },
      {
        step: 4,
        instruction: 'Consider using @ts-ignore temporarily (not recommended for production)',
      },
    ],
    relatedErrors: ['TS2307', 'TS2345', 'TS2339', 'TS2769'],
  },

  // ========== VERCEL ERRORS ==========
  {
    id: 'vercel-deploy-failed',
    keywords: ['vercel deployment failed', 'vercel deploy error', 'vercel build failed'],
    issue: 'Vercel deployment failed',
    category: 'config',
    solutions: [
      {
        step: 1,
        instruction: 'Check Vercel dashboard for detailed error logs',
        links: ['https://vercel.com/dashboard'],
      },
      {
        step: 2,
        instruction: 'Verify vercel.json configuration',
        files: ['vercel.json'],
      },
      {
        step: 3,
        instruction: 'Check Build Command in Vercel project settings',
      },
      {
        step: 4,
        instruction: 'Ensure Output Directory is correct',
      },
      {
        step: 5,
        instruction: 'Try redeploying from main branch',
      },
    ],
  },
  {
    id: 'vercel-404',
    keywords: ['vercel 404', 'page not found', '404 error on vercel'],
    issue: '404 error on Vercel deployment',
    category: 'network',
    solutions: [
      {
        step: 1,
        instruction: 'Check if Output Directory matches your build output',
      },
      {
        step: 2,
        instruction: 'Configure rewrites in vercel.json for SPA',
        files: ['vercel.json'],
        links: ['https://vercel.com/docs/projects/project-configuration#rewrites'],
      },
      {
        step: 3,
        instruction: 'Ensure all routes are properly defined',
      },
      {
        step: 4,
        instruction: 'Check for case-sensitive file path issues',
      },
    ],
  },
  {
    id: 'vercel-timeout',
    keywords: ['vercel timeout', 'build timeout', 'deployment timeout'],
    issue: 'Build timeout on Vercel',
    category: 'performance',
    solutions: [
      {
        step: 1,
        instruction: 'Optimize build process to reduce build time',
      },
      {
        step: 2,
        instruction: 'Consider increasing Build Time Limit (paid plans)',
        links: ['https://vercel.com/docs/accounts/plan-management#build-timeout'],
      },
      {
        step: 3,
        instruction: 'Cache node_modules in vercel.json',
        files: ['vercel.json'],
      },
      {
        step: 4,
        instruction: 'Split large builds into smaller chunks',
      },
    ],
  },

  // ========== ENVIRONMENT ERRORS ==========
  {
    id: 'env-not-found',
    keywords: ['env not found', 'environment variable not set', 'API key missing', 'process.env undefined'],
    issue: 'Environment variable not found',
    category: 'config',
    solutions: [
      {
        step: 1,
        instruction: 'Add environment variable in Vercel project settings',
        links: ['https://vercel.com/docs/projects/environment-variables'],
      },
      {
        step: 2,
        instruction: 'Ensure variable name starts with VITE_ for client-side',
      },
      {
        step: 3,
        instruction: 'Check .env.local is not committed to git',
        files: ['.env.local', '.gitignore'],
      },
      {
        step: 4,
        instruction: 'Restart the deployment after adding variables',
      },
      {
        step: 5,
        instruction: 'Verify variable name in code matches environment',
      },
    ],
    relatedErrors: ['undefined', 'is not defined', 'missing'],
  },
  {
    id: 'api-key-error',
    keywords: ['api key error', 'invalid api key', 'authentication failed', 'unauthorized'],
    issue: 'API key authentication error',
    category: 'config',
    solutions: [
      {
        step: 1,
        instruction: 'Verify API key is correct and not expired',
      },
      {
        step: 2,
        instruction: 'Check if API key has required permissions',
      },
      {
        step: 3,
        instruction: 'Ensure API key is properly set in environment variables',
      },
      {
        step: 4,
        instruction: 'Check for quota limits on API key',
      },
    ],
  },

  // ========== CORS ERRORS ==========
  {
    id: 'cors-error',
    keywords: ['cors error', 'cross origin', 'access-control-allow-origin', 'cors blocked'],
    issue: 'CORS error blocking API requests',
    category: 'network',
    solutions: [
      {
        step: 1,
        instruction: 'Configure CORS on your backend server',
        command: 'Add CORS middleware to Express/Node server',
      },
      {
        step: 2,
        instruction: 'Set proper CORS headers',
        links: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS'],
      },
      {
        step: 3,
        instruction: 'For Vercel serverless functions, add cors headers',
      },
      {
        step: 4,
        instruction: 'Check browser console for specific CORS error details',
      },
    ],
    relatedErrors: ['Access-Control-Allow-Origin', 'CORS policy'],
  },

  // ========== FIREBASE ERRORS ==========
  {
    id: 'firebase-auth-error',
    keywords: ['firebase auth error', 'authentication failed', 'firebase login failed'],
    issue: 'Firebase authentication error',
    category: 'config',
    solutions: [
      {
        step: 1,
        instruction: 'Check Firebase console for authentication providers',
        links: ['https://console.firebase.google.com/'],
      },
      {
        step: 2,
        instruction: 'Verify Firebase config in your app',
        files: ['src/firebase.ts', 'src/firebaseConfig.ts'],
      },
      {
        step: 3,
        instruction: 'Check API key restrictions in Google Cloud Console',
      },
      {
        step: 4,
        instruction: 'Ensure OAuth consent screen is configured',
      },
    ],
  },
  {
    id: 'firebase-config-missing',
    keywords: ['firebase config missing', 'firebase not initialized', 'firebase app initialization failed'],
    issue: 'Firebase not properly configured',
    category: 'config',
    solutions: [
      {
        step: 1,
        instruction: 'Create Firebase project and get config',
        links: ['https://console.firebase.google.com/'],
      },
      {
        step: 2,
        instruction: 'Add Firebase config to environment variables',
      },
      {
        step: 3,
        instruction: 'Initialize Firebase in your app',
        files: ['src/firebase.ts'],
      },
      {
        step: 4,
        instruction: 'Check Firebase SDK version compatibility',
      },
    ],
  },

  // ========== RUNTIME ERRORS ==========
  {
    id: 'bundle-size-large',
    keywords: ['bundle size too large', 'resource too large', 'chunk size exceeded'],
    issue: 'Bundle size too large',
    category: 'performance',
    solutions: [
      {
        step: 1,
        instruction: 'Analyze bundle with webpack-bundle-analyzer',
        command: 'npm run build -- --analyze',
      },
      {
        step: 2,
        instruction: 'Implement code splitting with lazy loading',
        command: 'React.lazy() for route components',
      },
      {
        step: 3,
        instruction: 'Tree-shake unused code',
      },
      {
        step: 4,
        instruction: 'Compress images and optimize assets',
      },
      {
        step: 5,
        instruction: 'Consider using Vite for smaller bundles',
      },
    ],
    relatedErrors: ['Resource Limit Exceeded'],
  },
  {
    id: 'memory-issues',
    keywords: ['out of memory', 'heap memory', 'memory exceeded', 'fatal error'],
    issue: 'Out of memory during build',
    category: 'performance',
    solutions: [
      {
        step: 1,
        instruction: 'Increase Node.js memory limit',
        command: 'NODE_OPTIONS="--max-old-space-size=4096" npm run build',
      },
      {
        step: 2,
        instruction: 'Split large components into smaller chunks',
      },
      {
        step: 3,
        instruction: 'Optimize import statements',
      },
      {
        step: 4,
        instruction: 'Consider using SWC instead of Babel for faster builds',
      },
    ],
  },
  {
    id: 'module-not-found',
    keywords: ['module not found', 'cannot find module', 'import error'],
    issue: 'Module not found error',
    category: 'build',
    solutions: [
      {
        step: 1,
        instruction: 'Install missing package',
        command: 'npm install <package-name>',
      },
      {
        step: 2,
        instruction: 'Check import path is correct',
      },
      {
        step: 3,
        instruction: 'Verify package is in package.json dependencies',
      },
      {
        step: 4,
        instruction: 'Check for case-sensitive import issues',
      },
    ],
    relatedErrors: ['MODULE_NOT_FOUND', 'Cannot find module'],
  },
];

// ============================================================
// KNOWLEDGE BASE SEARCH
// ============================================================

/**
 * Search knowledge base for matching FAQ
 */
export function searchKnowledgeBase(query: string): DeploymentResult[] {
  const normalizedQuery = query.toLowerCase();
  const results: DeploymentResult[] = [];

  for (const faq of DEPLOYMENT_FAQS) {
    // Check if any keyword matches
    const keywordMatch = faq.keywords.some(keyword =>
      normalizedQuery.includes(keyword.toLowerCase())
    );

    if (keywordMatch) {
      results.push({
        issue: faq.issue,
        category: faq.category,
        solutions: faq.solutions,
        documentation: faq.documentation,
        relatedErrors: faq.relatedErrors,
        confidence: 0.9,
      });
    }
  }

  // If no direct match, try to match by related errors
  if (results.length === 0) {
    for (const faq of DEPLOYMENT_FAQS) {
      if (faq.relatedErrors) {
        for (const error of faq.relatedErrors) {
          if (normalizedQuery.includes(error.toLowerCase())) {
            results.push({
              issue: faq.issue,
              category: faq.category,
              solutions: faq.solutions,
              documentation: faq.documentation,
              relatedErrors: faq.relatedErrors,
              confidence: 0.7,
            });
            break;
          }
        }
      }
    }
  }

  return results;
}

/**
 * Get FAQ by ID
 */
export function getFAQById(id: string): DeploymentFAQ | undefined {
  return DEPLOYMENT_FAQS.find(faq => faq.id === id);
}

/**
 * Get all FAQs
 */
export function getAllFAQs(): DeploymentFAQ[] {
  return DEPLOYMENT_FAQs;
}

/**
 * Get FAQs by category
 */
export function getFAQsByCategory(category: DeploymentCategory): DeploymentFAQ[] {
  return DEPLOYMENT_FAQS.filter(faq => faq.category === category);
}

export default {
  DEPLOYMENT_FAQS,
  searchKnowledgeBase,
  getFAQById,
  getAllFAQs,
  getFAQsByCategory,
};
