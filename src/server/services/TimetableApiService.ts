import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/Logger';
import { CacheService } from './CacheService';

/**
 * Types for timetable data
 */
export interface TimetableStop {
  eva: number;
  stationName: string;
  arrival?: {
    plannedTime: string;
    actualTime?: string;
    delay?: number;
    platform?: string;
  };
  departure?: {
    plannedTime: string;
    actualTime?: string;
    delay?: number;
    platform?: string;
  };
  tripId: string;
  tripCategory: string;
  tripNumber: string;
}

export interface ConnectionData {
  fromEva: number;
  toEva: number;
  fromStation: string;
  toStation: string;
  connections: {
    tripId: string;
    category: string;
    number: string;
    departureTime: string;
    arrivalTime: string;
    bufferTime?: number;
  }[];
  dailyFrequency: number;
}

/**
 * Service for integrating with Deutsche Bahn Timetables API
 */
export class TimetableApiService {
  private api: AxiosInstance;
  private logger = Logger.getInstance();
  private cache: CacheService;

  constructor(cacheService: CacheService) {
    this.cache = cacheService;
    this.api = axios.create({
      baseURL: 'https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1',
      headers: {
        'DB-Client-Id': process.env.TIMETABLES_CLIENT_ID || '',
        'DB-Api-Key': process.env.TIMETABLES_API_KEY || '',
        'Accept': 'application/xml'
      },
      timeout: 15000
    });

    // Add request/response interceptors
    this.api.interceptors.request.use(
      (config) => {
        this.logger.debug('Timetables API request', { url: config.url, method: config.method });
        return config;
      },
      (error) => {
        this.logger.error('Timetables API request error', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        this.logger.debug('Timetables API response', { 
          url: response.config.url, 
          status: response.status 
        });
        return response;
      },
      (error) => {
        this.logger.error('Timetables API response error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Gets planned timetable data for a station on a specific date and hour
   */
  async getPlannedTimetable(eva: number, date: string, hour: string): Promise<TimetableStop[]> {
    const cacheKey = `timetable:planned:${eva}:${date}:${hour}`;
    
    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      this.logger.info(`Fetching planned timetable for EVA ${eva}, date ${date}, hour ${hour}`);
      
      const response = await this.api.get(`/plan/${eva}/${date}/${hour}`);
      const timetableStops = this.parseTimetableXml(response.data);
      
      // Cache for 4 hours (planned data is static)
      await this.cache.set(cacheKey, JSON.stringify(timetableStops), 14400);
      
      return timetableStops;
    } catch (error) {
      this.logger.error(`Error fetching planned timetable for ${eva}:`, error);
      
      // Try to return cached data even if expired
      const cached = await this.cache.get(cacheKey, true);
      if (cached) {
        this.logger.info(`Returning stale cached timetable data for ${eva}`);
        return JSON.parse(cached);
      }
      
      return [];
    }
  }

  /**
   * Gets current changes/delays for a station
   */
  async getCurrentChanges(eva: number): Promise<TimetableStop[]> {
    const cacheKey = `timetable:changes:${eva}`;
    
    try {
      // Check cache first (shorter TTL for real-time data)
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      this.logger.info(`Fetching current changes for EVA ${eva}`);
      
      const response = await this.api.get(`/fchg/${eva}`);
      const changes = this.parseTimetableXml(response.data);
      
      // Cache for 2 minutes (real-time data)
      await this.cache.set(cacheKey, JSON.stringify(changes), 120);
      
      return changes;
    } catch (error) {
      this.logger.error(`Error fetching changes for ${eva}:`, error);
      return [];
    }
  }

  /**
   * Gets connection data between two corridor stations
   */
  async getConnectionData(fromEva: number, toEva: number, date: string): Promise<ConnectionData | null> {
    const cacheKey = `connections:${fromEva}:${toEva}:${date}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      this.logger.info(`Analyzing connections from ${fromEva} to ${toEva} on ${date}`);
      
      // Get timetables for both stations for the full day
      const connections: ConnectionData['connections'] = [];
      
      // Check each hour of the day
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        
        try {
          const fromTimetable = await this.getPlannedTimetable(fromEva, date, hourStr);
          const toTimetable = await this.getPlannedTimetable(toEva, date, hourStr);
          
          // Find matching trips
          const hourConnections = this.findConnections(fromTimetable, toTimetable);
          connections.push(...hourConnections);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          this.logger.warn(`Failed to get timetable for hour ${hourStr}:`, error);
        }
      }

      if (connections.length === 0) {
        return null;
      }

      const connectionData: ConnectionData = {
        fromEva,
        toEva,
        fromStation: '', // Will be filled by caller
        toStation: '', // Will be filled by caller
        connections,
        dailyFrequency: connections.length
      };

      // Cache for 2 hours
      await this.cache.set(cacheKey, JSON.stringify(connectionData), 7200);
      
      return connectionData;
    } catch (error) {
      this.logger.error(`Error getting connection data from ${fromEva} to ${toEva}:`, error);
      return null;
    }
  }

  /**
   * Gets daily traffic volume for a station
   */
  async getDailyTrafficVolume(eva: number, date: string): Promise<number> {
    const cacheKey = `traffic:${eva}:${date}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return parseInt(cached, 10);
      }

      let totalStops = 0;
      
      // Count stops for each hour of the day
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        
        try {
          const timetable = await this.getPlannedTimetable(eva, date, hourStr);
          totalStops += timetable.length;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.warn(`Failed to get traffic for hour ${hourStr}:`, error);
        }
      }

      // Cache for 4 hours
      await this.cache.set(cacheKey, totalStops.toString(), 14400);
      
      return totalStops;
    } catch (error) {
      this.logger.error(`Error getting traffic volume for ${eva}:`, error);
      return 0;
    }
  }

  /**
   * Parses XML timetable response to TimetableStop objects
   */
  private parseTimetableXml(xmlData: string): TimetableStop[] {
    // This is a simplified parser - in production, use a proper XML parser
    const stops: TimetableStop[] = [];
    
    try {
      // Extract basic information using regex (simplified approach)
      // In production, use xml2js or similar library
      const stopMatches = xmlData.match(/<s[^>]*>.*?<\/s>/gs) || [];
      
      for (const stopMatch of stopMatches) {
        const eva = this.extractAttribute(stopMatch, 'eva');
        const id = this.extractAttribute(stopMatch, 'id');
        
        if (!eva || !id) continue;
        
        // Extract trip information
        const tripLabel = stopMatch.match(/<tl[^>]*>/)?.[0] || '';
        const category = this.extractAttribute(tripLabel, 'c') || '';
        const number = this.extractAttribute(tripLabel, 'n') || '';
        
        // Extract arrival information
        const arrivalMatch = stopMatch.match(/<ar[^>]*>/)?.[0];
        let arrival;
        if (arrivalMatch) {
          arrival = {
            plannedTime: this.extractAttribute(arrivalMatch, 'pt') || '',
            actualTime: this.extractAttribute(arrivalMatch, 'ct') || undefined,
            platform: this.extractAttribute(arrivalMatch, 'pp') || undefined
          };
        }
        
        // Extract departure information
        const departureMatch = stopMatch.match(/<dp[^>]*>/)?.[0];
        let departure;
        if (departureMatch) {
          departure = {
            plannedTime: this.extractAttribute(departureMatch, 'pt') || '',
            actualTime: this.extractAttribute(departureMatch, 'ct') || undefined,
            platform: this.extractAttribute(departureMatch, 'pp') || undefined
          };
        }
        
        stops.push({
          eva: parseInt(eva, 10),
          stationName: '', // Will be filled from station data
          arrival,
          departure,
          tripId: id,
          tripCategory: category,
          tripNumber: number
        });
      }
    } catch (error) {
      this.logger.error('Error parsing timetable XML:', error);
    }
    
    return stops;
  }

  /**
   * Finds connections between two timetables
   */
  private findConnections(fromTimetable: TimetableStop[], toTimetable: TimetableStop[]): ConnectionData['connections'] {
    const connections: ConnectionData['connections'] = [];
    
    for (const fromStop of fromTimetable) {
      if (!fromStop.departure) continue;
      
      // Find matching trip in destination timetable
      const toStop = toTimetable.find(stop => 
        stop.tripId === fromStop.tripId && stop.arrival
      );
      
      if (toStop && toStop.arrival) {
        connections.push({
          tripId: fromStop.tripId,
          category: fromStop.tripCategory,
          number: fromStop.tripNumber,
          departureTime: fromStop.departure.plannedTime,
          arrivalTime: toStop.arrival.plannedTime,
          bufferTime: this.calculateBufferTime(fromStop.departure.plannedTime, toStop.arrival.plannedTime)
        });
      }
    }
    
    return connections;
  }

  /**
   * Calculates buffer time between departure and arrival
   */
  private calculateBufferTime(departureTime: string, arrivalTime: string): number {
    try {
      // Parse time format YYMMddHHmm
      const depTime = this.parseTimeString(departureTime);
      const arrTime = this.parseTimeString(arrivalTime);
      
      if (!depTime || !arrTime) return 0;
      
      const diffMs = arrTime.getTime() - depTime.getTime();
      return Math.round(diffMs / (1000 * 60)); // Convert to minutes
    } catch (error) {
      return 0;
    }
  }

  /**
   * Parses time string in YYMMddHHmm format
   */
  private parseTimeString(timeStr: string): Date | null {
    if (timeStr.length !== 10) return null;
    
    try {
      const year = 2000 + parseInt(timeStr.substring(0, 2), 10);
      const month = parseInt(timeStr.substring(2, 4), 10) - 1; // Month is 0-indexed
      const day = parseInt(timeStr.substring(4, 6), 10);
      const hour = parseInt(timeStr.substring(6, 8), 10);
      const minute = parseInt(timeStr.substring(8, 10), 10);
      
      return new Date(year, month, day, hour, minute);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extracts attribute value from XML string
   */
  private extractAttribute(xmlString: string, attributeName: string): string | null {
    const regex = new RegExp(`${attributeName}="([^"]*)"`, 'i');
    const match = xmlString.match(regex);
    return match ? match[1] : null;
  }
}