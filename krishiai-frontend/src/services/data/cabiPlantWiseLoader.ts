/**
 * CABI PlantWise Database Loader
 * Loads and manages the CABI PlantWise diagnostic database
 * with 412+ records, 124 extracted images, and crop-specific data
 */

export interface CABIRecord {
  id: number;
  page: number;
  category: 'pest' | 'disease' | 'nutrient' | 'abiotic';
  crop: string;
  issue_type: string;
  specific_name: string;
  pathogen_type?: string;
  symptoms: string;
  diagnostic_steps?: string;
  recommendations?: string;
  image_path: string;
  source_label: string;
  nearby_text?: string;
}

export interface CABIQueryResult {
  records: CABIRecord[];
  total_count: number;
  search_time_ms: number;
}

class CABIPlantWiseLoader {
  private database: Map<number, CABIRecord> = new Map();
  private indexByCrop: Map<string, number[]> = new Map();
  private indexByDisease: Map<string, number[]> = new Map();
  private indexByCategory: Map<string, number[]> = new Map();
  private isLoaded: boolean = false;
  private csvUrl: string;

  constructor(csvUrl: string = '/datasets/cabi_plantwise/csv/cabi_diagnostic_database.csv') {
    this.csvUrl = csvUrl;
  }

  /**
   * Load CSV data from backend
   */
  async loadDatabase(): Promise<void> {
    try {
      const response = await fetch(this.csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.statusText}`);
      }

      const csv = await response.text();
      this.parseCSV(csv);
      this.buildIndices();
      this.isLoaded = true;
      console.log(`CABI PlantWise database loaded: ${this.database.size} records`);
    } catch (error) {
      console.error('Failed to load CABI database:', error);
      throw error;
    }
  }

  /**
   * Parse CSV data
   */
  private parseCSV(csv: string): void {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');

    // Map headers to indices
    const headerMap: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      headerMap[header.trim()] = index;
    });

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      try {
        const row = this.parseCSVRow(lines[i]);
        if (row.length < headers.length) continue;

        const record: CABIRecord = {
          id: parseInt(row[headerMap['ID']] || '0'),
          page: parseInt(row[headerMap['Page']] || '0'),
          category: (row[headerMap['Category']] || 'disease') as any,
          crop: row[headerMap['Crop']] || 'General',
          issue_type: row[headerMap['Issue_Type']] || 'disease',
          specific_name: row[headerMap['Specific_Name']] || '',
          pathogen_type: row[headerMap['Pathogen/Pest/Nutrient_Type']] || undefined,
          symptoms: row[headerMap['Symptoms']] || '',
          diagnostic_steps: row[headerMap['Diagnostic_Steps']] || undefined,
          recommendations: row[headerMap['Recommendations']] || undefined,
          image_path: row[headerMap['Image_Path']] || '',
          source_label: row[headerMap['Source_Label']] || '',
          nearby_text: row[headerMap['Nearby_Text']] || undefined
        };

        this.database.set(record.id, record);
      } catch (error) {
        console.warn(`Error parsing row ${i}:`, error);
      }
    }
  }

  /**
   * Parse CSV row handling quoted fields
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
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Build search indices
   */
  private buildIndices(): void {
    for (const record of this.database.values()) {
      // Index by crop
      const cropKey = record.crop.toLowerCase();
      if (!this.indexByCrop.has(cropKey)) {
        this.indexByCrop.set(cropKey, []);
      }
      this.indexByCrop.get(cropKey)!.push(record.id);

      // Index by disease/specific name
      const diseaseKey = record.specific_name.toLowerCase();
      if (diseaseKey) {
        if (!this.indexByDisease.has(diseaseKey)) {
          this.indexByDisease.set(diseaseKey, []);
        }
        this.indexByDisease.get(diseaseKey)!.push(record.id);
      }

      // Index by category
      const categoryKey = record.category;
      if (!this.indexByCategory.has(categoryKey)) {
        this.indexByCategory.set(categoryKey, []);
      }
      this.indexByCategory.get(categoryKey)!.push(record.id);
    }
  }

  /**
   * Search by disease name
   */
  search(query: string): CABIQueryResult {
    const startTime = Date.now();
    const results: CABIRecord[] = [];
    const queryLower = query.toLowerCase();

    // Try exact match first
    let ids = this.indexByDisease.get(queryLower) || [];
    if (ids.length === 0) {
      // Try partial match
      for (const [key, recordIds] of this.indexByDisease) {
        if (key.includes(queryLower) || queryLower.includes(key)) {
          ids = [...ids, ...recordIds];
        }
      }
    }

    // Convert IDs to records
    const uniqueIds = new Set(ids);
    for (const id of uniqueIds) {
      const record = this.database.get(id);
      if (record) {
        results.push(record);
      }
    }

    return {
      records: results,
      total_count: results.length,
      search_time_ms: Date.now() - startTime
    };
  }

  /**
   * Search by crop
   */
  searchByCrop(crop: string): CABIQueryResult {
    const startTime = Date.now();
    const ids = this.indexByCrop.get(crop.toLowerCase()) || [];
    const results: CABIRecord[] = [];

    for (const id of ids) {
      const record = this.database.get(id);
      if (record) {
        results.push(record);
      }
    }

    return {
      records: results,
      total_count: results.length,
      search_time_ms: Date.now() - startTime
    };
  }

  /**
   * Search by category
   */
  searchByCategory(category: string): CABIQueryResult {
    const startTime = Date.now();
    const ids = this.indexByCategory.get(category as any) || [];
    const results: CABIRecord[] = [];

    for (const id of ids) {
      const record = this.database.get(id);
      if (record) {
        results.push(record);
      }
    }

    return {
      records: results,
      total_count: results.length,
      search_time_ms: Date.now() - startTime
    };
  }

  /**
   * Advanced search with multiple criteria
   */
  advancedSearch(criteria: {
    crop?: string;
    disease?: string;
    category?: string;
    pathogen?: string;
  }): CABIQueryResult {
    const startTime = Date.now();
    let results = Array.from(this.database.values());

    if (criteria.crop) {
      const crop = criteria.crop.toLowerCase();
      results = results.filter(r => r.crop.toLowerCase().includes(crop));
    }

    if (criteria.disease) {
      const disease = criteria.disease.toLowerCase();
      results = results.filter(r =>
        r.specific_name.toLowerCase().includes(disease) ||
        r.symptoms.toLowerCase().includes(disease)
      );
    }

    if (criteria.category) {
      results = results.filter(r => r.category === criteria.category);
    }

    if (criteria.pathogen) {
      const pathogen = criteria.pathogen.toLowerCase();
      results = results.filter(r =>
        r.pathogen_type?.toLowerCase().includes(pathogen)
      );
    }

    return {
      records: results,
      total_count: results.length,
      search_time_ms: Date.now() - startTime
    };
  }

  /**
   * Get record by ID
   */
  getRecord(id: number): CABIRecord | undefined {
    return this.database.get(id);
  }

  /**
   * Get all records
   */
  getAllRecords(): CABIRecord[] {
    return Array.from(this.database.values());
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total_records: number;
    by_crop: { [key: string]: number };
    by_category: { [key: string]: number };
    by_pathogen: { [key: string]: number };
    with_images: number;
    with_recommendations: number;
  } {
    const stats = {
      total_records: this.database.size,
      by_crop: {} as { [key: string]: number },
      by_category: {} as { [key: string]: number },
      by_pathogen: {} as { [key: string]: number },
      with_images: 0,
      with_recommendations: 0
    };

    for (const record of this.database.values()) {
      // Count by crop
      stats.by_crop[record.crop] = (stats.by_crop[record.crop] || 0) + 1;

      // Count by category
      stats.by_category[record.category] = (stats.by_category[record.category] || 0) + 1;

      // Count by pathogen
      if (record.pathogen_type) {
        stats.by_pathogen[record.pathogen_type] =
          (stats.by_pathogen[record.pathogen_type] || 0) + 1;
      }

      // Count with images
      if (record.image_path) {
        stats.with_images++;
      }

      // Count with recommendations
      if (record.recommendations) {
        stats.with_recommendations++;
      }
    }

    return stats;
  }

  /**
   * Check if database is loaded
   */
  isReady(): boolean {
    return this.isLoaded && this.database.size > 0;
  }

  /**
   * Export records to JSON
   */
  exportToJSON(): string {
    const records = this.getAllRecords();
    return JSON.stringify(records, null, 2);
  }

  /**
   * Export records to CSV
   */
  exportToCSV(): string {
    const records = this.getAllRecords();
    if (records.length === 0) return '';

    const headers = Object.keys(records[0]);
    const rows = records.map(record =>
      headers.map(header => {
        const value = (record as any)[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}

// Singleton instance
let cabiLoader: CABIPlantWiseLoader | null = null;

/**
 * Get CABI PlantWise loader instance
 */
export function getCABILoader(): CABIPlantWiseLoader {
  if (!cabiLoader) {
    cabiLoader = new CABIPlantWiseLoader();
  }
  return cabiLoader;
}

export { CABIPlantWiseLoader };
