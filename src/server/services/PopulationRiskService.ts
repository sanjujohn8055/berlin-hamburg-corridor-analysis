import { PopulationTrafficRisk, CorridorStation } from '../../shared/types';
import { DatabaseService } from './DatabaseService';
import { Logger } from '../utils/Logger';
import * as path from 'path';

/**
 * Service for analyzing population-traffic risk along the Berlin-Hamburg corridor
 * Uses German administrative boundary data (VG5000) to correlate population with corridor segments
 */
export class PopulationRiskService {
  private db: DatabaseService;
  private logger = Logger.getInstance();

  // Risk calculation weights
  private readonly RISK_WEIGHTS = {
    POPULATION_DENSITY: 0.4,    // Population density impact
    TRAFFIC_VOLUME: 0.3,        // Daily traffic volume
    STRATEGIC_IMPORTANCE: 0.2,   // Strategic corridor importance
    ALTERNATIVE_ACCESS: 0.1      // Alternative transportation access
  };

  // Population density thresholds (people per km²)
  private readonly DENSITY_THRESHOLDS = {
    VERY_HIGH: 1000,  // Urban areas
    HIGH: 500,        // Suburban areas
    MEDIUM: 200,      // Small towns
    LOW: 100          // Rural areas
  };

  // Traffic volume estimates (passengers per day)
  private readonly TRAFFIC_ESTIMATES = {
    MAJOR_HUB: 50000,     // Berlin Hbf, Hamburg Hbf
    REGIONAL_HUB: 15000,  // Major regional stations
    MEDIUM_STATION: 5000, // Medium-sized stations
    SMALL_STATION: 1500   // Small stations
  };

  constructor(databaseService: DatabaseService) {
    this.db = databaseService;
  }

  /**
   * Analyzes population-traffic risk for all corridor municipalities
   */
  async analyzeCorridorPopulationRisk(): Promise<PopulationTrafficRisk[]> {
    try {
      this.logger.info('Starting corridor population-traffic risk analysis');

      // Get corridor stations and their municipalities
      const corridorData = await this.getCorridorMunicipalityData();
      
      // Analyze risk for each municipality segment
      const riskAnalysis: PopulationTrafficRisk[] = [];
      
      for (const segment of corridorData) {
        const risk = await this.calculateSegmentRisk(segment);
        if (risk) {
          riskAnalysis.push(risk);
        }
      }

      // Store results in database
      await this.storeRiskAnalysis(riskAnalysis);

      this.logger.info(`Completed risk analysis for ${riskAnalysis.length} corridor segments`);
      return riskAnalysis;
    } catch (error) {
      this.logger.error('Error analyzing corridor population risk:', error);
      throw new Error('Failed to analyze population-traffic risk');
    }
  }

  /**
   * Calculates risk for a specific corridor segment
   */
  private async calculateSegmentRisk(segment: {
    municipalityId: string;
    municipalityName: string;
    population: number;
    area: number; // km²
    corridorStations: Array<{
      eva: number;
      name: string;
      category: number;
      distanceFromBerlin: number;
      isStrategicHub: boolean;
    }>;
  }): Promise<PopulationTrafficRisk | null> {
    try {
      // Calculate population density
      const populationDensity = segment.population / segment.area;
      
      // Estimate daily traffic volume based on stations in the municipality
      const dailyTrafficVolume = this.estimateTrafficVolume(segment.corridorStations);
      
      // Calculate risk components
      const populationRiskScore = this.calculatePopulationRiskScore(populationDensity, segment.population);
      const trafficRiskScore = this.calculateTrafficRiskScore(dailyTrafficVolume);
      const strategicRiskScore = this.calculateStrategicRiskScore(segment.corridorStations);
      const alternativeAccessScore = this.calculateAlternativeAccessScore(segment.municipalityName);
      
      // Calculate composite disruption impact score (0-100)
      const disruptionImpactScore = Math.min(100, Math.round(
        populationRiskScore * this.RISK_WEIGHTS.POPULATION_DENSITY +
        trafficRiskScore * this.RISK_WEIGHTS.TRAFFIC_VOLUME +
        strategicRiskScore * this.RISK_WEIGHTS.STRATEGIC_IMPORTANCE +
        alternativeAccessScore * this.RISK_WEIGHTS.ALTERNATIVE_ACCESS
      ));

      // Determine risk level
      const riskLevel = this.determineRiskLevel(disruptionImpactScore);

      // Create corridor segment identifier
      const corridorSegment = this.createCorridorSegmentId(segment.corridorStations);

      return {
        municipalityId: segment.municipalityId,
        corridorSegment,
        population: segment.population,
        dailyTrafficVolume,
        disruptionImpactScore,
        riskLevel
      };
    } catch (error) {
      this.logger.error(`Error calculating risk for segment ${segment.municipalityId}:`, error);
      return null;
    }
  }

  /**
   * Calculates population risk score based on density and absolute population
   */
  private calculatePopulationRiskScore(density: number, population: number): number {
    let densityScore = 0;
    
    if (density >= this.DENSITY_THRESHOLDS.VERY_HIGH) {
      densityScore = 100;
    } else if (density >= this.DENSITY_THRESHOLDS.HIGH) {
      densityScore = 80;
    } else if (density >= this.DENSITY_THRESHOLDS.MEDIUM) {
      densityScore = 60;
    } else if (density >= this.DENSITY_THRESHOLDS.LOW) {
      densityScore = 40;
    } else {
      densityScore = 20;
    }

    // Adjust for absolute population size
    const populationBonus = Math.min(20, Math.log10(population) * 5);
    
    return Math.min(100, densityScore + populationBonus);
  }

  /**
   * Calculates traffic risk score based on estimated daily volume
   */
  private calculateTrafficRiskScore(dailyVolume: number): number {
    if (dailyVolume >= this.TRAFFIC_ESTIMATES.MAJOR_HUB) {
      return 100;
    } else if (dailyVolume >= this.TRAFFIC_ESTIMATES.REGIONAL_HUB) {
      return 80;
    } else if (dailyVolume >= this.TRAFFIC_ESTIMATES.MEDIUM_STATION) {
      return 60;
    } else if (dailyVolume >= this.TRAFFIC_ESTIMATES.SMALL_STATION) {
      return 40;
    } else {
      return 20;
    }
  }

  /**
   * Calculates strategic importance score based on stations in the segment
   */
  private calculateStrategicRiskScore(stations: Array<{
    eva: number;
    category: number;
    isStrategicHub: boolean;
    distanceFromBerlin: number;
  }>): number {
    if (stations.length === 0) return 0;

    let strategicScore = 0;
    
    for (const station of stations) {
      // Strategic hubs have high importance
      if (station.isStrategicHub) {
        strategicScore += 40;
      }
      
      // Station category affects importance (lower category = higher importance)
      const categoryScore = Math.max(0, (8 - station.category) * 10);
      strategicScore += categoryScore;
      
      // Mid-corridor positions are often more strategic
      if (station.distanceFromBerlin > 50 && station.distanceFromBerlin < 250) {
        strategicScore += 10;
      }
    }
    
    return Math.min(100, strategicScore / stations.length);
  }

  /**
   * Calculates alternative access score (higher score = fewer alternatives = higher risk)
   */
  private calculateAlternativeAccessScore(municipalityName: string): number {
    // This is a simplified implementation - in a real system you'd analyze:
    // - Highway access
    // - Other rail lines
    // - Airport proximity
    // - Bus connections
    
    const name = municipalityName.toLowerCase();
    
    // Major cities typically have more alternatives
    if (name.includes('berlin') || name.includes('hamburg')) {
      return 20; // Low risk due to many alternatives
    } else if (name.includes('stadt') || name.includes('city')) {
      return 40; // Medium risk
    } else {
      return 70; // Higher risk for smaller municipalities
    }
  }

  /**
   * Estimates daily traffic volume based on stations in the segment
   */
  private estimateTrafficVolume(stations: Array<{
    eva: number;
    category: number;
    isStrategicHub: boolean;
  }>): number {
    let totalVolume = 0;
    
    for (const station of stations) {
      if (station.isStrategicHub) {
        totalVolume += this.TRAFFIC_ESTIMATES.MAJOR_HUB;
      } else if (station.category <= 2) {
        totalVolume += this.TRAFFIC_ESTIMATES.REGIONAL_HUB;
      } else if (station.category <= 4) {
        totalVolume += this.TRAFFIC_ESTIMATES.MEDIUM_STATION;
      } else {
        totalVolume += this.TRAFFIC_ESTIMATES.SMALL_STATION;
      }
    }
    
    return totalVolume;
  }

  /**
   * Determines risk level based on disruption impact score
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) {
      return 'high';
    } else if (score >= 40) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Creates corridor segment identifier
   */
  private createCorridorSegmentId(stations: Array<{ distanceFromBerlin: number }>): string {
    if (stations.length === 0) return 'unknown';
    
    const minDistance = Math.min(...stations.map(s => s.distanceFromBerlin));
    const maxDistance = Math.max(...stations.map(s => s.distanceFromBerlin));
    
    return `km_${Math.floor(minDistance)}-${Math.ceil(maxDistance)}`;
  }

  /**
   * Gets corridor municipality data (mock implementation using sample German data)
   */
  private async getCorridorMunicipalityData(): Promise<Array<{
    municipalityId: string;
    municipalityName: string;
    population: number;
    area: number;
    corridorStations: Array<{
      eva: number;
      name: string;
      category: number;
      distanceFromBerlin: number;
      isStrategicHub: boolean;
    }>;
  }>> {
    // This is a mock implementation with sample data for the Berlin-Hamburg corridor
    // In a real implementation, this would:
    // 1. Load the VG5000_GEM shapefile data
    // 2. Perform spatial queries to find municipalities intersecting the corridor
    // 3. Load population data from official statistics
    // 4. Match stations to municipalities based on coordinates
    
    const mockMunicipalityData = [
      {
        municipalityId: '11000000', // Berlin
        municipalityName: 'Berlin',
        population: 3669491,
        area: 891.7,
        corridorStations: [
          {
            eva: 8011160,
            name: 'Berlin Hbf',
            category: 1,
            distanceFromBerlin: 0,
            isStrategicHub: true
          },
          {
            eva: 8010404,
            name: 'Berlin-Spandau',
            category: 2,
            distanceFromBerlin: 15,
            isStrategicHub: false
          }
        ]
      },
      {
        municipalityId: '12051000', // Brandenburg an der Havel
        municipalityName: 'Brandenburg an der Havel',
        population: 72040,
        area: 229.7,
        corridorStations: [
          {
            eva: 8010050,
            name: 'Brandenburg Hbf',
            category: 3,
            distanceFromBerlin: 70,
            isStrategicHub: false
          }
        ]
      },
      {
        municipalityId: '13073141', // Wittenberge
        municipalityName: 'Wittenberge',
        population: 16882,
        area: 45.2,
        corridorStations: [
          {
            eva: 8010424,
            name: 'Wittenberge',
            category: 4,
            distanceFromBerlin: 120,
            isStrategicHub: false
          }
        ]
      },
      {
        municipalityId: '15090015', // Stendal
        municipalityName: 'Stendal',
        population: 39934,
        area: 268.0,
        corridorStations: [
          {
            eva: 8010334,
            name: 'Stendal',
            category: 3,
            distanceFromBerlin: 150,
            isStrategicHub: false
          }
        ]
      },
      {
        municipalityId: '03353032', // Uelzen
        municipalityName: 'Uelzen',
        population: 33893,
        area: 57.1,
        corridorStations: [
          {
            eva: 8000390,
            name: 'Uelzen',
            category: 4,
            distanceFromBerlin: 200,
            isStrategicHub: false
          }
        ]
      },
      {
        municipalityId: '02000000', // Hamburg
        municipalityName: 'Hamburg',
        population: 1899160,
        area: 755.2,
        corridorStations: [
          {
            eva: 8002548,
            name: 'Hamburg Hbf',
            category: 1,
            distanceFromBerlin: 289,
            isStrategicHub: true
          },
          {
            eva: 8002549,
            name: 'Hamburg-Harburg',
            category: 2,
            distanceFromBerlin: 295,
            isStrategicHub: false
          }
        ]
      }
    ];

    return mockMunicipalityData;
  }

  /**
   * Stores risk analysis results in database
   */
  private async storeRiskAnalysis(riskData: PopulationTrafficRisk[]): Promise<void> {
    try {
      const query = `
        INSERT INTO population_traffic_risk 
        (municipality_id, corridor_segment, analysis_date, population, daily_traffic_volume, 
         disruption_impact_score, risk_level, recommendations)
        VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7)
        ON CONFLICT (municipality_id, analysis_date) DO UPDATE SET
          corridor_segment = EXCLUDED.corridor_segment,
          population = EXCLUDED.population,
          daily_traffic_volume = EXCLUDED.daily_traffic_volume,
          disruption_impact_score = EXCLUDED.disruption_impact_score,
          risk_level = EXCLUDED.risk_level,
          recommendations = EXCLUDED.recommendations
      `;

      for (const risk of riskData) {
        const recommendations = this.generateRiskRecommendations(risk);
        
        await this.db.query(query, [
          risk.municipalityId,
          risk.corridorSegment,
          risk.population,
          risk.dailyTrafficVolume,
          risk.disruptionImpactScore,
          risk.riskLevel,
          JSON.stringify(recommendations)
        ]);
      }

      this.logger.debug(`Stored ${riskData.length} risk analysis records`);
    } catch (error) {
      this.logger.error('Error storing risk analysis:', error);
      throw new Error('Failed to store risk analysis');
    }
  }

  /**
   * Generates recommendations based on risk analysis
   */
  private generateRiskRecommendations(risk: PopulationTrafficRisk): string[] {
    const recommendations = [];

    if (risk.riskLevel === 'high') {
      recommendations.push('Priority area for service reliability improvements');
      recommendations.push('Implement enhanced delay management protocols');
      recommendations.push('Consider backup transportation arrangements during disruptions');
    }

    if (risk.dailyTrafficVolume > this.TRAFFIC_ESTIMATES.REGIONAL_HUB) {
      recommendations.push('High passenger volume requires robust contingency planning');
    }

    if (risk.disruptionImpactScore >= 80) {
      recommendations.push('Critical corridor segment requiring immediate attention');
      recommendations.push('Develop specific emergency response procedures');
    }

    if (risk.population > 100000) {
      recommendations.push('Large population base - coordinate with local authorities for disruption management');
    }

    return recommendations;
  }

  /**
   * Gets risk analysis for a specific date range
   */
  async getRiskAnalysis(startDate?: string, endDate?: string): Promise<PopulationTrafficRisk[]> {
    try {
      let query = `
        SELECT municipality_id, corridor_segment, population, daily_traffic_volume,
               disruption_impact_score, risk_level, analysis_date
        FROM population_traffic_risk
      `;
      
      const params: any[] = [];
      
      if (startDate && endDate) {
        query += ' WHERE analysis_date BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' WHERE analysis_date >= $1';
        params.push(startDate);
      } else {
        query += ' WHERE analysis_date = CURRENT_DATE';
      }
      
      query += ' ORDER BY disruption_impact_score DESC';

      const result = await this.db.query(query, params);
      
      return result.rows.map(row => ({
        municipalityId: row.municipality_id,
        corridorSegment: row.corridor_segment,
        population: row.population,
        dailyTrafficVolume: row.daily_traffic_volume,
        disruptionImpactScore: row.disruption_impact_score,
        riskLevel: row.risk_level as 'low' | 'medium' | 'high'
      }));
    } catch (error) {
      this.logger.error('Error getting risk analysis:', error);
      throw new Error('Failed to get risk analysis');
    }
  }

  /**
   * Gets the highest risk zones (top N by impact score)
   */
  async getHighestRiskZones(limit: number = 10): Promise<Array<{
    municipalityId: string;
    municipalityName: string;
    population: number;
    trafficVolume: number;
    disruptionImpactScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    keyRiskFactors: string[];
    mitigationActions: string[];
  }>> {
    try {
      const query = `
        SELECT ptr.municipality_id, ptr.corridor_segment, ptr.population, 
               ptr.daily_traffic_volume, ptr.disruption_impact_score, ptr.risk_level,
               ptr.recommendations
        FROM population_traffic_risk ptr
        WHERE ptr.analysis_date = CURRENT_DATE
        ORDER BY ptr.disruption_impact_score DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);
      
      return result.rows.map(row => {
        const keyRiskFactors = this.identifyKeyRiskFactors({
          population: row.population,
          dailyTrafficVolume: row.daily_traffic_volume,
          disruptionImpactScore: row.disruption_impact_score,
          riskLevel: row.risk_level
        });

        return {
          municipalityId: row.municipality_id,
          municipalityName: this.getMunicipalityName(row.municipality_id),
          population: row.population,
          trafficVolume: row.daily_traffic_volume,
          disruptionImpactScore: row.disruption_impact_score,
          riskLevel: row.risk_level,
          keyRiskFactors,
          mitigationActions: JSON.parse(row.recommendations || '[]')
        };
      });
    } catch (error) {
      this.logger.error('Error getting highest risk zones:', error);
      throw new Error('Failed to get highest risk zones');
    }
  }

  /**
   * Identifies key risk factors for a zone
   */
  private identifyKeyRiskFactors(risk: {
    population: number;
    dailyTrafficVolume: number;
    disruptionImpactScore: number;
    riskLevel: string;
  }): string[] {
    const factors = [];

    if (risk.population > 500000) {
      factors.push('Very high population density');
    } else if (risk.population > 100000) {
      factors.push('High population concentration');
    }

    if (risk.dailyTrafficVolume > this.TRAFFIC_ESTIMATES.MAJOR_HUB) {
      factors.push('Major transportation hub');
    } else if (risk.dailyTrafficVolume > this.TRAFFIC_ESTIMATES.REGIONAL_HUB) {
      factors.push('High passenger traffic volume');
    }

    if (risk.riskLevel === 'high') {
      factors.push('Limited alternative transportation options');
    }

    if (risk.disruptionImpactScore >= 80) {
      factors.push('Critical corridor position');
    }

    return factors;
  }

  /**
   * Gets municipality name by ID (mock implementation)
   */
  private getMunicipalityName(municipalityId: string): string {
    const nameMap: { [key: string]: string } = {
      '11000000': 'Berlin',
      '12051000': 'Brandenburg an der Havel',
      '13073141': 'Wittenberge',
      '15090015': 'Stendal',
      '03353032': 'Uelzen',
      '02000000': 'Hamburg'
    };

    return nameMap[municipalityId] || `Municipality ${municipalityId}`;
  }

  /**
   * Identifies risk zones where service disruption would have maximum impact
   */
  async identifyHighImpactRiskZones(): Promise<{
    criticalZones: Array<{
      zone: string;
      impactScore: number;
      affectedPopulation: number;
      dailyPassengers: number;
      riskFactors: string[];
    }>;
    corridorHealthMetrics: {
      totalPopulationAtRisk: number;
      averageRiskScore: number;
      highRiskZoneCount: number;
      corridorVulnerabilityIndex: number;
    };
    priorityActions: Array<{
      action: string;
      targetZones: string[];
      expectedImpact: string;
      urgency: 'immediate' | 'short_term' | 'long_term';
    }>;
  }> {
    try {
      const riskZones = await this.getRiskAnalysis();
      
      // Identify critical zones (high impact score)
      const criticalZones = riskZones
        .filter(zone => zone.disruptionImpactScore >= 60)
        .map(zone => ({
          zone: `${this.getMunicipalityName(zone.municipalityId)} (${zone.corridorSegment})`,
          impactScore: zone.disruptionImpactScore,
          affectedPopulation: zone.population,
          dailyPassengers: zone.dailyTrafficVolume,
          riskFactors: this.identifyKeyRiskFactors({
            population: zone.population,
            dailyTrafficVolume: zone.dailyTrafficVolume,
            disruptionImpactScore: zone.disruptionImpactScore,
            riskLevel: zone.riskLevel
          })
        }))
        .sort((a, b) => b.impactScore - a.impactScore);

      // Calculate corridor health metrics
      const totalPopulationAtRisk = riskZones.reduce((sum, zone) => sum + zone.population, 0);
      const averageRiskScore = riskZones.reduce((sum, zone) => sum + zone.disruptionImpactScore, 0) / riskZones.length;
      const highRiskZoneCount = riskZones.filter(zone => zone.riskLevel === 'high').length;
      const corridorVulnerabilityIndex = Math.min(100, (averageRiskScore + (highRiskZoneCount * 10)));

      // Generate priority actions
      const priorityActions = this.generatePriorityActions(criticalZones);

      return {
        criticalZones,
        corridorHealthMetrics: {
          totalPopulationAtRisk,
          averageRiskScore: Math.round(averageRiskScore * 100) / 100,
          highRiskZoneCount,
          corridorVulnerabilityIndex: Math.round(corridorVulnerabilityIndex * 100) / 100
        },
        priorityActions
      };
    } catch (error) {
      this.logger.error('Error identifying high impact risk zones:', error);
      throw new Error('Failed to identify high impact risk zones');
    }
  }

  /**
   * Generates priority actions based on critical zones
   */
  private generatePriorityActions(criticalZones: Array<{
    zone: string;
    impactScore: number;
    affectedPopulation: number;
    dailyPassengers: number;
  }>): Array<{
    action: string;
    targetZones: string[];
    expectedImpact: string;
    urgency: 'immediate' | 'short_term' | 'long_term';
  }> {
    const actions = [];

    // Immediate actions for highest risk zones
    const immediateZones = criticalZones.filter(z => z.impactScore >= 80);
    if (immediateZones.length > 0) {
      actions.push({
        action: 'Implement enhanced real-time passenger information systems',
        targetZones: immediateZones.map(z => z.zone),
        expectedImpact: 'Reduce passenger confusion and improve disruption management',
        urgency: 'immediate' as const
      });
    }

    // Short-term actions for high traffic zones
    const highTrafficZones = criticalZones.filter(z => z.dailyPassengers > 20000);
    if (highTrafficZones.length > 0) {
      actions.push({
        action: 'Develop alternative transportation partnerships (bus, taxi)',
        targetZones: highTrafficZones.map(z => z.zone),
        expectedImpact: 'Provide backup options during service disruptions',
        urgency: 'short_term' as const
      });
    }

    // Long-term actions for high population zones
    const highPopulationZones = criticalZones.filter(z => z.affectedPopulation > 100000);
    if (highPopulationZones.length > 0) {
      actions.push({
        action: 'Infrastructure resilience improvements',
        targetZones: highPopulationZones.map(z => z.zone),
        expectedImpact: 'Fundamental improvement in service reliability',
        urgency: 'long_term' as const
      });
    }

    return actions;
  }
}