import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { Logger } from './utils/Logger';
import { DatabaseService } from './services/DatabaseService';
import { CacheService } from './services/CacheService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const logger = Logger.getInstance();

// Initialize services
let dbService: DatabaseService;
let cacheService: CacheService;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client')));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Middleware to inject services into request
app.use((req, res, next) => {
  (req as any).services = {
    database: dbService,
    cache: cacheService
  };
  next();
});

// Import API routes
import stationsRouter from './routes/stations';
import prioritiesRouter from './routes/priorities';
import configRouter from './routes/config';
import riskZonesRouter from './routes/risk-zones';

// API Routes
app.use('/api/stations', stationsRouter);
app.use('/api/priorities', prioritiesRouter);
app.use('/api/config', configRouter);
app.use('/api/risk-zones', riskZonesRouter);

// Catch-all handler for React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  });
}

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize services and start server
async function startServer() {
  try {
    logger.info('Starting Berlin-Hamburg Corridor Analysis Server...');
    
    // Initialize database connection
    dbService = new DatabaseService();
    const dbConnected = await dbService.testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    logger.info('Database connected successfully');
    
    // Initialize cache service
    cacheService = new CacheService();
    await cacheService.connect();
    logger.info('Cache service connected successfully');
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Berlin-Hamburg Corridor Analysis API is ready');
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    if (dbService) {
      await dbService.close();
    }
    
    if (cacheService) {
      await cacheService.close();
    }
    
    logger.info('Services disconnected successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    if (dbService) {
      await dbService.close();
    }
    
    if (cacheService) {
      await cacheService.close();
    }
    
    logger.info('Services disconnected successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();