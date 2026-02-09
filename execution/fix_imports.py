import os
import re

def fix_imports(directory):
    # Replacements for components (one level up from services)
    component_replacements = {
        r"(['\"])\.\./services/(geminiService|huggingfaceService|localModelService)(['\"])": r"\1../services/ai/\2\3",
        r"(['\"])\.\./services/(locationService|apiService|backendService|firebase|shareService|supabase|weatherService|marketService)(['\"])": r"\1../services/utils/\2\3",
    }

    # Replacements for services (when they import each other or types)
    service_replacements = {
        r"(['\"])\.\./types(['\"])": r"\1../../types\2",
        r"(['\"])\.\. /services/": r"\1../", # Fix if someone tried ../services/ from inside services/
    }

    # Replacements for root src files (e.g. App.tsx)
    root_replacements = {
        r"(['\"])\./services/(geminiService|huggingfaceService|localModelService)(['\"])": r"\1./services/ai/\2\3",
        r"(['\"])\./services/(locationService|apiService|backendService|firebase|shareService|supabase|weatherService|marketService)(['\"])": r"\1./services/utils/\2\3",
    }

    for root, dirs, files in os.walk(directory):
        is_in_service_subdir = any(x in root for x in ['ai', 'utils', 'data', 'quota'])
        is_in_components = 'components' in root
        is_root = root == directory

        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()

                new_content = content
                
                if is_in_components:
                    for pattern, replacement in component_replacements.items():
                        new_content = re.sub(pattern, replacement, new_content)
                elif is_in_service_subdir:
                    for pattern, replacement in service_replacements.items():
                        new_content = re.sub(pattern, replacement, new_content)
                elif is_root:
                    for pattern, replacement in root_replacements.items():
                        new_content = re.sub(pattern, replacement, new_content)

                if new_content != content:
                    print(f"Fixing imports in: {path}")
                    with open(path, 'w', encoding='utf-8', newline='') as f:
                        f.write(new_content)

if __name__ == "__main__":
    frontend_src = r"c:\Users\SERVICING GURU\Desktop\krishiai\krishiai-frontend\src"
    fix_imports(frontend_src)
