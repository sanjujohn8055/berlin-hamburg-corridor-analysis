/**
 * Service for fetching station data from various sources
 */
export class StationDataService {
  private static instance: StationDataService;
  
  private constructor() {}
  
  static getInstance(): StationDataService {
    if (!StationDataService.instance) {
      StationDataService.instance = new StationDataService();
    }
    return StationDataService.instance;
  }

  /**
   * Fetches station data with source indication
   */
  async fetchStations(): Promise<{
    stations: any[];
    dataSource: 'real-api' | 'enhanced-mock';
    apiStatus: {
      stada: boolean;
      timetables: boolean;
    };
  }> {
    try {
      // Fetch both stations and health data
      const [stationsResponse, healthResponse] = await Promise.all([
        fetch('/api/stations'),
        fetch('/api/health')
      ]);
      
      const stationsData = await stationsResponse.json();
      const healthData = await healthResponse.json();
      
      if (stationsData.success) {
        // Determine API status from health endpoint
        const transportApiConnected = healthData.apis?.transport_rest?.status === 'connected';
        
        return {
          stations: stationsData.data.map((station: any) => ({
            ...station,
            dataSource: 'real-api'
          })),
          dataSource: 'real-api',
          apiStatus: {
            stada: transportApiConnected, // Using transport.rest as StaDa replacement
            timetables: transportApiConnected // Using transport.rest for timetables too
          }
        };
      }
      
      throw new Error('Failed to fetch station data');
    } catch (error) {
      console.error('Error fetching stations:', error);
      throw error;
    }
  }

  /**
   * Fetches alternative routes between stations
   */
  async fetchAlternativeRoutes(fromEva: string, toEva: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/routes/${fromEva}/${toEva}`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching alternative routes:', error);
      return [];
    }
  }

  /**
   * Fetches backup stations for congestion relief
   */
  async fetchBackupStations(): Promise<any[]> {
    try {
      const response = await fetch('/api/backup-stations');
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching backup stations:', error);
      return [];
    }
  }

  /**
   * Fetches additional API status information
   */
  async getApiStatus(): Promise<{
    stada: { available: boolean; lastCheck: string };
    timetables: { available: boolean; lastCheck: string };
    message: string;
  }> {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      const stadaConnected = data.apis?.stada?.status === 'connected';
      const timetablesConnected = data.apis?.timetables?.status === 'connected';
      
      return {
        stada: {
          available: stadaConnected,
          lastCheck: data.timestamp || new Date().toISOString()
        },
        timetables: {
          available: timetablesConnected,
          lastCheck: data.timestamp || new Date().toISOString()
        },
        message: data.mode === 'real-api' 
          ? `Real API mode - StaDa: ${stadaConnected ? 'Connected' : 'Error'}, Timetables: ${timetablesConnected ? 'Connected' : 'Error'}`
          : 'Using enhanced mock data with realistic suggestions'
      };
    } catch (error) {
      return {
        stada: { available: false, lastCheck: new Date().toISOString() },
        timetables: { available: false, lastCheck: new Date().toISOString() },
        message: 'API status check failed'
      };
    }
  }
}