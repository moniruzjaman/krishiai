# BARI (Bangladesh Agricultural Research Institute) Dataset

## Overview

This directory will contain the BARI diagnostic database with vegetable and crop disease information specific to Bangladesh.

## Current Status

**Placeholder Structure** - Ready for data integration

### Directory Structure

```
bari/
├── csv/
│   └── [placeholder] bari_diagnostic_database.csv (TO BE ADDED)
├── images/
│   └── [placeholder] Vegetable disease diagnostic images (TO BE ADDED)
└── pdfs/
    └── [placeholder] BARI source documents (TO BE ADDED)
```

## Data to Integrate

### From BARI Sources
- BARI Technical Bulletins on vegetable diseases
- BARI crop research publications
- BARI recommended varieties & disease resistance
- BARI integrated pest management guidelines
- Regional disease occurrence data for Bangladesh

### Expected Coverage

**Vegetables (Primary)**
- Tomato: Early/late blight, bacterial wilt, leaf curl
- Potato: Late blight, early blight, leaf roll virus
- Onion: Purple blotch, anthracnose, downy mildew
- Cauliflower: Black rot, clubroot, alternaria leaf spot
- Cabbage: Clubroot, alternaria, diamond-back moth
- Eggplant: Fruit rot, leaf spot, phomopsis
- Chili: Leaf curl, anthracnose, bacterial spot
- Brinjal: Various fungal and bacterial diseases

**Field Crops (Secondary)**
- Maize: Leaf diseases, stalk rots, ear rots
- Mustard: White rust, alternaria, downy mildew
- Lentil: Rust, wilt, leaf spot
- Chickpea: Ascochyta blight, botrytis gray mold

## Data Schema

Expected CSV format (same as CABI):

```csv
ID,Crop,Disease_Name,Scientific_Name,Symptoms,Management_Chemical,Management_Organic,Cultural_Practices,Image_Path,Source,Region,Season
```

### Recommended Fields for BARI
- Disease identification (English & Bengali)
- Symptom descriptions with severity levels
- Pathogen information
- Management options:
  - Chemical spray recommendations with dosages
  - Organic alternatives
  - Cultural control measures
  - Host resistance/variety recommendations
- Prevention strategies
- Seasonal occurrence (Rabi, Kharif, Summer)
- Regional suitability (6 agro-ecological zones)
- Recommended BARI vegetable varieties

## Integration Timeline

1. **Phase 1**: Collect BARI technical bulletins & publications
2. **Phase 2**: Extract images from publications
3. **Phase 3**: Format data to CSV schema
4. **Phase 4**: Load into orchestration service
5. **Phase 5**: Integrate with Analyzer UI
6. **Phase 6**: Add Bengali translations

## Contact & Sources

**BARI (Bangladesh Agricultural Research Institute)**
- Website: https://bari.gov.bd
- Location: Dhaka, Bangladesh
- Divisions: Vegetable, Field crops, Plant pathology
- Contact: Research & Extension Services
- Publications: Available for agricultural use

**Expected Data Providers**
- BARI Vegetable Research Division
- BARI Crop Protection Division
- BARI Regional Research Stations
- Agricultural universities (SAU)

## Placeholder Files

To start data collection, create:

1. **bari_sample.csv**
   ```csv
   ID,Crop,Disease_Name,Symptoms,Management_Chemical,Management_Organic,Image_Path
   1,Tomato,Early Blight,"Brown spots with concentric rings","Mancozeb 0.75%","Bordeaux 1%",page1_image1.png
   ```

2. **bari_metadata.json**
   ```json
   {
     "source": "Bangladesh Agricultural Research Institute",
     "crops": ["Tomato", "Potato", "Onion", "Cauliflower", "Eggplant"],
     "coverage": "All Bangladesh agroecological zones",
     "last_updated": "2025-02-03",
     "total_diseases": 0,
     "total_images": 0,
     "languages": ["English", "Bengali"]
   }
   ```

## Regional Coverage

BARI data should cover Bangladesh's **6 Agroecological Zones**:

1. **Himalayan foothills zone** (Bandarban, Chittagong Hill Tracts)
2. **East Bengal flood plain** (Sunamganj, Sylhet)
3. **Old Brahmaputra river plain** (Mymensingh, Sherpur)
4. **Ganges river flood plain** (Dhaka, Narayanganj)
5. **Ganges Tidal Flood Plain** (Khulna, Barisal)
6. **Coastal Saline Zone** (Cox's Bazar, Patuakhali)

Each zone has specific:
- Rainfall patterns
- Soil types
- Prevalent diseases
- Suitable vegetable varieties

## Notes for Data Keepers

- Keep images in **images/** subdirectory
- CSV files in **csv/** subdirectory
- Original PDFs in **pdfs/** subdirectory
- Follow CABI CSV schema for compatibility
- **PRIORITY**: Include Bengali translations (बंगला/Bangla)
- Add regional suitability data
- Include seasonal occurrence information
- Cross-reference with BRRI data where applicable
- Add dosage/concentration for chemical treatments
- Include organic alternatives for each chemical

## Expected Data Volume

| Item | Estimate |
|------|----------|
| Vegetable diseases | 100+ records |
| Field crop diseases | 30+ records |
| Pest records | 50+ records |
| Diagnostic images | 150+ images |
| Management options | 200+ combinations |
| Total CSV size | 200-300 KB |
| Total image size | 600 MB |

## Quality Assurance

Before integration, verify:
- ✓ All crop names are consistent
- ✓ Scientific names are correct
- ✓ Dosages are accurate
- ✓ Regional suitability is covered
- ✓ Images are high-quality (PNG/JPG)
- ✓ Bengali text is properly formatted
- ✓ References to BRRI/CABI data are noted

## Related Data Sources

- **BRRI**: Rice-specific diseases (separate dataset)
- **CABI PlantWise**: International crop disease database
- **SAU**: Sher-e-Bangla Agricultural University publications
- **FAO**: Regional crop protection guidelines

---

**Status**: Ready for BARI data integration
**Estimated Records**: 150-200 disease records
**Estimated Images**: 150+ diagnostic images
**Target Completion**: Q1-Q2 2025
**Priority**: Tomato, Potato, Onion (high-value crops)
