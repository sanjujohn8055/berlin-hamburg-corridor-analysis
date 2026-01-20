import axios, { AxiosInstance } from 'axios';
import { CorridorStation, StationFacilities } from '../../shared/types';
import { Logger } from '../utils/Logger';
import { CacheService } from './CacheService';

/**
 * Service for integrating with Deutsche Bahn StaDa (Station Data) API
 */
export class StaDaApiService {
  private api: AxiosInstance;
  private logger = Logger.getInstance();
  private cache: CacheService;

  constructor(cacheService: CacheService) {
    this.cache = cacheService;
    this.api = axios.create({
      baseURL: 'https://apis.deutschebahn.com/db-api-marketplace/apis/station-data/v2',
      headers: {
        'DB-Client-Id': process.env.STADA_CLIENT_ID || '',
        'DB-Api-Key': process.env.STADA_API_KEY || '',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    // Add request/response interceptors for logging
    this.api.interceptors.request.use(
      (config) => {
        this.logger.debug('StaDa API request', { url: config.url, method: config.method });
        return config;
      },
      (error) => {
        this.logger.error('StaDa API request error', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        this.logger.debug('StaDa API response', { 
          url: response.config.url, 
          status: response.status,
          dataLength: response.data?.result?.length || 0
        });
        return response;
      },
      (error) => {
        this.logger.error('StaDa API response error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetches station data for a specific EVA number
   */
  async getStationByEva(eva: number): Promise<CorridorStation | null> {
    const cacheKey = `station:${eva}`;
    
    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Station ${eva} found in cache`);
        return JSON.parse(cached);
      }

      this.logger.info(`Fetching station data for EVA ${eva} from StaDa API`);
      
      const response = await this.api.get(`/stations/${eva}`);
      
      if (!response.data?.result || response.data.result.length === 0) {
        this.logger.warn(`No station data found for EVA ${eva}`);
        return null;
      }

      const stationData = response.data.result[0];
      const station = this.transformStationData(stationData);
      
      // Cache the result for 1 hour
      await this.cache.set(cacheKey, JSON.stringify(station), 3600);
      
      return station;
    } catch (error) {
      this.logger.error(`Error fetching station ${eva}:`, error);
      
      // Try to return cached data even if expired
      const cached = await this.cache.get(cacheKey, true);
      if (cached) {
        this.logger.info(`Returning stale cached data for station ${eva}`);
        return JSON.parse(cached);
      }
      
      throw new Error(`Failed to fetch station data for EVA ${eva}`);
    }
  }

  /**
   * Fetches multiple stations by their EVA numbers
   */
  async getStationsByEvas(evas: number[]): Promise<CorridorStation[]> {
    const stations: CorridorStation[] = [];
    const uncachedEvas: number[] = [];

    // Check cache for each station
    for (const eva of evas) {
      const cacheKey = `station:${eva}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        stations.push(JSON.parse(cached));
      } else {
        uncachedEvas.push(eva);
      }
    }

    // Fetch uncached stations with rate limiting
    for (const eva of uncachedEvas) {
      try {
        const station = await this.getStationByEva(eva);
        if (station) {
          stations.push(station);
        }
        
        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logger.error(`Failed to fetch station ${eva}, continuing with others`);
      }
    }

    return stations;
  }

  /**
   * Searches for stations by name pattern
   */
  async searchStations(searchPattern: string): Promise<CorridorStation[]> {
    const cacheKey = `search:${searchPattern}`;
    
    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      this.logger.info(`Searching stations with pattern: ${searchPattern}`);
      
      const response = await this.api.get('/stations', {
        params: {
          searchstring: searchPattern,
          limit: 50
        }
      });

      if (!response.data?.result) {
        return [];
      }

      const stations = response.data.result.map((stationData: any) => 
        this.transformStationData(stationData)
      );
      
      // Cache search results for 30 minutes
      await this.cache.set(cacheKey, JSON.stringify(stations), 1800);
      
      return stations;
    } catch (error) {
      this.logger.error(`Error searching stations with pattern ${searchPattern}:`, error);
      return [];
    }
  }

  /**
   * Fetches all stations in a specific federal state
   */
  async getStationsByFederalState(federalState: string): Promise<CorridorStation[]> {
    const cacheKey = `federal_state:${federalState}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      this.logger.info(`Fetching stations in federal state: ${federalState}`);
      
      const response = await this.api.get('/stations', {
        params: {
          federalstate: federalState,
          limit: 1000
        }
      });

      if (!response.data?.result) {
        return [];
      }

      const stations = response.data.result.map((stationData: any) => 
        this.transformStationData(stationData)
      );
      
      // Cache federal state results for 2 hours
      await this.cache.set(cacheKey, JSON.stringify(stations), 7200);
      
      return stations;
    } catch (error) {
      this.logger.error(`Error fetching stations for federal state ${federalState}:`, error);
      return [];
    }
  }

  /**
   * Transforms raw StaDa API response to CorridorStation format
   */
  private transformStationData(stationData: any): CorridorStation {
    // Extract coordinates from EVA numbers
    const coordinates = this.extractCoordinates(stationData);
    
    // Transform facilities data
    const facilities: StationFacilities = {
      hasWiFi: stationData.hasWiFi || false,
      hasTravelCenter: stationData.hasTravelCenter || false,
      hasDBLounge: stationData.hasDBLounge || false,
      hasLocalPublicTransport: stationData.hasLocalPublicTransport || false,
      hasParking: stationData.hasParking || false,
      steplessAccess: this.mapSteplessAccess(stationData.hasSteplessAccess),
      hasMobilityService: this.parseMobilityService(stationData.hasMobilityService)
    };

    // Determine if station is strategic hub based on category and facilities
    const isStrategicHub = this.determineStrategicHub(stationData.category, facilities);

    return {
      eva: stationData.number,
      name: stationData.name,
      coordinates,
      distanceFromBerlin: 0, // Will be calculated separately
      category: stationData.category || 7,
      platforms: this.extractPlatformCount(stationData),
      facilities,
      upgradePriority: 0, // Will be calculated by priority service
      isStrategicHub
    };
  }

  /**
   * Extracts coordinates from station data
   */
  private extractCoordinates(stationData: any): [number, number] {
    // Try to get coordinates from EVA numbers
    if (stationData.evaNumbers && stationData.evaNumbers.length > 0) {
      const mainEva = stationData.evaNumbers.find((eva: any) => eva.isMain) || stationData.evaNumbers[0];
      if (mainEva?.geographicCoordinates?.coordinates) {
        const coords = mainEva.geographicCoordinates.coordinates;
        return [coords[0], coords[1]]; // [longitude, latitude]
      }
    }

    // Try to get coordinates from RiL100 identifiers
    if (stationData.ril100Identifiers && stationData.ril100Identifiers.length > 0) {
      const mainRil = stationData.ril100Identifiers.find((ril: any) => ril.isMain) || stationData.ril100Identifiers[0];
      if (mainRil?.geographicCoordinates?.coordinates) {
        const coords = mainRil.geographicCoordinates.coordinates;
        return [coords[0], coords[1]];
      }
    }

    // Default coordinates (will need to be updated manually)
    this.logger.warn(`No coordinates found for station ${stationData.name}, using default`);
    return [0, 0];
  }

  /**
   * Maps stepless access values
   */
  private mapSteplessAccess(value: any): 'yes' | 'no' | 'partial' {
    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case 'yes':
        case 'ja':
          return 'yes';
        case 'partial':
        case 'teilweise':
          return 'partial';
        default:
          return 'no';
      }
    }
    return 'no';
  }

  /**
   * Parses mobility service information
   */
  private parseMobilityService(value: any): boolean {
    if (typeof value === 'string') {
      return value.toLowerCase() !== 'no' && value.toLowerCase() !== 'nein';
    }
    return Boolean(value);
  }

  /**
   * Determines if a station is a strategic hub
   */
  private determineStrategicHub(category: number, facilities: StationFacilities): boolean {
    // Category 1-2 stations with good facilities are strategic hubs
    return category <= 2 && (
      facilities.hasTravelCenter || 
      facilities.hasDBLounge || 
      facilities.hasLocalPublicTransport
    );
  }

  /**
   * Extracts platform count from station data
   */
  private extractPlatformCount(stationData: any): number {
    // This is an approximation based on category and size
    // In real implementation, this would need more detailed data
    switch (stationData.category) {
      case 1: return 12; // Major stations
      case 2: return 8;  // Important stations
      case 3: return 6;  // Regional stations
      case 4: return 4;  // Local stations
      case 5: return 2;  // Small stations
      case 6: return 2;  // Halt points
      default: return 1; // Basic stops
    }
  }
}