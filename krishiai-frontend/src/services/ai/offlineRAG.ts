/**
 * Offline RAG System
 * Pre-downloads and indexes datasets for completely offline operation
 */

export interface OfflineRAGConfig {
  datasetPath: string;
  vectorDatabasePath: string;
  maxStorageSize: number; // MB
  autoSyncOnline: boolean;
}

export interface IndexedRecord {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    disease: string;
    crop: string;
    region: string;
  };
}

class OfflineRAGSystem {
  private vectorDatabase: Map<string, IndexedRecord> = new Map();
  private config: OfflineRAGConfig;
  private STORAGE_KEY = 'krishi_offline_rag';
  private isInitialized: boolean = false;

  constructor(config?: Partial<OfflineRAGConfig>) {
    this.config = {
      datasetPath: '/datasets',
      vectorDatabasePath: '/db',
      maxStorageSize: 50, // 50MB
      autoSyncOnline: true,
      ...config
    };
    this.initialize();
  }

  /**
   * Initialize offline RAG system
   */
  private async initialize(): Promise<void> {
    try {
      // Load cached vector database from IndexedDB or localStorage
      await this.loadVectorDatabase();
      this.isInitialized = true;
      console.log('Offline RAG System initialized');
    } catch (error) {
      console.error('Failed to initialize Offline RAG:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Load vector database from storage
   */
  private async loadVectorDatabase(): Promise<void> {
    try {
      // Try IndexedDB first (larger storage)
      const db = await this.openIndexedDB();
      if (db) {
        const records = await this.getAllFromIndexedDB(db);
        for (const record of records) {
          this.vectorDatabase.set(record.id, record);
        }
        return;
      }
    } catch (error) {
      console.warn('IndexedDB not available, falling back to localStorage');
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, value] of Object.entries(data)) {
          this.vectorDatabase.set(key, value as IndexedRecord);
        }
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
    }
  }

  /**
   * Open IndexedDB for large storage
   */
  private openIndexedDB(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('KrishiAI_OfflineRAG', 1);

        request.onerror = () => resolve(null);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('records')) {
            const store = db.createObjectStore('records', { keyPath: 'id' });
            store.createIndex('source', 'metadata.source', { unique: false });
            store.createIndex('disease', 'metadata.disease', { unique: false });
          }
        };
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Get all records from IndexedDB
   */
  private getAllFromIndexedDB(db: IDBDatabase): Promise<IndexedRecord[]> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readonly');
      const store = transaction.objectStore('records');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add record to offline database
   */
  async addRecord(record: IndexedRecord): Promise<void> {
    this.vectorDatabase.set(record.id, record);

    // Save to IndexedDB if available
    try {
      const db = await this.openIndexedDB();
      if (db) {
        const transaction = db.transaction('records', 'readwrite');
        const store = transaction.objectStore('records');
        store.put(record);
        return;
      }
    } catch (error) {
      console.warn('Failed to save to IndexedDB:', error);
    }

    // Fallback to localStorage
    this.saveToLocalStorage();
  }

  /**
   * Search offline database
   */
  search(query: string, limit: number = 5): IndexedRecord[] {
    const queryLower = query.toLowerCase();
    const results: Array<{ record: IndexedRecord; score: number }> = [];

    for (const record of this.vectorDatabase.values()) {
      let score = 0;

      // Match in disease name
      if (record.metadata.disease.toLowerCase().includes(queryLower)) {
        score += 0.5;
      }

      // Match in crop type
      if (record.metadata.crop.toLowerCase().includes(queryLower)) {
        score += 0.3;
      }

      // Match in content
      if (record.content.toLowerCase().includes(queryLower)) {
        score += 0.2;
      }

      if (score > 0) {
        results.push({ record, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.record);
  }

  /**
   * Get statistics about offline database
   */
  getStatistics(): {
    totalRecords: number;
    bySource: { [key: string]: number };
    byDisease: { [key: string]: number };
    estimatedSize: string;
  } {
    const bySource: { [key: string]: number } = {};
    const byDisease: { [key: string]: number } = {};
    let totalSize = 0;

    for (const record of this.vectorDatabase.values()) {
      bySource[record.metadata.source] =
        (bySource[record.metadata.source] || 0) + 1;
      byDisease[record.metadata.disease] =
        (byDisease[record.metadata.disease] || 0) + 1;

      totalSize += JSON.stringify(record).length;
    }

    return {
      totalRecords: this.vectorDatabase.size,
      bySource,
      byDisease,
      estimatedSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB'
    };
  }

  /**
   * Export database for backup
   */
  async exportDatabase(format: 'json' | 'csv' = 'json'): Promise<string> {
    const records = Array.from(this.vectorDatabase.values());

    if (format === 'json') {
      return JSON.stringify(records, null, 2);
    }

    // CSV export
    const headers = ['id', 'source', 'disease', 'crop', 'region'];
    const rows = records.map((r) => [
      r.id,
      r.metadata.source,
      r.metadata.disease,
      r.metadata.crop,
      r.metadata.region
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * Clear offline database
   */
  async clearDatabase(): Promise<void> {
    this.vectorDatabase.clear();

    try {
      const db = await this.openIndexedDB();
      if (db) {
        const transaction = db.transaction('records', 'readwrite');
        const store = transaction.objectStore('records');
        store.clear();
        return;
      }
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }

    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Sync with online datasets when connection available
   */
  async syncWithOnline(datasetRecords: any[]): Promise<void> {
    if (!this.config.autoSyncOnline) {
      return;
    }

    for (const record of datasetRecords) {
      const indexedRecord: IndexedRecord = {
        id: record.id,
        content: `${record.diseaseName} - ${record.symptoms.join(', ')}`,
        embedding: this.generateSimpleEmbedding(record.diseaseName),
        metadata: {
          source: record.source,
          disease: record.diseaseName,
          crop: record.cropType,
          region: record.region || 'Unknown'
        }
      };

      await this.addRecord(indexedRecord);
    }

    console.log(`Synced ${datasetRecords.length} records with offline database`);
  }

  /**
   * Simple embedding generation (in production, use actual embedding models)
   */
  private generateSimpleEmbedding(text: string): number[] {
    const embedding = new Array(128).fill(0);
    for (let i = 0; i < text.length; i++) {
      embedding[i % 128] += text.charCodeAt(i);
    }
    return embedding.map((v) => v / 255);
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      const data: { [key: string]: IndexedRecord } = {};
      for (const [key, value] of this.vectorDatabase) {
        data[key] = value;
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  /**
   * Check if offline system is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.vectorDatabase.size > 0;
  }

  /**
   * Get readiness status
   */
  getStatus(): {
    initialized: boolean;
    recordCount: number;
    ready: boolean;
    lastSync?: string;
  } {
    return {
      initialized: this.isInitialized,
      recordCount: this.vectorDatabase.size,
      ready: this.isReady(),
      lastSync: localStorage.getItem(`${this.STORAGE_KEY}_lastSync`) || undefined
    };
  }
}

export { OfflineRAGSystem };
