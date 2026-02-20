# Cloudflare Pages Deployment Guide

## Project Built Successfully ✅

The project has been built and the production files are in the `dist` folder.

## Manual Deployment Steps

### Option 1: Direct Upload (Recommended for Quick Deploy)

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/4a2230e358905ad039e6ee0014fc9ce1/home/domains)
2. Click on **"Create application"** → **"Pages"** → **"Upload assets"**
3. Enter a project name (e.g., `krishiai`)
4. Drag and drop the `dist` folder OR click to browse and select the `dist` folder
5. Click **"Deploy site"**
6. Wait for deployment to complete
7. Your site will be available at `https://krishiai.pages.dev`

### Option 2: Connect to Git Repository

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/4a2230e358905ad039e6ee0014fc9ce1/home/domains)
2. Click on **"Create application"** → **"Pages"** → **"Connect to Git"**
3. Authorize Cloudflare to access your GitHub/GitLab repository
4. Select your `krishiai` repository
5. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (or leave empty)
6. Add environment variables if needed:
   - `API_KEY` - Your API key
   - `SUPABASE_KEY` - Your Supabase key
7. Click **"Save and Deploy"**

## Environment Variables

Make sure to set these in Cloudflare Pages Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `API_KEY` | Your Gemini API key |
| `SUPABASE_KEY` | Your Supabase anon key |

## Custom Domain (Optional)

After deployment:
1. Go to your project → **Custom domains**
2. Click **"Set up a custom domain"**
3. Enter your domain (e.g., `krishiai.com`)
4. Follow DNS configuration instructions

## Build Output

The `dist` folder contains:
- `index.html` - Main entry point
- `assets/` - JavaScript, CSS, and other assets
- `icon-192.svg`, `icon-512.svg` - PWA icons

## Troubleshooting

If you encounter issues:
1. Check build logs in Cloudflare dashboard
2. Ensure all environment variables are set
3. Verify the `dist` folder exists and contains files
4. Check for any CORS issues with API calls

## Quick Deploy Command (if you have API token)

```bash
npx wrangler pages deploy dist --project-name=krishiai
```
