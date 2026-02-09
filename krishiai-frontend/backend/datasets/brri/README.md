# BRRI (Bangladesh Rice Research Institute) Dataset

## Overview

This directory will contain the BRRI diagnostic database with rice disease information specific to Bangladesh.

## Current Status

**Placeholder Structure** - Ready for data integration

### Directory Structure

```
brri/
├── csv/
│   └── [placeholder] brri_diagnostic_database.csv (TO BE ADDED)
├── images/
│   └── [placeholder] Rice disease diagnostic images (TO BE ADDED)
└── pdfs/
    └── [placeholder] BRRI source documents (TO BE ADDED)
```

## Data to Integrate

### From BRRI Sources
- BRRI Technical Bulletins on rice diseases
- BRRI field guide images
- BRRI recommended varieties & disease resistance
- BRRI integrated pest management guidelines
- Regional disease occurrence data

### Expected Coverage
- **Diseases**: Blast, brown spot, leaf scald, tungro, sheath blight, etc.
- **Pests**: Rice stem borer, gall midge, plant hoppers, armyworm, etc.
- **Regions**: All Bangladesh agro-ecological zones
- **Varieties**: Modern BRRI varieties (BRRI dhan 1-100+)
- **Seasons**: Aus, aman, boro rice

## Data Schema

Expected CSV format (same as CABI):

```csv
ID,Crop,Disease_Name,Scientific_Name,Symptoms,Management_Chemical,Management_Organic,Cultural_Practices,Image_Path,Source,Region,Season
```

### Recommended Fields
- Disease identification
- Symptom descriptions
- Severity ratings
- Management options (chemical & organic)
- Cultural practices
- Prevention strategies
- Regional suitability
- Seasonal occurrence
- Recommended BRRI varieties

## Integration Timeline

1. **Phase 1**: Collect BRRI technical bulletins
2. **Phase 2**: Extract images and data
3. **Phase 3**: Format to CSV schema
4. **Phase 4**: Load into orchestration service
5. **Phase 5**: Integrate with Analyzer UI

## Contact & Sources

**BRRI (Bangladesh Rice Research Institute)**
- Website: https://brri.gov.bd
- Location: Gazipur, Bangladesh
- Contact: Technical advisory services
- Publications: Available for agricultural extension

**Expected Data Providers**
- BRRI Research & Development Division
- BRRI Extension Services
- Regional BRRI field stations
- Agricultural universities

## Placeholder Files

To start data collection, create:

1. **brri_sample.csv**
   ```csv
   ID,Crop,Disease_Name,Symptoms,Management,Image_Path
   1,Rice,Blast,"Brown spots with gray center",Tricyclazole spray,page1_image1.png
   ```

2. **brri_metadata.json**
   ```json
   {
     "source": "Bangladesh Rice Research Institute",
     "coverage": "All Bangladesh regions",
     "last_updated": "2025-02-03",
     "total_diseases": 0,
     "total_images": 0
   }
   ```

## Notes for Data Keepers

- Keep images in **images/** subdirectory
- CSV files in **csv/** subdirectory
- Original PDFs in **pdfs/** subdirectory
- Update README when data added
- Follow CABI CSV schema for compatibility
- Include Bengali translation where possible
- Add regional occurrence data

---

**Status**: Ready for BRRI data integration
**Estimated Records**: 50-100 rice disease records
**Estimated Images**: 100+ diagnostic images
**Target Completion**: Q1 2025
