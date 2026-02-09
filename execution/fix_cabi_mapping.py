import csv
import os
import shutil
from pathlib import Path
import re

def fix_cabi_mappings(workspace_root, extraction_root):
    csv_path = Path(workspace_root) / "krishiai-frontend" / "backend" / "datasets" / "cabi_plantwise" / "csv" / "cabi_diagnostic_database.csv"
    backup_path = csv_path.with_suffix(".csv.bak")
    
    project_images_dir = Path(workspace_root) / "krishiai-frontend" / "backend" / "datasets" / "cabi_plantwise" / "images"
    extracted_images_dir = Path(extraction_root) / "output" / "images"
    extracted_tables_dir = Path(extraction_root) / "output" / "tables"
    
    if not csv_path.exists():
        return f"Error: CSV not found at {csv_path}"
        
    print(f"Creating backup at {backup_path}")
    shutil.copy2(csv_path, backup_path)
    
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        records = list(reader)
    
    # Get available tables and images from extraction
    ext_tables = list(extracted_tables_dir.glob("*.json"))
    ext_images = list(extracted_images_dir.glob("*.png"))
    
    print(f"Syncing {len(ext_images)} images to project...")
    project_images_dir.mkdir(parents=True, exist_ok=True)
    for img in ext_images:
        shutil.copy2(img, project_images_dir / img.name)
        
    table_fixed = 0
    image_fixed = 0
    already_correct = 0
    
    for row in records:
        page = row.get("Page")
        category = row.get("Category", "").lower()
        img_path = row.get("Image_Path", "")
        
        # 1. Fix Table Mappings
        if category == "table" or "diagnostic_steps" in row.get("Issue_Type", ""):
            potential_table = f"page{page}_table1.json"
            if (extracted_tables_dir / potential_table).exists():
                new_label = potential_table.replace(".json", "")
                if row["Source_Label"] != new_label:
                    row["Source_Label"] = new_label
                    table_fixed += 1
            else:
                matching_tables = [t.stem for t in ext_tables if t.name.startswith(f"page{page}_table")]
                if matching_tables:
                    row["Source_Label"] = matching_tables[0]
                    table_fixed += 1

        # 2. Fix Image Paths (only if not a table record, or if specifically needed)
        if img_path:
            old_path = img_path
            img_idx = "1"
            idx_match = re.search(r"image_(\d+)", img_path)
            if idx_match:
                img_idx = idx_match.group(1)
            else:
                idx_match = re.search(r"image(\d+)\.png", img_path)
                if idx_match:
                    img_idx = idx_match.group(1)

            new_img_name = f"page{page}_image{img_idx}.png"
            
            if (project_images_dir / new_img_name).exists():
                row["Image_Path"] = f"images/{new_img_name}"
                # ONLY update source label if it's NOT a table record
                if category != "table":
                    row["Source_Label"] = new_img_name.replace(".png", "")
                
                if old_path != row["Image_Path"]:
                    image_fixed += 1
                else:
                    already_correct += 1
            else:
                fallback_img = f"page{page}_image1.png"
                if (project_images_dir / fallback_img).exists():
                    row["Image_Path"] = f"images/{fallback_img}"
                    if category != "table":
                        row["Source_Label"] = fallback_img.replace(".png", "")
                    image_fixed += 1


    # Write back
    with open(csv_path, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
        
    return {
        "tables_updated": table_fixed,
        "images_updated": image_fixed,
        "total_records": len(records)
    }

if __name__ == "__main__":
    workspace = r"c:\Users\SERVICING GURU\Desktop\krishiai"
    extraction = r"I:\pageindex\table_image_extraction"
    
    res = fix_cabi_mappings(workspace, extraction)
    print(f"\n=== MAPPING FIX COMPLETE ===")
    print(f"Table Labels Fixed: {res['tables_updated']}")
    print(f"Image Paths Fixed: {res['images_updated']}")
    print(f"Total Records Processed: {res['total_records']}")
    print(f"Images Synced to project directory.")
