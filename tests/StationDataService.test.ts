import { StationDataService } from '../src/services/StationDataService';

describe('StationDataService', () => {
  let service: StationDataService;

  beforeEach(() => {
    service = StationDataService.getInstance();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = StationDataService.getInstance();
      const instance2 = StationDataService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('fetchStations', () => {
    it('should fetch stations successfully', async () => {
      const mockStations = [
        { eva: 8011160, name: 'Berlin Hbf', distanceFromBerlin: 0 },
        { eva: 8002548, name: 'Hamburg Hbf', distanceFromBerlin: 289 },
      ];

      const mockHealth = {
        apis: { transport_rest: { status: 'connected' } },
        timestamp: new Date().toISOString(),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockStations }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHealth,
        });

      const result = await service.fetchStations();
      
      expect(result.stations).toHaveLength(2);
      expect(result.dataSource).toBe('real-api');
      expect(result.apiStatus.stada).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/stations');
      expect(global.fetch).toHaveBeenCalledWith('/api/health');
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.fetchStations()).rejects.toThrow('Network error');
    });

    it('should handle invalid response format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      });

      await expect(service.fetchStations()).rejects.toThrow();
    });
  });

  describe('fetchAlternativeRoutes', () => {
    it('should fetch alternative routes with correct parameters', async () => {
      const mockRoutes = [
        { duration: 100, legs: [] },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockRoutes }),
      });

      const result = await service.fetchAlternativeRoutes('8011160', '8002548');
      
      expect(result).toEqual(mockRoutes);
      expect(global.fetch).toHaveBeenCalledWith('/api/routes/8011160/8002548');
    });
  });

  describe('fetchBackupStations', () => {
    it('should fetch backup stations successfully', async () => {
      const mockBackupStations = [
        { eva: 8011113, name: 'Berlin Südkreuz' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBackupStations }),
      });

      const result = await service.fetchBackupStations();
      
      expect(result).toEqual(mockBackupStations);
      expect(global.fetch).toHaveBeenCalledWith('/api/backup-stations');
    });
  });
});
