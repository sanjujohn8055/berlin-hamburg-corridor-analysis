import express from 'express';
import { CorridorService } from '../services/CorridorService';
import { Logger } from '../utils/Logger';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/stations
 * Get all corridor stations with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { database } = (req as any).services;
    const corridorService = new CorridorService(database);
    const stations = await corridorService.getCorridorStations();
    
    res.json({
      success: true,
      data: stations,
      count: stations.length
    });
  } catch (error) {
    logger.error('Error fetching stations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stations'
    });
  }
});

/**
 * GET /api/stations/:eva
 * Get specific station by EVA number
 */
router.get('/:eva', async (req, res) => {
  try {
    const eva = parseInt(req.params.eva);
    if (isNaN(eva)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid EVA number'
      });
    }

    const { database } = (req as any).services;
    const corridorService = new CorridorService(database);
    const station = await corridorService.getStationByEva(eva);
    
    if (!station) {
      return res.status(404).json({
        success: false,
        error: 'Station not found'
      });
    }

    return res.json({
      success: true,
      data: station
    });
  } catch (error) {
    logger.error('Error fetching station:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch station'
    });
  }
});

/**
 * GET /api/stations/distance/:distance
 * Get stations within specified distance from Berlin
 */
router.get('/distance/:distance', async (req, res) => {
  try {
    const maxDistance = parseInt(req.params.distance);
    if (isNaN(maxDistance) || maxDistance < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid distance parameter'
      });
    }

    const { database } = (req as any).services;
    const corridorService = new CorridorService(database);
    const stations = await corridorService.getStationsInRange(0, maxDistance);
    
    return res.json({
      success: true,
      data: stations,
      count: stations.length
    });
  } catch (error) {
    logger.error('Error fetching stations by distance:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stations'
    });
  }
});

/**
 * GET /api/stations/priority/:minPriority
 * Get stations with priority score above threshold
 */
router.get('/priority/:minPriority', async (req, res) => {
  try {
    const minPriority = parseInt(req.params.minPriority);
    if (isNaN(minPriority) || minPriority < 0 || minPriority > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid priority parameter (must be 0-100)'
      });
    }

    const { database } = (req as any).services;
    const corridorService = new CorridorService(database);
    const stations = await corridorService.getCorridorStations();
    
    // For now, return all stations since priority calculation is complex
    // In a real implementation, this would integrate with the priority service
    return res.json({
      success: true,
      data: stations,
      count: stations.length,
      message: 'Priority filtering not yet implemented - returning all stations'
    });
  } catch (error) {
    logger.error('Error fetching stations by priority:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stations'
    });
  }
});

export default router;