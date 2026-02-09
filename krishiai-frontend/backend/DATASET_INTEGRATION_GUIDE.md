# Backend Datasets Integration Guide

## Overview

The Krishi AI backend uses three main agricultural disease databases:

1. **CABI PlantWise** (International) - ✅ 412 records + 124 images (READY)
2. **BRRI** (Bangladesh Rice) - ⏳ Placeholder (TO BE FILLED)
3. **BARI** (Bangladesh Agriculture) - ⏳ Placeholder (TO BE FILLED)

## Directory Structure

```
backend/datasets/
├── cabi_plantwise/          ✅ COMPLETE (412 records, 124 images)
│   ├── csv/
│   │   └── cabi_diagnostic_database.csv
│   ├── images/              (124 PNG files)
│   └── pdfs/                (source documents)
├── brri/                    ⏳ PLACEHOLDER
│   ├── csv/
│   │   └── [brri_database.csv]
│   ├── images/
│   └── pdfs/
└── bari/                    ⏳ PLACEHOLDER
    ├── csv/
    │   └── [bari_database.csv]
    ├── images/
    └── pdfs/
```

## CABI PlantWise Database (COMPLETE)

### What's Included

```
✅ cabi_diagnostic_database.csv
   - 412 diagnostic records
   - Crops: Wheat, Rice, Maize, Sorghum, General
   - Categories: Pest, Disease, Nutrient, Abiotic
   - Fields: ID, Page, Category, Crop, Issue_Type, Specific_Name, 
            Pathogen_Type, Symptoms, Diagnostic_Steps, Recommendations,
            Image_Path, Source_Label, Nearby_Text

✅ 124 Extracted Images
   - page1_image1.png - General diagnostic process
   - page15_image*.png - Wheat diagnostic keys
   - page20_image*.png - Pest identification scale (14 images)
   - page30_image*.png - Rice diseases (35 images)
   - page36_image*.png - Maize diseases (95 images)
   - page46_image*.png - Sorghum diseases (12+ images)
```

### How to Use CABI Data

**In Frontend:**
```typescript
import { getCABILoader } from '@/services/cabiPlantWiseLoader';

const cabiLoader = getCABILoader();
await cabiLoader.loadDatabase(); // Loads from /datasets/cabi_plantwise/csv/...

// Search for disease
const results = cabiLoader.search('Early Blight');

// Get image paths
const imageUrl = `/datasets/cabi_plantwise/images/${results.records[0].image_path}`;
```

**In RAG System:**
```typescript
// Within orchestrationService.ts RAGSystem class
const cabiResults = this.searchKeyword(diagnosis);
sources.push(...cabiResults.map(record => ({
  source: 'CABI_PLANTWISE',
  title: record.specific_name,
  url: `/datasets/cabi_plantwise/images/${record.image_path}`,
  excerpt: record.symptoms.substring(0, 200)
})));
```

**In Backend Server:**
```python
import csv

# Load CABI database
records = []
with open('backend/datasets/cabi_plantwise/csv/cabi_diagnostic_database.csv') as f:
    reader = csv.DictReader(f)
    records = list(reader)

# Search database
def search_cabi(disease_name):
    return [r for r in records if disease_name.lower() in r['Specific_Name'].lower()]
```

## BRRI Database (TO BE INTEGRATED)

### What Needs to be Added

```
📋 brri_diagnostic_database.csv (TO ADD)
   Expected format: Same as CABI
   Expected content:
   - Rice diseases (40+ records): Blast, brown spot, sheath blight, tungro, etc.
   - Rice pests (20+ records): Stem borer, gall midge, hoppers, etc.
   - Bangladesh-specific information
   - Regional occurrence data
   - BRRI variety information

📸 Rice Diagnostic Images (TO ADD)
   Expected: 80-120 diagnostic images
   Should include:
   - Symptom photographs
   - Microscopic views
   - Healthy vs affected plants
   - Scale references

📄 Source Documents (TO ADD)
   - BRRI Technical Bulletins
   - BRRI Research Publications
   - BRRI Recommended Varieties Guide
   - Field guide PDFs
```

### BRRI Data Sources

**Official BRRI Resources:**
- Website: https://brri.gov.bd
- Published Technical Bulletins
- BRRI Annual Reports
- Variety Recommendation Guides
- Extension Materials

**Related Sources:**
- BRRI Training Materials
- Field Station Reports
- Demonstration Project Data
- Farmer Training Guides

### Expected CSV Format for BRRI

```csv
ID,Crop,Disease_Name,Scientific_Name,Symptoms,Severity_Level,
Management_Chemical,Chemical_Dosage,Management_Organic,
Cultural_Practices,Preventive_Measures,Recommended_Variety,
Regional_Occurrence,Season,Image_Path,Source,Notes_Bengali
```

## BARI Database (TO BE INTEGRATED)

### What Needs to be Added

```
📋 bari_diagnostic_database.csv (TO ADD)
   Expected format: Same as CABI
   Expected content:
   - Vegetable diseases (80+ records): Tomato, Potato, Onion, Cauliflower, etc.
   - Field crop diseases (20+ records): Maize, Mustard, Lentil, etc.
   - Bangladesh-specific information
   - Regional adaptation data
   - BARI variety recommendations

📸 Vegetable Diagnostic Images (TO ADD)
   Expected: 100-150 diagnostic images
   Should include:
   - Disease symptoms on vegetables
   - Pest damage photographs
   - Healthy plant references
   - Magnified images for diagnostics

📄 Source Documents (TO ADD)
   - BARI Technical Bulletins
   - BARI Research Publications
   - Vegetable Growing Guides
   - Integrated Pest Management Manuals
```

### BARI Data Sources

**Official BARI Resources:**
- Website: https://bari.gov.bd
- Technical Publications
- Vegetable Growing Guides
- Variety Catalog
- Extension Bulletins

**Related Sources:**
- SAU (Sher-e-Bangla Agricultural University)
- Regional BARI Stations
- Agricultural Extension Office
- Farmer Training Materials

### Expected CSV Format for BARI

```csv
ID,Crop,Disease_Name,Scientific_Name,Symptoms,Severity_Scale,
Management_Chemical,Chemical_Dosage,Spray_Interval,Management_Organic,
Cultural_Practices,Preventive_Measures,Recommended_BARI_Variety,
Agroecological_Zone,Season,Image_Path,Source,Notes_Bengali,Keywords
```

## Integration Steps

### Step 1: Prepare CSV Files

1. **Create CSV from source documents**
   ```python
   # Example script to convert data
   import csv
   
   data = [
       {
           'ID': 1,
           'Crop': 'Rice',
           'Disease_Name': 'Blast',
           'Scientific_Name': 'Magnaporthe oryzae',
           'Symptoms': 'Eye-shaped lesions on leaves...',
           'Management_Chemical': 'Tricyclazole',
           'Chemical_Dosage': '0.75%',
           'Image_Path': 'images/rice_blast_01.png'
       }
   ]
   
   with open('brri_diagnostic_database.csv', 'w') as f:
       writer = csv.DictWriter(f, fieldnames=data[0].keys())
       writer.writeheader()
       writer.writerows(data)
   ```

2. **Place CSV in correct directory**
   ```bash
   cp brri_diagnostic_database.csv backend/datasets/brri/csv/
   cp bari_diagnostic_database.csv backend/datasets/bari/csv/
   ```

### Step 2: Organize Images

1. **Extract images from source PDFs**
   ```bash
   # Using Python with fitz/PyMuPDF
   python scripts/extract_images_from_pdf.py \
     --input brri_guide.pdf \
     --output backend/datasets/brri/images/
   ```

2. **Verify image quality and naming**
   ```bash
   # Check images
   ls backend/datasets/brri/images/ | wc -l
   ```

### Step 3: Create Loaders

Similar to CABI, create loaders for BRRI and BARI:

```typescript
// src/services/brriDatabaseLoader.ts
export class BRRIDatabaseLoader {
  async loadDatabase(csvUrl: string): Promise<void> {
    // Similar to CABIPlantWiseLoader
  }
}

// src/services/bariDatabaseLoader.ts
export class BARIDatabaseLoader {
  async loadDatabase(csvUrl: string): Promise<void> {
    // Similar to CABIPlantWiseLoader
  }
}
```

### Step 4: Integrate with RAG System

Update `datasetManager.ts` to include all three databases:

```typescript
async groundDiagnosis(diagnosis, cropType, confidence) {
  // Search all three databases
  const cabiResults = this.cabiSearch(diagnosis);
  const brriResults = this.brriSearch(diagnosis, cropType);
  const bariResults = this.bariSearch(diagnosis, cropType);
  
  return [...cabiResults, ...brriResults, ...bariResults];
}
```

### Step 5: Update Frontend

- Add dataset selector in Analyzer UI
- Show dataset source badges
- Enable comparative diagnosis
- Link to source images

## Data Quality Checklist

Before deploying new datasets:

- [ ] CSV file is valid and complete
- [ ] All image paths are correct and accessible
- [ ] Scientific names are verified
- [ ] Dosages/concentrations are accurate
- [ ] Regional information is accurate
- [ ] Bengali translations are correct (if applicable)
- [ ] Images are good quality (PNG/JPG, >200px)
- [ ] No duplicate records
- [ ] All links work
- [ ] Permissions/licenses are clear

## Deployment Checklist

### Frontend
- [ ] CABI loader working
- [ ] BRRI loader implemented
- [ ] BARI loader implemented
- [ ] All images accessible
- [ ] Search functionality working

### Backend
- [ ] CSV files served correctly
- [ ] Images served correctly
- [ ] Indexing completed
- [ ] Cache warmed
- [ ] API endpoints tested

### Performance
- [ ] Search <100ms
- [ ] Image load <1s
- [ ] Database load <2s
- [ ] No memory issues

## Monitoring & Maintenance

**Weekly:**
- Check data completeness
- Verify image links
- Monitor search performance
- Check for duplicate records

**Monthly:**
- Update statistics
- Review user searches
- Identify gaps in data
- Plan new data collection

**Quarterly:**
- Add new datasets
- Improve data quality
- Expand regional coverage
- Update documentation

## Future Enhancements

1. **Add More Datasets**
   - Horticulture crops (mango, banana, papaya)
   - Spice crops (chili, turmeric, ginger)
   - Fisheries (aquatic diseases)
   - Livestock (animal diseases)

2. **Improve Data Quality**
   - Add more diagnostic steps
   - Add more management recommendations
   - Add cost-benefit analysis
   - Add farmer testimonials

3. **Regional Expansion**
   - Expand to all South Asian countries
   - Add region-specific data
   - Add seasonal calendars
   - Add weather-based recommendations

4. **Language Support**
   - Bengali translations
   - Regional dialects
   - Audio support
   - Pictorial guides

## Support & Resources

**Dataset Questions:**
- CABI: info@cabi.org
- BRRI: publications@brri.gov.bd
- BARI: publications@bari.gov.bd

**Technical Help:**
- See `README.md` in each dataset directory
- Check orchestrationService implementation
- Review datasetManager code

---

**Last Updated**: Feb 3, 2025
**Status**: CABI Complete ✅ | BRRI Ready ⏳ | BARI Ready ⏳
**Estimated Total Coverage**: 600+ diseases | 350+ images | Bangladesh focused
