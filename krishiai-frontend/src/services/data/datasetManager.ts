/**
 * Dataset Management for RAG System
 * Handles CABI PlantWise, BRRI, and BARI datasets
 */

export interface DatasetRecord {
  id: string;
  cropType: string;
  diseaseName: string;
  scientificName?: string;
  symptoms: string[];
  management: ManagementInfo;
  imageUrl?: string;
  sourceUrl?: string;
  source: 'CABI' | 'BRRI' | 'BARI';
  region?: string;
  season?: string;
  relevanceKeywords: string[];
  severity?: 'low' | 'medium' | 'high';
}

export interface ManagementInfo {
  chemical: Array<{
    product: string;
    genericName: string;
    concentration: string;
    interval: string;
    precautions: string;
  }>;
  organic: Array<{
    product: string;
    concentration: string;
    interval: string;
  }>;
  cultural: string[];
  preventive: string[];
  bestTiming: string;
}

class DatasetManager {
  private cabiDatabase: DatasetRecord[] = [];
  private brriDatabase: DatasetRecord[] = [];
  private bariDatabase: DatasetRecord[] = [];
  private vectorIndex: Map<string, DatasetRecord[]> = new Map();
  private DATASET_KEY = 'krishi_datasets';
  private initialized = false;

  constructor() {
    this.loadDatasets();
  }

  /**
   * Load datasets from storage or initialize with sample data
   */
  private loadDatasets(): void {
    try {
      const stored = localStorage.getItem(this.DATASET_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.cabiDatabase = data.cabi || [];
        this.brriDatabase = data.brri || [];
        this.bariDatabase = data.bari || [];
        this.initialized = true;
        this.buildVectorIndex();
        return;
      }
    } catch (error) {
      console.warn('Failed to load datasets:', error);
    }

    // Initialize with sample/default datasets
    this.initializeSampleDatasets();
  }

  /**
   * Initialize with sample datasets (replace with real data download)
   */
  private initializeSampleDatasets(): void {
    // BRRI Sample Data (Rice Research Institute of Bangladesh)
    this.brriDatabase = [
      {
        id: 'brri_001',
        cropType: 'ধান (Rice)',
        diseaseName: 'ব্লাস্ট রোগ (Blast)',
        scientificName: 'Magnaporthe oryzae',
        symptoms: [
          'পাতায় চোখের মতো দাগ',
          'কান ঝুলে পড়া',
          'শীষ সম্পূর্ণ কালো হয়ে যাওয়া'
        ],
        management: {
          chemical: [
            {
              product: 'ট্রাইসাইক্লাজোল',
              genericName: 'Tricyclazole',
              concentration: '0.75%',
              interval: '7-10 days',
              precautions: 'ফুলের সময় এড়িয়ে চলুন'
            },
            {
              product: 'কার্বেন্ডাজিম',
              genericName: 'Carbendazim',
              concentration: '0.5%',
              interval: '7-10 days',
              precautions: 'স্প্রে করার সময় ঢেকে রাখুন'
            }
          ],
          organic: [
            {
              product: 'ট্রাইকোডার্মা',
              concentration: '1%',
              interval: '7 days'
            }
          ],
          cultural: [
            'সুস্থ বীজ ব্যবহার করুন',
            'সঠিক দূরত্বে চারা রোপণ করুন',
            'নিরাপদ পানি নিকাশ ব্যবস্থা'
          ],
          preventive: [
            'ধানের জমিতে নিরাপদ পানির উচ্চতা বজায় রাখুন',
            'অতিরিক্ত নাইট্রোজেন এড়ান',
            'সুস্থ বীজ তৈরি করুন'
          ],
          bestTiming: 'সকাল ৭-৯ টায়'
        },
        source: 'BRRI',
        region: 'Bangladesh',
        season: 'বর্ষা মৌসুম',
        relevanceKeywords: ['rice', 'blast', 'magnaporthe', 'eye-spot', 'ब्लास्ट'],
        severity: 'high'
      },
      {
        id: 'brri_002',
        cropType: 'ধান (Rice)',
        diseaseName: 'শিথি পাতা রোগ (Brown Spot)',
        scientificName: 'Drechslera oryzae',
        symptoms: [
          'পাতায় বাদামি দাগ',
          'অনিয়মিত আকার',
          'হলুদ পাড়'
        ],
        management: {
          chemical: [
            {
              product: 'ম্যানকোজেব',
              genericName: 'Mancozeb',
              concentration: '0.75%',
              interval: '10-12 days',
              precautions: 'বৃষ্টির পরে স্প্রে করুন'
            }
          ],
          organic: [
            {
              product: 'বর্ডো মিশ্রণ',
              concentration: '1%',
              interval: '10-12 days'
            }
          ],
          cultural: [],
          preventive: [],
          bestTiming: 'সকাল ৭-৯ টায়'
        },
        source: 'BRRI',
        region: 'Bangladesh',
        season: 'রবি ও আমন',
        relevanceKeywords: ['rice', 'brown spot', 'drechslera'],
        severity: 'medium'
      }
    ];

    // BARI Sample Data (Bangladesh Agricultural Research Institute)
    this.bariDatabase = [
      {
        id: 'bari_001',
        cropType: 'টমেটো (Tomato)',
        diseaseName: 'প্রাথমিক ধসা (Early Blight)',
        scientificName: 'Alternaria solani',
        symptoms: [
          'পুরানো পাতায় প্রথম দেখা দেয়',
          'গাঢ় ধূসর বা বাদামি দাগ',
          'গোলাকার দাগ সমকেন্দ্রীয় বলয়'
        ],
        management: {
          chemical: [
            {
              product: 'কপার অক্সিক্লোরাইড',
              genericName: 'Copper Oxychloride',
              concentration: '0.3%',
              interval: '7-10 days',
              precautions: 'ছত্রাক নাশকের সাথে মিশান না'
            }
          ],
          organic: [
            {
              product: 'জিঙ্ক সালফেট',
              concentration: '0.1%',
              interval: '7-10 days'
            }
          ],
          cultural: [
            'রোগী পাতা অপসারণ করুন',
            'মাটি থেকে ৩০ সেমি উপরে থেকে সেচ দিন'
          ],
          preventive: [
            'পাতার নীচে থেকে স্প্রে করুন',
            'রোগমুক্ত বীজ ব্যবহার করুন'
          ],
          bestTiming: 'সকাল ৮-১০ টায় এবং ঘুরে যাওয়ার আগে'
        },
        source: 'BARI',
        region: 'Bangladesh',
        season: 'সারা বছর',
        relevanceKeywords: ['tomato', 'early blight', 'alternaria'],
        severity: 'high'
      }
    ];

    // CABI Sample Data (Centre for Agriculture and Bioscience International - PlantWise)
    this.cabiDatabase = [
      {
        id: 'cabi_001',
        cropType: 'শাকসবজি (Vegetables)',
        diseaseName: 'পাতা ঝড়া রোগ (Leaf Spot)',
        scientificName: 'Cercospora spp.',
        symptoms: [
          'পাতায় ছোট গোলাকার দাগ',
          'রঙ হলুদ থেকে বাদামি',
          'দাগের চারপাশে হলুদ মুকুট'
        ],
        management: {
          chemical: [
            {
              product: 'ম্যানকোজেব',
              genericName: 'Mancozeb',
              concentration: '0.75%',
              interval: '10-14 days',
              precautions: 'নিয়মিত ছিটান'
            }
          ],
          organic: [
            {
              product: 'সালফার',
              concentration: '0.5%',
              interval: '10-14 days'
            }
          ],
          cultural: [
            'আক্রান্ত পাতা সরিয়ে ফেলুন',
            'ভালো বায়ু চলাচল নিশ্চিত করুন'
          ],
          preventive: [
            'ফসলের অবশেষ সরিয়ে ফেলুন',
            'বীজ থেকে উৎপন্ন রোগ এড়ান'
          ],
          bestTiming: 'ভোরবেলা এবং সন্ধ্যা'
        },
        source: 'CABI',
        region: 'South Asia',
        season: 'বর্ষাকাল',
        relevanceKeywords: ['vegetables', 'leaf spot', 'cercospora'],
        severity: 'medium'
      }
    ];

    this.saveDatasets();
    this.buildVectorIndex();
    this.initialized = true;
  }

  /**
   * Build vector index for semantic search
   */
  private buildVectorIndex(): void {
    const allRecords = [
      ...this.cabiDatabase,
      ...this.brriDatabase,
      ...this.bariDatabase
    ];

    for (const record of allRecords) {
      // Index by disease name
      const diseaseKey = record.diseaseName.toLowerCase();
      if (!this.vectorIndex.has(diseaseKey)) {
        this.vectorIndex.set(diseaseKey, []);
      }
      this.vectorIndex.get(diseaseKey)!.push(record);

      // Index by crop type
      const cropKey = record.cropType.toLowerCase();
      if (!this.vectorIndex.has(cropKey)) {
        this.vectorIndex.set(cropKey, []);
      }
      this.vectorIndex.get(cropKey)!.push(record);

      // Index by keywords
      for (const keyword of record.relevanceKeywords) {
        const keywordKey = keyword.toLowerCase();
        if (!this.vectorIndex.has(keywordKey)) {
          this.vectorIndex.set(keywordKey, []);
        }
        this.vectorIndex.get(keywordKey)!.push(record);
      }
    }
  }

  /**
   * Search datasets by disease name or crop type
   */
  searchByKeyword(query: string, source?: 'CABI' | 'BRRI' | 'BARI'): DatasetRecord[] {
    const results: DatasetRecord[] = [];
    const queryLower = query.toLowerCase();

    const vectorResults = this.vectorIndex.get(queryLower) || [];
    for (const record of vectorResults) {
      if (!source || record.source === source) {
        if (!results.find(r => r.id === record.id)) {
          results.push(record);
        }
      }
    }

    // Also search by similarity
    const allRecords = [
      ...this.cabiDatabase,
      ...this.brriDatabase,
      ...this.bariDatabase
    ];

    for (const record of allRecords) {
      if (source && record.source !== source) continue;

      const similarity = this.calculateSimilarity(queryLower, record);
      if (similarity > 0.3) {
        if (!results.find(r => r.id === record.id)) {
          results.push(record);
        }
      }
    }

    return results.sort((a, b) => {
      const simA = this.calculateSimilarity(queryLower, a);
      const simB = this.calculateSimilarity(queryLower, b);
      return simB - simA;
    });
  }

  /**
   * Calculate similarity score between query and record
   */
  private calculateSimilarity(query: string, record: DatasetRecord): number {
    let score = 0;

    // Exact match in disease name
    if (record.diseaseName.toLowerCase().includes(query)) score += 0.5;

    // Match in crop type
    if (record.cropType.toLowerCase().includes(query)) score += 0.3;

    // Match in keywords
    for (const keyword of record.relevanceKeywords) {
      if (keyword.toLowerCase().includes(query)) score += 0.2;
    }

    // Match in symptoms
    for (const symptom of record.symptoms) {
      if (symptom.toLowerCase().includes(query)) score += 0.15;
    }

    // Levenshtein distance-like matching
    const diseaseLower = record.diseaseName.toLowerCase();
    const similarity = this.levenshteinSimilarity(query, diseaseLower);
    score += similarity * 0.2;

    return Math.min(1, score);
  }

  /**
   * Calculate Levenshtein distance similarity
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxLen;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const track = new Array(str2.length + 1)
      .fill(null)
      .map(() => new Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    return track[str2.length][str1.length];
  }

  /**
   * Get all datasets
   */
  getAllRecords(source?: 'CABI' | 'BRRI' | 'BARI'): DatasetRecord[] {
    if (source === 'CABI') return this.cabiDatabase;
    if (source === 'BRRI') return this.brriDatabase;
    if (source === 'BARI') return this.bariDatabase;
    return [...this.cabiDatabase, ...this.brriDatabase, ...this.bariDatabase];
  }

  /**
   * Save datasets to storage
   */
  private saveDatasets(): void {
    try {
      localStorage.setItem(
        this.DATASET_KEY,
        JSON.stringify({
          cabi: this.cabiDatabase,
          brri: this.brriDatabase,
          bari: this.bariDatabase,
          lastUpdated: new Date().toISOString()
        })
      );
    } catch (error) {
      console.warn('Failed to save datasets:', error);
    }
  }

  /**
   * Add a new dataset record
   */
  addRecord(record: DatasetRecord): void {
    if (record.source === 'CABI') {
      this.cabiDatabase.push(record);
    } else if (record.source === 'BRRI') {
      this.brriDatabase.push(record);
    } else if (record.source === 'BARI') {
      this.bariDatabase.push(record);
    }
    this.saveDatasets();
    this.buildVectorIndex();
  }

  /**
   * Import datasets from CSV/JSON
   */
  async importDatasets(data: any[], source: 'CABI' | 'BRRI' | 'BARI'): Promise<void> {
    const records = data.map((item, idx) => ({
      id: `${source.toLowerCase()}_${idx}_${Date.now()}`,
      cropType: item.cropType || item.crop || '',
      diseaseName: item.diseaseName || item.disease || '',
      scientificName: item.scientificName || '',
      symptoms: Array.isArray(item.symptoms) ? item.symptoms : (item.symptoms || '').split(','),
      management: item.management || { chemical: [], organic: [], cultural: [], preventive: [], bestTiming: '' },
      imageUrl: item.imageUrl || '',
      sourceUrl: item.sourceUrl || '',
      source,
      region: item.region || 'Bangladesh',
      season: item.season || '',
      relevanceKeywords: Array.isArray(item.keywords) ? item.keywords : (item.keywords || '').split(','),
      severity: item.severity || 'medium'
    } as DatasetRecord));

    if (source === 'CABI') {
      this.cabiDatabase.push(...records);
    } else if (source === 'BRRI') {
      this.brriDatabase.push(...records);
    } else if (source === 'BARI') {
      this.bariDatabase.push(...records);
    }

    this.saveDatasets();
    this.buildVectorIndex();
  }

  /**
   * Check if datasets are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Load data from CABI PlantWise loader
   */
  async loadCABIData(): Promise<number> {
    try {
      const { getCABILoader } = await import('./cabiPlantWiseLoader');
      const cabiLoader = getCABILoader();
      const result = await cabiLoader.search('');

      // Convert CABI records to DatasetRecord format
      result.records.forEach((cabiRecord: any) => {
        const record: DatasetRecord = {
          id: `cabi_${cabiRecord.id}`,
          cropType: cabiRecord.crop || 'General',
          diseaseName: cabiRecord.specific_name || cabiRecord.issue_type || '',
          scientificName: cabiRecord.pathogen_type,
          symptoms: cabiRecord.symptoms ? [cabiRecord.symptoms] : [],
          management: {
            chemical: [],
            organic: [],
            cultural: cabiRecord.recommendations ? [cabiRecord.recommendations] : [],
            preventive: cabiRecord.diagnostic_steps ? [cabiRecord.diagnostic_steps] : [],
            bestTiming: ''
          },
          imageUrl: cabiRecord.image_path || '',
          sourceUrl: `https://plantwise.org/cabi/${cabiRecord.id}`,
          source: 'CABI',
          region: 'Global',
          season: '',
          relevanceKeywords: [
            cabiRecord.crop?.toLowerCase() || '',
            cabiRecord.issue_type?.toLowerCase() || '',
            cabiRecord.category?.toLowerCase() || ''
          ].filter(k => k),
          severity: 'medium'
        };

        if (!this.cabiDatabase.find(r => r.id === record.id)) {
          this.cabiDatabase.push(record);
        }
      });

      this.saveDatasets();
      this.buildVectorIndex();
      return result.total_count;
    } catch (error) {
      console.error('Failed to load CABI data:', error);
      return 0;
    }
  }

  /**
   * Load data from BRRI database loader
   */
  async loadBRRIData(): Promise<number> {
    try {
      const { brriLoader } = await import('./brriDatabaseLoader');
      const result = await brriLoader.getAllVarieties();

      // Convert BRRI records to DatasetRecord format
      result.records.forEach((variety: any) => {
        const record: DatasetRecord = {
          id: `brri_${variety.id}`,
          cropType: 'Rice (ধান)',
          diseaseName: `BRRI ${variety.variety_name}`,
          scientificName: '',
          symptoms: variety.special_features ? [variety.special_features] : [],
          management: {
            chemical: [],
            organic: [],
            cultural: [
              `Yield Potential: ${variety.yield_potential || 'N/A'}`,
              `Growth Duration: ${variety.growth_duration || 'N/A'}`
            ].filter(f => f),
            preventive: [],
            bestTiming: variety.season || ''
          },
          imageUrl: '',
          sourceUrl: variety.pdf_url || 'https://brri.org',
          source: 'BRRI',
          region: 'Bangladesh',
          season: variety.season || '',
          relevanceKeywords: [
            'rice',
            'brri',
            variety.variety_name?.toLowerCase() || '',
            variety.season?.toLowerCase() || ''
          ].filter(k => k),
          severity: 'low'
        };

        if (!this.brriDatabase.find(r => r.id === record.id)) {
          this.brriDatabase.push(record);
        }
      });

      this.saveDatasets();
      this.buildVectorIndex();
      return result.total_count;
    } catch (error) {
      console.error('Failed to load BRRI data:', error);
      return 0;
    }
  }

  /**
   * Load data from BARI database loader
   */
  async loadBARIData(): Promise<number> {
    try {
      const { bariLoader } = await import('./bariDatabaseLoader');
      const result = await bariLoader.getAllCrops();

      // Convert BARI records to DatasetRecord format
      result.records.forEach((crop: any) => {
        const record: DatasetRecord = {
          id: `bari_${crop.id}`,
          cropType: crop.name_english || crop.category || '',
          diseaseName: crop.variety || crop.name_english || '',
          scientificName: crop.name_bengali,
          symptoms: crop.disease_management ?
            [crop.disease_management.substring(0, 200)] : [],
          management: {
            chemical: [],
            organic: [],
            cultural: [
              crop.disease_management || ''
            ].filter(d => d),
            preventive: [
              `Soil Type: ${crop.soil_type || ''}`,
              `Irrigation: ${crop.irrigation_needs || ''}`,
              `Fertilizer: ${crop.fertilizer_requirements || ''}`
            ].filter(f => f.includes(':')),
            bestTiming: crop.planting_time || ''
          },
          imageUrl: '',
          sourceUrl: 'https://bari.gov.bd',
          source: 'BARI',
          region: 'Bangladesh',
          season: crop.season || '',
          relevanceKeywords: [
            crop.name_english?.toLowerCase() || '',
            crop.name_bengali?.toLowerCase() || '',
            crop.category?.toLowerCase() || '',
            crop.variety?.toLowerCase() || ''
          ].filter(k => k),
          severity: 'medium'
        };

        if (!this.bariDatabase.find(r => r.id === record.id)) {
          this.bariDatabase.push(record);
        }
      });

      this.saveDatasets();
      this.buildVectorIndex();
      return result.total_count;
    } catch (error) {
      console.error('Failed to load BARI data:', error);
      return 0;
    }
  }

  /**
   * Load all datasets from loaders
   */
  async loadAllDatasets(): Promise<{ cabi: number; brri: number; bari: number }> {
    const cabiCount = await this.loadCABIData();
    const brriCount = await this.loadBRRIData();
    const bariCount = await this.loadBARIData();

    return { cabi: cabiCount, brri: brriCount, bari: bariCount };
  }

  /**
   * Get database statistics
   */
  getStatistics(): {
    total: number;
    cabi: number;
    brri: number;
    bari: number;
  } {
    return {
      total: this.cabiDatabase.length + this.brriDatabase.length + this.bariDatabase.length,
      cabi: this.cabiDatabase.length,
      brri: this.brriDatabase.length,
      bari: this.bariDatabase.length
    };
  }
}

export { DatasetManager };
