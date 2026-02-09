/**
 * Local Model Integration Service
 * Supports Qwen-VL-8B and Ollama for offline capability
 */

export interface LocalModelConfig {
  modelName: string;
  apiEndpoint: string;
  timeout: number;
  retries: number;
}

export interface LocalModelResponse {
  success: boolean;
  diagnosis?: string;
  confidence?: number;
  error?: string;
  processingTime: number;
  model: 'qwen-vl' | 'ollama-llama2';
}

class LocalModelService {
  private qwenEndpoint: string;
  private ollamaEndpoint: string;
  private isQwenAvailable: boolean = false;
  private isOllamaAvailable: boolean = false;
  private requestTimeout: number = 30000; // 30 seconds

  constructor(
    qwenEndpoint: string = 'http://localhost:8000',
    ollamaEndpoint: string = 'http://localhost:11434'
  ) {
    this.qwenEndpoint = qwenEndpoint;
    this.ollamaEndpoint = ollamaEndpoint;
    this.initializeHealthChecks();
  }

  /**
   * Initialize health checks for local models
   */
  private async initializeHealthChecks(): Promise<void> {
    // Check Qwen availability
    try {
      const qwenHealth = await this.checkQwenHealth();
      this.isQwenAvailable = qwenHealth;
      console.log('Qwen-VL available:', qwenHealth);
    } catch (error) {
      this.isQwenAvailable = false;
    }

    // Check Ollama availability
    try {
      const ollamaHealth = await this.checkOllamaHealth();
      this.isOllamaAvailable = ollamaHealth;
      console.log('Ollama available:', ollamaHealth);
    } catch (error) {
      this.isOllamaAvailable = false;
    }
  }

  /**
   * Check if Qwen-VL is available
   */
  private async checkQwenHealth(): Promise<boolean> {
    try {
      const response = await Promise.race([
        fetch(`${this.qwenEndpoint}/health`, { method: 'GET' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      return (response as Response).ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if Ollama is available
   */
  private async checkOllamaHealth(): Promise<boolean> {
    try {
      const response = await Promise.race([
        fetch(`${this.ollamaEndpoint}/api/tags`, { method: 'GET' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      return (response as Response).ok;
    } catch {
      return false;
    }
  }

  /**
   * Analyze image with Qwen-VL
   */
  async analyzeWithQwenVL(
    imageBase64: string,
    metadata?: any
  ): Promise<LocalModelResponse> {
    const startTime = Date.now();

    if (!this.isQwenAvailable) {
      return {
        success: false,
        error: 'Qwen-VL not available',
        processingTime: 0,
        model: 'qwen-vl'
      };
    }

    try {
      const prompt = this.buildQwenPrompt(metadata?.cropType);

      const response = await this.fetchWithTimeout(
        `${this.qwenEndpoint}/v1/vision/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageBase64,
            prompt,
            temperature: 0.7,
            max_tokens: 1000
          })
        }
      );

      const data = await response.json();

      return {
        success: true,
        diagnosis: data.diagnosis || 'Unable to diagnose',
        confidence: data.confidence || 0.75,
        processingTime: Date.now() - startTime,
        model: 'qwen-vl'
      };
    } catch (error) {
      console.error('Qwen-VL error:', error);
      return {
        success: false,
        error: String(error),
        processingTime: Date.now() - startTime,
        model: 'qwen-vl'
      };
    }
  }

  /**
   * Analyze with Ollama (text-based fallback)
   */
  async analyzeWithOllama(
    description: string,
    metadata?: any
  ): Promise<LocalModelResponse> {
    const startTime = Date.now();

    if (!this.isOllamaAvailable) {
      return {
        success: false,
        error: 'Ollama not available',
        processingTime: 0,
        model: 'ollama-llama2'
      };
    }

    try {
      const prompt = this.buildOllamaPrompt(description, metadata?.cropType);

      const response = await this.fetchWithTimeout(
        `${this.ollamaEndpoint}/api/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama2',
            prompt,
            stream: false,
            temperature: 0.7
          })
        }
      );

      const data = await response.json();

      return {
        success: true,
        diagnosis: data.response || 'Unable to diagnose',
        confidence: 0.65, // Ollama doesn't provide confidence
        processingTime: Date.now() - startTime,
        model: 'ollama-llama2'
      };
    } catch (error) {
      console.error('Ollama error:', error);
      return {
        success: false,
        error: String(error),
        processingTime: Date.now() - startTime,
        model: 'ollama-llama2'
      };
    }
  }

  /**
   * Build prompt for Qwen-VL analysis
   */
  private buildQwenPrompt(cropType?: string): string {
    return `You are an agricultural disease expert. Analyze this crop image and provide:
1. Crop identification
2. Disease diagnosis (if any)
3. Severity (1-5 scale)
4. Confidence level (0-100%)
5. Management recommendations

Crop type: ${cropType || 'Unknown'}

Respond in JSON format:
{
  "crop": "...",
  "diagnosis": "...",
  "severity": 3,
  "confidence": 75,
  "management": "..."
}`;
  }

  /**
   * Build prompt for Ollama analysis
   */
  private buildOllamaPrompt(description: string, cropType?: string): string {
    return `You are an agricultural extension officer. A farmer describes their crop problem:

"${description}"

Crop type: ${cropType || 'Unknown'}

Based on this description, provide:
1. Most likely disease diagnosis
2. Key management recommendations
3. Immediate action items

Keep response concise and practical.`;
  }

  /**
   * Fetch with timeout
   */
  private fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
      )
    ]);
  }

  /**
   * Check model availability
   */
  getAvailability(): { qwen: boolean; ollama: boolean } {
    return {
      qwen: this.isQwenAvailable,
      ollama: this.isOllamaAvailable
    };
  }

  /**
   * Re-check model availability
   */
  async refreshAvailability(): Promise<void> {
    await this.initializeHealthChecks();
  }

  /**
   * Prepare local setup instructions
   */
  getSetupInstructions(): string {
    return `
# Local Model Setup

## Qwen-VL Setup (GPU recommended)
\`\`\`bash
# Install with Docker
docker run -d --name qwen-vl \\
  --gpus all \\
  -p 8000:8000 \\
  qwen-vl:latest
\`\`\`

## Ollama Setup (CPU or GPU)
\`\`\`bash
# Download and run
curl https://ollama.ai/install.sh | sh
ollama pull llama2
ollama serve
\`\`\`

Both services will be available at localhost.
`;
  }
}

export { LocalModelService };
