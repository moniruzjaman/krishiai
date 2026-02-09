# Krishi AI Master Directive

This document serves as the top-level orchestration guide for the Krishi AI project, following the 3-Layer Architecture.

## Project Structure
- `krishi-ai-backend/`: Fast API backend
- `krishiai-frontend/`: React + Vite frontend
- `directives/`: SOPs and planning documents
- `execution/`: Deterministic scripts for automation
- `.tmp/`: Intermediate data and processing files

## Deployment Strategy
- **Backend**: Deployed to Vercel as Python serverless functions.
- **Frontend**: Deployed to Vercel as a static site.
- **Database**: Supabase (PostgreSQL + Auth + Storage).

## Operating Principles
1. **Always check for existing tools** in `execution/` before writing new ones.
2. **Update directives** as new patterns or constraints are discovered.
3. **Use the .tmp/ folder** for all intermediate files; never commit them.
