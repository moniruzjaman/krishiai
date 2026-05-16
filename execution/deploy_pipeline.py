import os
import sys
import subprocess
from dotenv import load_dotenv

def run_cmd(cmd, cwd=None):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, text=True)
    if result.returncode != 0:
        print(f"Command Failed: {cmd}")
        sys.exit(1)
    return result

def deploy_project():
    print("Starting deployment pipeline...")
    
    # Check Gemini API before continuing
    print("Step 1: Validating API Keys")
    run_cmd("python verify_gemini_model.py", cwd="execution")
    
    print("Step 2: Checking Git Status & Push")
    # For automated script, we could push here. Currently just testing the status.
    run_cmd("git status")
    
    # Assuming user has already setup Vercel
    print("Step 3: Deploying Frontend & Backend")
    print("Note: Run 'deploy.bat' or 'npm run build' / 'vercel --prod'")
    # run_cmd("deploy.bat") # Example deployment
    
    print("Deployment pipeline validated successfully.")

if __name__ == "__main__":
    deploy_project()
