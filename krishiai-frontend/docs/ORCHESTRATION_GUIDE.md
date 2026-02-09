# AI Analyzer Orchestration System - Implementation Guide

## Overview

The Analyzer Orchestration System is a multi-tier AI architecture that provides cost-free, highly accurate crop disease diagnosis with intelligent model fallback, RAG-based grounding, and offline capability.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER IMAGE INPUT                        │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
                    ┌────────────────────┐
                    │ CHECK QUOTA STATUS │
                    └────────┬───────────┘
                             ↓
        ┌────────────────────────────────────────────┐
        │         TRY PRIMARY MODEL TIER             │
        │                                             │
        ├─ Gemini 2.5 Flash (500K tokens/month)     │
        │  ├─ Multi-step analysis                   │
        │  ├─ Confidence scoring                    │
        │  └─ IF confidence < 70%                   │
        │     └─ TRIGGER KIMI (secondary)           │
        │                                             │
        ├─ Kimi 2.5 (10M tokens/month)              │
        │  └─ Strong reasoning capability           │
        │                                             │
        ├─ Qwen-VL (Local, free, unlimited)         │
        │  └─ Fast inference without API calls      │
        │                                             │
        └─ Ollama (Local, completely offline)       │
           └─ Final fallback, guaranteed availability
                             ↓
                    ┌────────────────────┐
                    │ GROUND WITH RAG     │
                    │ (Local datasets)    │
                    └────────┬───────────┘
                             ↓
        ┌─────────────────────────────────────────────┐
        │ Local Datasets (PRIORITY):                 │
        ├─ CABI PlantWise (international)           │
        ├─ BRRI (Bangladesh Rice Research)          │
        ├─ BARI (Bangladesh Agricultural Research)  │
        └─ If low confidence: Web search (secondary) │
                             ↓
                    ┌────────────────────┐
                    │ COLLECT TRAINING   │
                    │ DATA (AUTO-SAVE)   │
                    └────────┬───────────┘
                             ↓
                    ┌────────────────────┐
                    │ RETURN RESULT TO   │
                    │ USER + ANALYTICS   │
                    └────────────────────┘
```

## Key Components

### 1. AIOrchestrationService (`analyzerOrchestration.ts`)

Main orchestration service that coordinates all AI models and RAG system.

**Key Methods:**
```typescript
analyzeImage(image: Blob | string, metadata: {...}): Promise<AnalysisResult>
getQuotaStatus(): Promise<QuotaStatus>
getUserAnalytics(userId: string): Promise<any>
```

### 2. RAGSystem (Retrieval-Augmented Generation)

Grounds diagnoses with authentic sources from local datasets.

**Datasets:**
- **CABI PlantWise**: International disease database
- **BRRI**: Bangladesh-specific rice disease data
- **BARI**: Bangladesh vegetable/crop disease data

**Features:**
- Semantic search using keyword matching
- Similarity scoring with Levenshtein distance
- Fallback to web search if confidence < 80%

### 3. QuotaManager

Tracks API usage and enforces quotas with heavy user detection.

**Quotas:**
- **Gemini**: 500,000 tokens/month (free tier)
- **Kimi**: 10,000,000 tokens/month (free tier)
- **Local Models**: Unlimited (Qwen-VL, Ollama)

**Features:**
- Monthly quota reset on 1st of month
- LocalStorage persistence
- Heavy user detection (>30 analyses/day)
- Per-user analytics tracking

### 4. TrainingDataCollector

Auto-saves all analyses for future model fine-tuning without expert review.

**Data Collected:**
- Image hash
- Diagnosis
- Confidence level
- Model used
- Crop type & region
- Timestamp
- Optional user corrections

**Storage:**
- LocalStorage (1000 recent records)
- Export as JSON or CSV for analysis

### 5. DatasetManager (`datasetManager.ts`)

Manages CABI, BRRI, and BARI datasets with semantic search.

**Features:**
- Vector indexing by disease name, crop type, keywords
- Similarity calculation (0-1 score)
- Import/export datasets as CSV or JSON
- Statistics and analytics

### 6. LocalModelService (`localModelService.ts`)

Integrates Qwen-VL and Ollama for offline capability.

**Qwen-VL (Vision):**
- Analyze image directly
- Returns diagnosis with confidence
- GPU accelerated (if available)
- Endpoint: `http://localhost:8000`

**Ollama (Text):**
- Fallback for text-based analysis
- Can run on CPU
- Supports multiple models (llama2, neural-chat, etc.)
- Endpoint: `http://localhost:11434`

### 7. OfflineRAGSystem (`offlineRAG.ts`)

Pre-downloads and indexes datasets for completely offline operation.

**Storage Tiers:**
1. IndexedDB (50MB+ storage)
2. LocalStorage (fallback, ~5MB)

**Features:**
- Search local records without internet
- Sync with online datasets when connection available
- Export/import database
- Statistics and monitoring

## Implementation Guide

### Step 1: Initialize Orchestration Service

```typescript
import { getOrchestrationService } from '@/services/orchestrationInit';

const orchestration = getOrchestrationService();
```

### Step 2: Analyze Image

```typescript
const result = await orchestration.analyzeImage(imageBlob, {
  cropType: 'ধান (Rice)',
  region: 'Dhaka',
  season: 'Monsoon',
  userId: 'user_123'
});

// Result includes:
// - diagnosis: string
// - confidence: 0-1 (0.85 = 85%)
// - confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
// - model: which model was used
// - reasoning: step-by-step analysis
// - sources: grounded sources with URLs
// - management: chemical/organic/cultural/preventive advice
// - needsSecondOpinion: boolean
```

### Step 3: Check Quota Status

```typescript
const quota = await orchestration.getQuotaStatus();

console.log(quota);
// {
//   gemini: { used: 1000, limit: 500000, remaining: 499000, ... },
//   kimi: { used: 100, limit: 10000000, remaining: 9999900, ... },
//   canUseGemini: true,
//   canUseKimi: true,
//   currentTier: 'gemini-2.5-flash'
// }
```

### Step 4: Get User Analytics

```typescript
const analytics = await orchestration.getUserAnalytics('user_123');

console.log(analytics);
// {
//   totalAnalyses: 42,
//   averageConfidence: 0.87,
//   byModel: {
//     'gemini-2.5-flash': 30,
//     'kimi-2.5': 8,
//     'qwen-vl': 4
//   },
//   isHeavyUser: false,
//   lastAnalysisDate: '2025-02-03T10:30:00Z'
// }
```

### Step 5: Setup Local Models (Optional)

**For Qwen-VL:**
```bash
docker run -d --name qwen-vl \
  --gpus all \
  -p 8000:8000 \
  alibaba/qwen-vl:latest
```

**For Ollama:**
```bash
# Install
curl https://ollama.ai/install.sh | sh

# Run service
ollama serve

# In another terminal, pull model
ollama pull llama2
```

### Step 6: Setup Offline RAG (Optional)

```typescript
import { OfflineRAGSystem } from '@/services/offlineRAG';

const offlineRAG = new OfflineRAGSystem({
  maxStorageSize: 50, // MB
  autoSyncOnline: true
});

// Sync when online
await offlineRAG.syncWithOnline(datasetRecords);

// Search offline
const results = offlineRAG.search('Early Blight', 5);

// Check status
const status = offlineRAG.getStatus();
```

## Database Schema

### QuotaRecord
```typescript
{
  userId?: string;
  modelType: 'gemini' | 'kimi';
  tokensUsed: number;
  timestamp: Date;
  region?: string;
}
```

### TrainingDataRecord
```typescript
{
  userId: string;
  imageHash: string;
  diagnosis: string;
  symptoms: string[];
  confidence: number;
  model: string;
  cropType?: string;
  region?: string;
  season?: string;
  userCorrection?: {
    isCorrect: boolean;
    actualDiagnosis?: string;
    feedback?: string;
  };
  timestamp: Date;
}
```

### DatasetRecord
```typescript
{
  cropType: string;
  diseaseName: string;
  scientificName?: string;
  symptoms: string[];
  management: {
    chemical: [{product, concentration, interval}[]];
    organic: [{product, concentration, interval}[]];
    cultural: string[];
    preventive: string[];
    bestTiming: string;
  };
  imageUrl?: string;
  sourceUrl?: string;
  source: 'CABI' | 'BRRI' | 'BARI';
  relevanceKeywords: string[];
  severity?: 'low' | 'medium' | 'high';
}
```

## API Response Format

```typescript
interface AnalysisResult {
  diagnosis: string;
  symptoms: string[];
  confidence: number; // 0-1
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  model: AIModel;
  reasoning: string[];
  sources: SourceReference[];
  management: ManagementAdvice;
  timestamp: Date;
  needsSecondOpinion: boolean;
}

interface SourceReference {
  source: 'CABI_PLANTWISE' | 'BRRI' | 'BARI' | 'WEB_SEARCH';
  title: string;
  url?: string;
  relevanceScore: number; // 0-1
  excerpt: string;
}

interface ManagementAdvice {
  immediate: string[];
  chemical: [{product, concentration, interval}[]];
  organic: [{product, concentration, interval}[]];
  preventive: string[];
  sprayTiming: string;
}
```

## Heavy User Features

Users with >30 analyses/day get:
- Priority support (queue)
- Extended analytics dashboard
- Option to provide their own API keys
- Custom region/crop preferences
- Email notifications for quota status

## Cost Analysis

### Per Analysis Cost
- **Gemini 2.5 Flash**: ~$0.03 (5000 tokens avg)
- **Kimi 2.5**: ~$0.002 (10M tokens free/month)
- **Qwen-VL Local**: $0 (one-time GPU investment)
- **Ollama Local**: $0 (CPU)

### Monthly Cost Scenarios
- **100 analyses/month**: Free (within quota)
- **500 analyses/month**: Free (within quota)
- **2000 analyses/month**: Free (within quota)
- **5000+ analyses/month**: User provides own API keys or pays ~$150/month

## Troubleshooting

### Issue: Models not responding
**Solution:** Check health endpoints
```typescript
const localService = new LocalModelService();
const availability = localService.getAvailability();
console.log(availability); // {qwen: false, ollama: false}
await localService.refreshAvailability();
```

### Issue: Low confidence diagnoses
**Solution:** Use secondary opinion
```typescript
if (result.needsSecondOpinion) {
  // System automatically triggered Kimi if available
  // Check result.model to see which model provided final answer
}
```

### Issue: Quota exceeded
**Solution:** Use local models or provide API key
```typescript
const quota = await orchestration.getQuotaStatus();
if (!quota.canUseGemini && !quota.canUseKimi) {
  // System falls back to Qwen-VL or Ollama automatically
  // User sees lower confidence but still gets diagnosis
}
```

## Testing

```bash
# Test orchestration service
npm test -- analyzerOrchestration.test.ts

# Test with sample images
npm test -- analyzerOrchestration.integration.test.ts

# Performance benchmarking
npm test -- analyzerOrchestration.perf.test.ts
```

## Future Enhancements

1. **Kimi 2.5 Integration**: Implement when SDK available
2. **Web Search Integration**: Add Google Search API for secondary sources
3. **Fine-tuning Pipeline**: Use collected training data to fine-tune models
4. **Multi-language Support**: Translate diagnoses to regional languages
5. **Mobile Optimization**: Reduce model sizes for mobile deployment
6. **Real-time Video Analysis**: Stream processing for continuous monitoring
7. **Multi-crop Analysis**: Analyze multiple crops in single image

## Documentation

- **API Reference**: [API.md](./API.md)
- **Dataset Integration**: [DATASETS.md](./DATASETS.md)
- **Local Model Setup**: [LOCAL_MODELS.md](./LOCAL_MODELS.md)
- **Offline Mode**: [OFFLINE_MODE.md](./OFFLINE_MODE.md)

