/**
 * BARI Database Loader
 * Loads and manages BARI crop database with 1,671 crop records
 * Supports both English and Bengali names, seasons, disease management,
 * and comprehensive cultivation information
 */

export interface BARICrop {
  id: number;
  name_english: string;
  name_bengali: string;
  category: string;
  variety: string;
  season?: string;
  planting_time?: string;
  harvest_time?: string;
  soil_type?: string;
  irrigation_needs?: string;
  fertilizer_requirements?: string;
  disease_resistance?: string;
  yield_potential?: string;
  temperature_range?: string;
  humidity_range?: string;
  rainfall_requirements?: string;
  soil_ph_range?: string;
  sunlight_needs?: string;
  disease_management?: string;
}

export interface BARIQueryResult {
  records: BARICrop[];
  total_count: number;
  search_time_ms: number;
}

export interface BARIStatistics {
  total_crops: number;
  total_categories: number;
  categories: string[];
  top_crops_by_records: string[];
}

class BARIDatabaseLoader {
  private crops: Map<number, BARICrop> = new Map();
  private indexByNameEnglish: Map<string, number[]> = new Map();
  private indexByNameBengali: Map<string, number[]> = new Map();
  private indexByCategory: Map<string, number[]> = new Map();
  private indexByVariety: Map<string, number[]> = new Map();
  private indexByKeyword: Map<string, number[]> = new Map();
  private isLoaded: boolean = false;
  private csvUrl: string;

  constructor(csvUrl: string = '/datasets/bari/csv/bari_crops_database.csv') {
    this.csvUrl = csvUrl;
  }

  /**
   * Load CSV data from backend
   */
  async loadDatabase(): Promise<void> {
    try {
      const response = await fetch(this.csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to load BARI CSV: ${response.statusText}`);
      }

      const csv = await response.text();
      this.parseCSV(csv);
      this.buildIndices();
      this.isLoaded = true;
      console.log(`BARI database loaded: ${this.crops.size} crops`);
    } catch (error) {
      console.error('Failed to load BARI database:', error);
      throw error;
    }
  }

  /**
   * Parse CSV data with proper quote and Bengali text handling
   */
  private parseCSV(csv: string): void {
    const lines = csv.split('\n');
    const headers = this.parseCSVRow(lines[0]);

    // Map headers to indices
    const headerMap: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      headerMap[header.trim().toLowerCase()] = index;
    });

    // Parse data rows
    let recordId = 1;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      try {
        const row = this.parseCSVRow(lines[i]);
        if (row.length === 0) continue;

        // Extract fields safely - handle both English and Bengali column names
        const name_english = row[headerMap['name (english)']] || 
                            row[headerMap['name_english']] || 
                            row[1] || '';

        if (!name_english) continue; // Skip if no crop name

        // Extract all fields with flexible column mapping
        const crop: BARICrop = {
          id: parseInt(row[headerMap['id']] || row[0]) || recordId,
          name_english: name_english.trim(),
          name_bengali: row[headerMap['name (bengali)']] || 
                       row[headerMap['name_bengali']] || 
                       row[2] || '',
          category: row[headerMap['category']] || row[3] || '',
          variety: row[headerMap['variety']] || row[4] || '',
          season: row[headerMap['season']] || row[5] || undefined,
          planting_time: row[headerMap['planting time']] || 
                        row[headerMap['planting_time']] || 
                        row[6] || undefined,
          harvest_time: row[headerMap['harvest time']] || 
                       row[headerMap['harvest_time']] || 
                       row[7] || undefined,
          soil_type: row[headerMap['soil type']] || 
                    row[headerMap['soil_type']] || 
                    row[8] || undefined,
          irrigation_needs: row[headerMap['irrigation needs']] || 
                           row[headerMap['irrigation_needs']] || 
                           row[9] || undefined,
          fertilizer_requirements: row[headerMap['fertilizer requirements']] || 
                                  row[headerMap['fertilizer_requirements']] || 
                                  row[10] || undefined,
          disease_resistance: row[headerMap['disease resistance']] || 
                             row[headerMap['disease_resistance']] || 
                             row[11] || undefined,
          yield_potential: row[headerMap['yield potential']] || 
                          row[headerMap['yield_potential']] || 
                          row[12] || undefined,
          temperature_range: row[headerMap['temperature range']] || 
                            row[headerMap['temperature_range']] || 
                            row[13] || undefined,
          humidity_range: row[headerMap['humidity range']] || 
                         row[headerMap['humidity_range']] || 
                         row[14] || undefined,
          rainfall_requirements: row[headerMap['rainfall requirements']] || 
                                row[headerMap['rainfall_requirements']] || 
                                row[15] || undefined,
          soil_ph_range: row[headerMap['soil ph range']] || 
                        row[headerMap['soil_ph_range']] || 
                        row[16] || undefined,
          sunlight_needs: row[headerMap['sunlight needs']] || 
                         row[headerMap['sunlight_needs']] || 
                         row[17] || undefined,
          disease_management: row[headerMap['disease_management']] || row[18] || undefined
        };

        this.crops.set(crop.id, crop);
        recordId++;
      } catch (error) {
        console.warn(`Failed to parse BARI row ${i}:`, error);
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
    this.crops.forEach((crop, id) => {
      // Index by English name
      if (crop.name_english) {
        const nameKey = this.normalizeText(crop.name_english);
        if (!this.indexByNameEnglish.has(nameKey)) {
          this.indexByNameEnglish.set(nameKey, []);
        }
        this.indexByNameEnglish.get(nameKey)!.push(id);
      }

      // Index by Bengali name
      if (crop.name_bengali) {
        const bengaliKey = crop.name_bengali.trim();
        if (!this.indexByNameBengali.has(bengaliKey)) {
          this.indexByNameBengali.set(bengaliKey, []);
        }
        this.indexByNameBengali.get(bengaliKey)!.push(id);
      }

      // Index by category
      if (crop.category) {
        const categoryKey = crop.category.toLowerCase().trim();
        if (!this.indexByCategory.has(categoryKey)) {
          this.indexByCategory.set(categoryKey, []);
        }
        this.indexByCategory.get(categoryKey)!.push(id);
      }

      // Index by variety
      if (crop.variety) {
        const varietyKey = this.normalizeText(crop.variety);
        if (!this.indexByVariety.has(varietyKey)) {
          this.indexByVariety.set(varietyKey, []);
        }
        this.indexByVariety.get(varietyKey)!.push(id);
      }

      // Extract keywords from disease management text
      if (crop.disease_management) {
        const keywords = this.extractDiseaseKeywords(crop.disease_management);
        keywords.forEach(keyword => {
          if (!this.indexByKeyword.has(keyword)) {
            this.indexByKeyword.set(keyword, []);
          }
          this.indexByKeyword.get(keyword)!.push(id);
        });
      }
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
   * Extract disease/pest names from disease management text
   * Looks for patterns like "রোগবালাই:", "পোকামাকড়:", disease names, etc.
   */
  private extractDiseaseKeywords(text: string): string[] {
    const keywords: string[] = [];

    // Split by common delimiters in Bengali agricultural text
    const parts = text.split(/[:,।\n]/);

    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed.length > 2 && trimmed.length < 50) {
        // Extract meaningful keywords (exclude very short words and very long descriptions)
        const normalized = this.normalizeText(trimmed);
        if (normalized) {
          keywords.push(normalized);
          // Also add individual words as keywords
          normalized.split(/\s+/).forEach(word => {
            if (word.length > 2) {
              keywords.push(word);
            }
          });
        }
      }
    });

    // Add common disease keywords in English and Bengali
    const diseasePatterns = [
      /blight|ধাঁয়া/i,
      /bud rot|গোড়া পঁচা|root rot/i,
      /leaf spot|পাতার দাগ/i,
      /wilting|শিকড় পচা/i,
      /powdery mildew|পাউডারি মিলডিউ/i,
      /rust|মরিচা|রাষ্ট/i,
      /leaf curl|পাতা কুঁকড়ানো/i,
      /stem rot|কাণ্ড পচা/i,
      /anthracnose|অ্যান্থ্রাকনোজ/i,
      /sheath blight|পাতার খোলস ঝলসা/i
    ];

    diseasePatterns.forEach(pattern => {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        if (match) {
          keywords.push(this.normalizeText(match[0]));
        }
      }
    });

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Search by crop name (English)
   */
  async searchByName(query: string): Promise<BARIQueryResult> {
    if (!this.isLoaded) await this.loadDatabase();

    const startTime = performance.now();
    const normalizedQuery = this.normalizeText(query);
    const results: BARICrop[] = [];

    // Exact match first
    if (this.indexByNameEnglish.has(normalizedQuery)) {
      const ids = this.indexByNameEnglish.get(normalizedQuery)!;
      ids.forEach(id => {
        const crop = this.crops.get(id);
        if (crop) results.push(crop);
      });
    }

    // Partial matches
    if (results.length < 10) {
      this.indexByNameEnglish.forEach((ids, key) => {
        if (key.includes(normalizedQuery) && key !== normalizedQuery) {
          ids.forEach(id => {
            const crop = this.crops.get(id);
            if (crop && !results.find(r => r.id === crop.id)) {
              results.push(crop);
            }
          });
        }
      });
    }

    const endTime = performance.now();
    return {
      records: results.slice(0, 20),
      total_count: results.length,
      search_time_ms: Math.round(endTime - startTime)
    };
  }

  /**
   * Search by Bengali name
   */
  async searchByBengaliName(query: string): Promise<BARIQueryResult> {
    if (!this.isLoaded) await this.loadDatabase();

    const startTime = performance.now();
    const results: BARICrop[] = [];

    // Exact and partial matches for Bengali names
    this.indexByNameBengali.forEach((ids, key) => {
      if (key.includes(query)) {
        ids.forEach(id => {
          const crop = this.crops.get(id);
          if (crop && !results.find(r => r.id === crop.id)) {
            results.push(crop);
          }
        });
      }
    });

    const endTime = performance.now();
    return {
      records: results.slice(0, 20),
      total_count: results.length,
      search_time_ms: Math.round(endTime - startTime)
    };
  }

  /**
   * Search by category (Cereal, Vegetable, etc.)
   */
  async searchByCategory(category: string): Promise<BARIQueryResult> {
    if (!this.isLoaded) await this.loadDatabase();

    const startTime = performance.now();
    const categoryKey = category.toLowerCase().trim();
    const results: BARICrop[] = [];

    if (this.indexByCategory.has(categoryKey)) {
      const ids = this.indexByCategory.get(categoryKey)!;
      ids.forEach(id => {
        const crop = this.crops.get(id);
        if (crop) results.push(crop);
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
   * Search by disease/pest keywords
   */
  async searchByDisease(disease: string): Promise<BARIQueryResult> {
    if (!this.isLoaded) await this.loadDatabase();

    const startTime = performance.now();
    const normalizedQuery = this.normalizeText(disease);
    const results: BARICrop[] = [];

    // Search keywords extracted from disease management text
    if (this.indexByKeyword.has(normalizedQuery)) {
      const ids = this.indexByKeyword.get(normalizedQuery)!;
      ids.forEach(id => {
        const crop = this.crops.get(id);
        if (crop && !results.find(r => r.id === crop.id)) {
          results.push(crop);
        }
      });
    }

    // Search all keyword variations
    if (results.length < 10) {
      this.indexByKeyword.forEach((ids, key) => {
        if (key.includes(normalizedQuery) && key !== normalizedQuery) {
          ids.forEach(id => {
            const crop = this.crops.get(id);
            if (crop && !results.find(r => r.id === crop.id)) {
              results.push(crop);
            }
          });
        }
      });
    }

    const endTime = performance.now();
    return {
      records: results.slice(0, 20),
      total_count: results.length,
      search_time_ms: Math.round(endTime - startTime)
    };
  }

  /**
   * Get all crops in a category
   */
  async getByCategory(category: string): Promise<BARIQueryResult> {
    return this.searchByCategory(category);
  }

  /**
   * Get all crops
   */
  async getAllCrops(): Promise<BARIQueryResult> {
    if (!this.isLoaded) await this.loadDatabase();

    const startTime = performance.now();
    const results = Array.from(this.crops.values());
    const endTime = performance.now();

    return {
      records: results,
      total_count: results.length,
      search_time_ms: Math.round(endTime - startTime)
    };
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<BARIStatistics> {
    if (!this.isLoaded) await this.loadDatabase();

    const categories = new Set<string>();
    const categoryCount = new Map<string, number>();

    this.crops.forEach(crop => {
      if (crop.category) {
        categories.add(crop.category);
        const key = crop.category.toLowerCase();
        categoryCount.set(key, (categoryCount.get(key) || 0) + 1);
      }
    });

    // Get top 10 most common crops by variety
    const varietyCount = new Map<string, number>();
    this.crops.forEach(crop => {
      if (crop.variety) {
        const key = crop.variety.toLowerCase();
        varietyCount.set(key, (varietyCount.get(key) || 0) + 1);
      }
    });

    const topCrops = Array.from(varietyCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    return {
      total_crops: this.crops.size,
      total_categories: categories.size,
      categories: Array.from(categories).sort(),
      top_crops_by_records: topCrops
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
export const bariLoader = new BARIDatabaseLoader();

export default BARIDatabaseLoader;
