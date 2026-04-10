# Deployment Guide

## Frontend Deployment (GitHub Pages)

### Step 1: Create GitHub Repository

1. Create a new repository on GitHub named `better-pota`
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/better-pota.git
   git push -u origin main
   ```

### Step 2: Configure GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages" section
3. Set source to "GitHub Actions"
4. Create the workflow file below

### Step 3: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## Backend Deployment (Cloudflare Workers)

### Step 1: Set up Cloudflare Account

1. Create a Cloudflare account if you don't have one
2. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

3. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```

### Step 2: Create KV Namespace

1. Create a KV namespace for caching:
   ```bash
   wrangler kv:namespace create "POTA_CACHE"
   ```

2. Update the namespace ID in `workers/api-worker/wrangler.toml`

### Step 3: Deploy Worker

1. Navigate to the worker directory:
   ```bash
   cd workers/api-worker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy:
   ```bash
   wrangler deploy
   ```

### Step 4: Update Frontend API URL

After deploying the worker, update the API base URL in `src/scripts/api.js`:

```javascript
const API_BASE_URL = 'https://your-worker.your-account.workers.dev';
```

## Environment Setup

### Required Services

- **GitHub** - Free account for hosting
- **Cloudflare** - Free account for Workers and KV

### Free Tier Limits

- **GitHub Pages**: Unlimited sites, 100GB/month bandwidth
- **Cloudflare Workers**: 100,000 requests/day
- **Cloudflare KV**: 1,000,000 reads/day, 10GB storage

## Testing Deployment

1. **Frontend**: Visit `https://your-username.github.io/better-pota`
2. **Backend**: Test worker endpoints:
   - `GET /health` - Should return `{"status":"ok"}`
   - `GET /location/US-GA/parks` - Should return parks data

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure worker returns proper CORS headers
2. **API errors**: Check worker logs in Cloudflare dashboard
3. **Build failures**: Verify Node.js version and dependencies
4. **Map not loading**: Check browser console for JavaScript errors

### Performance Tips

1. Enable compression on Cloudflare Worker
2. Use appropriate cache TTLs for different data types
3. Implement progressive loading for large regions
4. Use marker clustering for better performance

## Monitoring

- **GitHub Pages**: Check repository insights for traffic
- **Cloudflare Workers**: Monitor request counts and errors
- **Browser**: Use browser dev tools to monitor API calls