# Railway Deployment Guide

## Quick Deploy to Railway

### 1. One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### 2. Manual Deployment Steps

#### Prerequisites
- GitHub account
- Railway account (free tier available)

#### Step-by-Step Process

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for Railway deployment"
   git push origin main
   ```

2. **Create Railway Project**:
   - Visit [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add Services**:
   - **PostgreSQL**: Click "Add Service" → "PostgreSQL"
   - **Redis**: Click "Add Service" → "Redis"

4. **Configure Environment Variables**:
   ```env
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   PORT=${{RAILWAY_STATIC_PORT}}
   STADA_API_KEY=your_api_key_here
   TIMETABLES_API_KEY=your_api_key_here
   LOG_LEVEL=info
   CACHE_TTL=3600
   ANALYSIS_CACHE_TTL=1800
   CORRIDOR_START_STATION=8011160
   CORRIDOR_END_STATION=8002548
   ```

5. **Enable PostGIS**:
   - Go to PostgreSQL service in Railway
   - Click "Connect" → "Query"
   - Run: `CREATE EXTENSION IF NOT EXISTS postgis;`

6. **Initialize Database**:
   - The app will automatically run the database initialization
   - Check logs to ensure successful startup

### 3. Expected Costs
- **Free Tier**: $5/month credit (sufficient for development)
- **Pro Plan**: $20/month (for production use)
- **Database**: ~$2-5/month depending on usage
- **Total**: Free for testing, ~$25/month for production

### 4. Post-Deployment
- Your app will be available at: `https://your-app-name.railway.app`
- API endpoints: `https://your-app-name.railway.app/api/health`
- Monitor logs in Railway dashboard

### 5. Custom Domain (Optional)
- In Railway project settings
- Add custom domain
- Update DNS records as instructed

## Alternative: Railway CLI Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgresql

# Add Redis  
railway add redis

# Deploy
railway up
```

## Troubleshooting

### Common Issues:
1. **Build Fails**: Check Node.js version in Dockerfile
2. **Database Connection**: Verify DATABASE_URL format
3. **Port Issues**: Ensure PORT uses ${{RAILWAY_STATIC_PORT}}
4. **PostGIS Missing**: Run CREATE EXTENSION postgis manually

### Health Check:
- Visit: `https://your-app.railway.app/api/health`
- Should return: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`