import express from 'express';
import { Logger } from '../utils/Logger';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/config/:userId
 * Get all priority configurations for a user
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Return default configurations for now
    const defaultConfigs = [
      {
        userId,
        configName: 'balanced',
        infrastructureWeight: 0.33,
        timetableWeight: 0.33,
        populationRiskWeight: 0.34,
        focusArea: 'balanced'
      },
      {
        userId,
        configName: 'infrastructure_focus',
        infrastructureWeight: 0.60,
        timetableWeight: 0.20,
        populationRiskWeight: 0.20,
        focusArea: 'infrastructure'
      }
    ];
    
    res.json({
      success: true,
      data: defaultConfigs
    });
  } catch (error) {
    logger.error('Error fetching user configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configurations'
    });
  }
});

/**
 * GET /api/config/:userId/active
 * Get active configuration for a user
 */
router.get('/:userId/active', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Return default active configuration
    const activeConfig = {
      userId,
      configName: 'balanced',
      infrastructureWeight: 0.33,
      timetableWeight: 0.33,
      populationRiskWeight: 0.34,
      focusArea: 'balanced'
    };

    res.json({
      success: true,
      data: activeConfig
    });
  } catch (error) {
    logger.error('Error fetching active configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active configuration'
    });
  }
});

/**
 * POST /api/config/:userId
 * Create or update a priority configuration
 */
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      configName,
      infrastructureWeight,
      timetableWeight,
      populationRiskWeight,
      focusArea
    } = req.body;

    // Validate required fields
    if (!configName || !infrastructureWeight || !timetableWeight || !populationRiskWeight || !focusArea) {
      return res.status(400).json({
        success: false,
        error: 'Missing required configuration fields'
      });
    }

    // Validate weights sum to 1.0
    const totalWeight = infrastructureWeight + timetableWeight + populationRiskWeight;
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Weights must sum to 1.0'
      });
    }

    // Validate focus area
    const validFocusAreas = ['balanced', 'infrastructure', 'timetable', 'population'];
    if (!validFocusAreas.includes(focusArea)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid focus area'
      });
    }

    const config = {
      userId,
      configName,
      infrastructureWeight,
      timetableWeight,
      populationRiskWeight,
      focusArea,
      createdAt: new Date().toISOString()
    };
    
    return res.json({
      success: true,
      data: config,
      message: 'Configuration saved (in-memory only for now)'
    });
  } catch (error) {
    logger.error('Error saving configuration:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save configuration'
    });
  }
});

/**
 * PUT /api/config/:userId/active
 * Set active configuration for a user
 */
router.put('/:userId/active', async (req, res) => {
  try {
    const { userId } = req.params;
    const { configName } = req.body;

    if (!configName) {
      return res.status(400).json({
        success: false,
        error: 'Configuration name is required'
      });
    }
    
    return res.json({
      success: true,
      message: 'Active configuration updated (in-memory only for now)',
      data: { userId, configName }
    });
  } catch (error) {
    logger.error('Error setting active configuration:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set active configuration'
    });
  }
});

/**
 * DELETE /api/config/:userId/:configName
 * Delete a priority configuration
 */
router.delete('/:userId/:configName', async (req, res) => {
  try {
    const { userId, configName } = req.params;

    res.json({
      success: true,
      message: 'Configuration deleted (in-memory only for now)',
      data: { userId, configName }
    });
  } catch (error) {
    logger.error('Error deleting configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete configuration'
    });
  }
});

export default router;