---
description: Krishi AI Auto Deployment and Clean GitHub Push
---

# Krishi AI Deployment Agent Workflow

This workflow guides the AI in standardizing code, testing models, and deploying to Vercel/GitHub.

## Prerequisites

1. All AI Keys (Gemini, Supabase, Firebase) in active `.env` files must be valid.
2. The user has linked the Vercel project correctly.
3. Tests run without failing.

## Execution Flow

1. **Verify AI Key Integrity**
   - Run `python execution/verify_gemini_model.py`.
   - **IF** the API fails to respond or returns 400 Invalid Argument, STOP and report the exact error. Proceeding is prohibited.

2. **Standardize GitHub Push**
   - Check `.gitignore` contains `.env`, `node_modules`, `dist`, `.tmp`, and `execution/__pycache__`.
   - Run `git status`. Identify untracked docs and archive folders.
   - Run `git add .` to stage files.
   - Run a clean commit `git commit -m "Auto-deployment update including architecture scaffolding."`
   - Run `git push origin main`.

3. **Trigger Vercel Deployments**
   - Execute `vercel --prod` to deploy to Vercel.
   - Wait for the build process to finish successfully.

## Required Output

The agent must verify and report:

- **Git Push Status:** [Success/Failed]
- **Vercel Deploy Link:** [URL]
- **Gemini Health Test:** [Passed/Failed]
