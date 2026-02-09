import csv
import os
import json
from pathlib import Path

def check_cabi_dataset(workspace_root, extraction_root):
    csv_path = Path(workspace_root) / "krishiai-frontend" / "backend" / "datasets" / "cabi_plantwise" / "csv" / "cabi_diagnostic_database.csv"
    images_dir = Path(workspace_root) / "krishiai-frontend" / "backend" / "datasets" / "cabi_plantwise" / "images"
    
    extracted_images_dir = Path(extraction_root) / "output" / "images"
    extracted_tables_dir = Path(extraction_root) / "output" / "tables"
    
    report = {
        "summary": {},
        "missing_images": [],
        "table_source_mismatches": [],
        "stats": {
            "total_records": 0,
            "category_counts": {},
            "records_with_images": 0
        }
    }
    
    if not csv_path.exists():
        return f"Error: CSV file not found at {csv_path}"
    
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        records = list(reader)
        
    report["stats"]["total_records"] = len(records)
    
    for row in records:
        cat = row.get("Category", "unknown")
        report["stats"]["category_counts"][cat] = report["stats"]["category_counts"].get(cat, 0) + 1
        
        # Check Image
        img_path = row.get("Image_Path", "")
        if img_path:
            report["stats"]["records_with_images"] += 1
            # img_path is relative like "images/page15_image1.png"
            local_img_file = images_dir / Path(img_path).name
            if not local_img_file.exists():
                report["missing_images"].append({
                    "id": row.get("ID"),
                    "path": img_path,
                    "reason": "File missing in project images directory"
                })
        
        # Check Table consistency
        if cat == "table":
            source_label = row.get("Source_Label", "")
            # Check if source_label matches any file in extraction
            found_table = False
            # Try matching with .json extension
            tbl_file = extracted_tables_dir / f"{source_label}.json"
            if tbl_file.exists():
                found_table = True
            else:
                # Try simple match if source_label is complex
                # E.g. Diagnostic-Field-Guide_pg16_table_1_rows15cols2
                for f in extracted_tables_dir.glob("*.json"):
                    if source_label in f.name or f.stem in source_label:
                        found_table = True
                        break
            
            if not found_table:
                report["table_source_mismatches"].append({
                    "id": row.get("ID"),
                    "source_label": source_label,
                    "page": row.get("Page")
                })

    # Summary stats
    report["summary"] = {
        "csv_path": str(csv_path),
        "total_records": len(records),
        "images_in_project": len(list(images_dir.glob("*"))),
        "extracted_images": len(list(extracted_images_dir.glob("*"))),
        "extracted_tables": len(list(extracted_tables_dir.glob("*")))
    }
    
    return report

if __name__ == "__main__":
    workspace = r"c:\Users\SERVICING GURU\Desktop\krishiai"
    extraction = r"I:\pageindex\table_image_extraction"
    
    result = check_cabi_dataset(workspace, extraction)
    
    print("=== CABI DATASET CHECK REPORT ===")
    print(f"Total Records: {result['summary']['total_records']}")
    print(f"Images in Project: {result['summary']['images_in_project']}")
    print(f"Extracted Images (I:): {result['summary']['extracted_images']}")
    print(f"Extracted Tables (I:): {result['summary']['extracted_tables']}")
    print("\nCategory Distribution:")
    for cat, count in result['stats']['category_counts'].items():
        print(f"  - {cat}: {count}")
    
    if result['missing_images']:
        print(f"\n[!] Missing Images ({len(result['missing_images'])}):")
        for m in result['missing_images'][:10]:
            print(f"  - ID {m['id']}: {m['path']}")
        if len(result['missing_images']) > 10:
            print(f"  ... and {len(result['missing_images']) - 10} more.")
    else:
        print("\n[V] All referenced images found in project.")
        
    if result['table_source_mismatches']:
        print(f"\n[!] Table Source Failures ({len(result['table_source_mismatches'])}):")
        for m in result['table_source_mismatches'][:10]:
            print(f"  - ID {m['id']}: Label '{m['source_label']}' (Page {m['page']})")
        if len(result['table_source_mismatches']) > 10:
            print(f"  ... and {len(result['table_source_mismatches']) - 10} more.")
    else:
        print("\n[V] All table labels matched extracted files.")
