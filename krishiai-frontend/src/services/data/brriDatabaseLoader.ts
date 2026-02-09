/**
 * BRRI Database Loader
 * Loads and manages BRRI rice varieties and production technologies
 * with 50+ varieties, seasons (Boro, Aman, Aus), and reference links
 */

export interface BRRIVariety {
  id: number;
  variety_name: string;
  season?: string;
  yield_potential?: string;
  growth_duration?: string;
  special_features?: string;
  pdf_url?: string;
}

export interface BRRIQueryResult {
  records: BRRIVariety[];
  total_count: number;
  search_time_ms: number;
}

class BRRIDatabaseLoader {
  private varieties: Map<number, BRRIVariety> = new Map();
  private indexByName: Map<string, number[]> = new Map();
  private indexBySeason: Map<string, number[]> = new Map();
  private indexByKeyword: Map<string, number[]> = new Map();
  private isLoaded: boolean = false;
  private csvUrl: string;

  constructor(csvUrl: string = '/datasets/brri/csv/brri_rice_varieties.csv') {
    this.csvUrl = csvUrl;
  }

  /**
   * Load CSV data from backend
   */
  async loadDatabase(): Promise<void> {
    try {
      const response = await fetch(this.csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to load BRRI CSV: ${response.statusText}`);
      }

      const csv = await response.text();
      this.parseCSV(csv);
      this.buildIndices();
      this.isLoaded = true;
      console.log(`BRRI database loaded: ${this.varieties.size} varieties`);
    } catch (error) {
      console.error('Failed to load BRRI database:', error);
      throw error;
    }
  }

  /**
   * Parse CSV data with proper quote handling
   */
  private parseCSV(csv: string): void {
    const lines = csv.split('\n');
    const headers = this.parseCSVRow(lines[0]);

    // Map headers to indices
    const headerMap: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      headerMap[header.trim()] = index;
    });

    // Parse data rows
    let recordId = 1;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      try {
        const row = this.parseCSVRow(lines[i]);
        if (row.length === 0) continue;

        // Extract fields safely
        const id = parseInt(row[headerMap['id']] || row[0]) || recordId;
        const variety_name = row[headerMap['variety_name']] || row[1] || '';

        if (!variety_name) continue; // Skip if no variety name

        const variety: BRRIVariety = {
          id: id,
          variety_name: variety_name.trim(),
          season: row[headerMap['season']] || row[2] || undefined,
          yield_potential: row[headerMap['yield_potential']] || row[3] || undefined,
          growth_duration: row[headerMap['growth_duration']] || row[4] || undefined,
          special_features: row[headerMap['special_features']] || row[5] || undefined,
          pdf_url: row[headerMap['pdf_url']] || row[6] || undefined
        };

        this.varieties.set(variety.id, variety);
        recordId++;
      } catch (error) {
        console.warn(`Failed to parse BRRI row ${i}:`, error);
        continue;
      }
    }
  }

  /**
   * Parse CSV row with proper quote handling
   */
  private parseCSVRow(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map(field => field.trim());
  }

  /**
   * Build search indices
   */
  private buildIndices(): void {
    this.varieties.forEach((variety, id) => {
      // Index by variety name (with normalization)
      const nameLower = variety.variety_name.toLowerCase();
      const nameKey = this.normalizeText(nameLower);
      if (!this.indexByName.has(nameKey)) {
        this.indexByName.set(nameKey, []);
      }
      this.indexByName.get(nameKey)!.push(id);

      // Index by season
      if (variety.season) {
        const seasonKey = variety.season.toLowerCase().trim();
        if (!this.indexBySeason.has(seasonKey)) {
          this.indexBySeason.set(seasonKey, []);
        }
        this.indexBySeason.get(seasonKey)!.push(id);
      }

      // Index keywords from variety name
      const keywords = this.extractKeywords(variety.variety_name);
      keywords.forEach(keyword => {
        if (!this.indexByKeyword.has(keyword)) {
          this.indexByKeyword.set(keyword, []);
        }
        this.indexByKeyword.get(keyword)!.push(id);
      });
    });
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * Extract keywords from variety name
   */
  private extractKeywords(text: string): string[] {
    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/);

    // Extract BRRI dhan numbers (e.g., "dhan28", "28")
    const keywords: string[] = [];
    words.forEach(word => {
      if (word) {
        keywords.push(word);
        // Also add partial matches for dhan numbers
        const match = word.match(/dhan(\d+)/i);
        if (match) {
          keywords.push(match[1]); // Add just the number
          keywords.push('dhan');
        }
      }
    });

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Search by variety name
   */
  async searchByName(query: string): Promise<BRRIQueryResult> {
    if (!this.isLoaded) await this.loadDatabase();

    const startTime = performance.now();
    const normalizedQuery = this.normalizeText(query);
    const results: BRRIVariety[] = [];

    // Exact match first
    if (this.indexByName.has(normalizedQuery)) {
      const ids = this.indexByName.get(normalizedQuery)!;
      ids.forEach(id => {
        const variety = this.varieties.get(id);
        if (variety) results.push(variety);
      });
    }

    // Partial matches
    if (results.length < 5) {
      this.indexByName.forEach((ids, key) => {
        if (key.includes(normalizedQuery) && key !== normalizedQuery) {
          ids.forEach(id => {
            const variety = this.varieties.get(id);
            if (variety && !results.find(r => r.id === variety.id)) {
              results.push(variety);
            }
          });
        }
      });
    }

    // Keyword matches
    if (results.length < 5) {
      const keywords = this.extractKeywords(query);
      keywords.forEach(keyword => {
        if (this.indexByKeyword.has(keyword)) {
          this.indexByKeyword.get(keyword)!.forEach(id => {
            const variety = this.varieties.get(id);
            if (variety && !results.find(r => r.id === variety.id)) {
              results.push(variety);
            }
          });
        }
      });
    }

    const endTime = performance.now();
    return {
      records: results.slice(0, 10),
      total_count: results.length,
      search_time_ms: Math.round(endTime - startTime)
    };
  }

  /**
   * Search by season (Boro, Aman, Aus)
   */
  async searchBySeason(season: string): Promise<BRRIQueryResult> {
    if (!this.isLoaded) await this.loadDatabase();

    const startTime = performance.now();
    const seasonKey = season.toLowerCase().trim();
    const results: BRRIVariety[] = [];

    if (this.indexBySeason.has(seasonKey)) {
      const ids = this.indexBySeason.get(seasonKey)!;
      ids.forEach(id => {
        const variety = this.varieties.get(id);
        if (variety) results.push(variety);
      });
    }

    const endTime = performance.now();
    return {
      records: results,
      total_count: results.length,
      search_time_ms: Math.round(endTime - startTime)
    };
  }

  /**
   * Get all varieties
   */
  async getAllVarieties(): Promise<BRRIQueryResult> {
    if (!this.isLoaded) await this.loadDatabase();

    const startTime = performance.now();
    const results = Array.from(this.varieties.values());
    const endTime = performance.now();

    return {
      records: results,
      total_count: results.length,
      search_time_ms: Math.round(endTime - startTime)
    };
  }

  /**
   * Get statistics about the database
   */
  async getStatistics(): Promise<{
    total_varieties: number;
    total_seasons: number;
    seasons: string[];
  }> {
    if (!this.isLoaded) await this.loadDatabase();

    const seasons = new Set<string>();
    this.varieties.forEach(variety => {
      if (variety.season) {
        seasons.add(variety.season.toLowerCase().trim());
      }
    });

    return {
      total_varieties: this.varieties.size,
      total_seasons: seasons.size,
      seasons: Array.from(seasons)
    };
  }

  /**
   * Check if loader is ready
   */
  isReady(): boolean {
    return this.isLoaded;
  }
}

// Export singleton instance
export const brriLoader = new BRRIDatabaseLoader();

export default BRRIDatabaseLoader;
