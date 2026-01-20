# Render Deployment Guide

## Quick Deploy to Render

### Option 1: One-Click Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/sanjujohn8055/berlin-hamburg-corridor-analysis)

### Option 2: Manual Deployment

#### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended)

#### Step 2: Create PostgreSQL Database
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Name: `corridor-postgres`
4. Database Name: `corridor_analysis`
5. User: `corridor_user`
6. Plan: Free (for testing) or Starter ($7/month)
7. Click "Create Database"
8. **Important**: Copy the "External Database URL" for later

#### Step 3: Create Redis Instance
1. Click "New +" → "Redis"
2. Name: `corridor-redis`
3. Plan: Free (for testing) or Starter ($7/month)
4. Click "Create Redis"
5. **Important**: Copy the "Redis URL" for later

#### Step 4: Deploy Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `sanjujohn8055/berlin-hamburg-corridor-analysis`
3. Configure:
   - **Name**: `berlin-hamburg-corridor-analysis`
   - **Environment**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (for testing) or Starter ($7/month)

#### Step 5: Configure Environment Variables
Add these environment variables in the Render dashboard:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=[paste your PostgreSQL External Database URL]
REDIS_URL=[paste your Redis URL]
LOG_LEVEL=info
CACHE_TTL=3600
ANALYSIS_CACHE_TTL=1800
CORRIDOR_START_STATION=8011160
CORRIDOR_END_STATION=8002548
```

#### Step 6: Enable PostGIS Extension
1. Go to your PostgreSQL database in Render
2. Click "Connect" → "External Connection"
3. Use a PostgreSQL client (like pgAdmin or psql) to connect
4. Run: `CREATE EXTENSION IF NOT EXISTS postgis;`

#### Step 7: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy your app
3. Monitor the build logs for any issues

## Troubleshooting Common Issues

### Build Fails with Webpack Errors
If you get webpack compilation errors:

1. **Update your repository** with the fixed webpack config:
   ```bash
   git pull origin main
   ```

2. **Use the Render-specific Dockerfile**:
   - In Render dashboard, go to Settings
   - Set "Dockerfile Path" to `Dockerfile.render`

3. **Check build logs** for specific errors:
   - Look for TypeScript compilation errors
   - Check for missing dependencies

### Memory Issues During Build
If build fails due to memory limits:

1. **Upgrade to Starter plan** ($7/month) for more memory
2. **Or use the multi-stage Dockerfile**:
   - Set "Dockerfile Path" to `Dockerfile.render`

### Database Connection Issues
If app starts but can't connect to database:

1. **Verify DATABASE_URL format**:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```

2. **Check PostGIS extension**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'postgis';
   ```

3. **Test connection** from Render shell:
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

### Redis Connection Issues
If Redis connection fails:

1. **Verify REDIS_URL format**:
   ```
   redis://red-xxxxx:6379
   ```

2. **Check Redis status** in Render dashboard

## Expected Costs

### Free Tier (Testing)
- **Web Service**: Free (750 hours/month)
- **PostgreSQL**: Free (90 days, then $7/month)
- **Redis**: Free (90 days, then $7/month)
- **Total**: Free for 90 days

### Production Setup
- **Web Service**: $7/month (Starter)
- **PostgreSQL**: $7/month (Starter)
- **Redis**: $7/month (Starter)
- **Total**: $21/month

## Post-Deployment

### Your app will be available at:
`https://berlin-hamburg-corridor-analysis.onrender.com`

### API endpoints:
- Health check: `https://your-app.onrender.com/api/health`
- Stations: `https://your-app.onrender.com/api/stations`
- Priorities: `https://your-app.onrender.com/api/priorities/analysis`

### Monitoring
- Check logs in Render dashboard
- Set up health check monitoring
- Monitor database and Redis usage

## Custom Domain (Optional)
1. In Render dashboard, go to Settings
2. Add custom domain
3. Update DNS records as instructed
4. SSL certificate is automatically provided

## Automatic Deployments
- Render automatically deploys when you push to `main` branch
- Monitor deployments in the dashboard
- Rollback to previous versions if needed

## Performance Optimization
1. **Enable caching** with Redis
2. **Use CDN** for static assets
3. **Monitor performance** with Render metrics
4. **Scale up** if needed (higher plans available)

## Support
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Community**: [community.render.com](https://community.render.com)
- **GitHub Issues**: For app-specific problems