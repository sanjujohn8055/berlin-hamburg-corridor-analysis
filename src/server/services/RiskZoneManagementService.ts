import { PopulationTrafficRisk, CorridorStation } from '../../shared/types';
import { DatabaseService } from './DatabaseService';
import { PopulationRiskService } from './PopulationRiskService';
import { Logger } from '../utils/Logger';

/**
 * Service for identifying and prioritizing risk zones along the Berlin-Hamburg corridor
 */
export class RiskZoneManagementService {
  private db: DatabaseService;
  private populationRiskService: PopulationRiskService;
  private logger = Logger.getInstance();

  // Risk zone classification thresholds
  private readonly ZONE_THRESHOLDS = {
    CRITICAL: { minScore: 80, maxPopulation: Infinity, priority: 1 },
    HIGH: { minScore: 60, maxPopulation: Infinity, priority: 2 },
    ELEVATED: { minScore: 40, maxPopulation: Infinity, priority: 3 },
    MODERATE: { minScore: 20, maxPopulation: Infinity, priority: 4 },
    LOW: { minScore: 0, maxPopulation: Infinity, priority: 5 }
  };

  // Mitigation strategy templates
  private readonly MITIGATION_STRATEGIES = {
    CRITICAL: [
      'Immediate deployment of emergency response teams',
      'Real-time passenger information systems',
      'Alternative transportation coordination',
      'Enhanced delay management protocols'
    ],
    HIGH: [
      'Proactive communication systems',
      'Backup service arrangements',
      'Staff reinforcement during disruptions',
      'Passenger flow management'
    ],
    ELEVATED: [
      'Improved timetable resilience',
      'Better connection coordination',
      'Enhanced monitoring systems'
    ],
    MODERATE: [
      'Regular service monitoring',
      'Preventive maintenance scheduling'
    ],
    LOW: [
      'Standard operating procedures',
      'Routine performance monitoring'
    ]
  };

  constructor(databaseService: DatabaseService, populationRiskService: PopulationRiskService) {
    this.db = databaseService;
    this.populationRiskService = populationRiskService;
  }

  /**
   * Identifies and prioritizes all risk zones along the corridor
   */
  async identifyAndPrioritizeRiskZones(): Promise<{
    riskZones: Array<{
      zoneId: string;
      zoneName: string;
      riskLevel: 'critical' | 'high' | 'elevated' | 'moderate' | 'low';
      priority: number;
      disruptionImpactScore: number;
      affectedPopulation: number;
      dailyPassengers: number;
      keyRiskFactors: string[];
      mitigationStrategies: string[];
      corridorSegment: string;
      geographicBounds: {
        startKm: number;
        endKm: number;
        centerPoint: { lat: number; lon: number };
      };
    }>;
    corridorRiskProfile: {
      totalRiskZones: number;
      criticalZones: number;
      highRiskZones: number;
      totalPopulationAtRisk: number;
      corridorVulnerabilityIndex: number;
      riskDistribution: { [key: string]: number };
    };
    priorityActions: Array<{
      actionId: string;
      description: string;
      targetZones: string[];
      urgency: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
      estimatedCost: 'low' | 'medium' | 'high' | 'very_high';
      expectedImpact: string;
      implementationTimeframe: string;
    }>;
  }> {
    try {
      this.logger.info('Starting comprehensive risk zone identification and prioritization');

      // Get current risk analysis data
      const riskData = await this.populationRiskService.getRiskAnalysis();
      
      // Identify and classify risk zones
      const riskZones = await this.classifyRiskZones(riskData);
      
      // Calculate corridor risk profile
      const corridorRiskProfile = this.calculateCorridorRiskProfile(riskZones);
      
      // Generate priority actions
      const priorityActions = await this.generatePriorityActions(riskZones);
      
      // Store risk zone analysis
      await this.storeRiskZoneAnalysis(riskZones, corridorRiskProfile);

      this.logger.info(`Identified ${riskZones.length} risk zones with ${corridorRiskProfile.criticalZones} critical zones`);

      return {
        riskZones,
        corridorRiskProfile,
        priorityActions
      };
    } catch (error) {
      this.logger.error('Error identifying and prioritizing risk zones:', error);
      throw new Error('Failed to identify and prioritize risk zones');
    }
  }

  /**
   * Classifies risk zones based on impact scores and characteristics
   */
  private async classifyRiskZones(riskData: PopulationTrafficRisk[]): Promise<Array<{
    zoneId: string;
    zoneName: string;
    riskLevel: 'critical' | 'high' | 'elevated' | 'moderate' | 'low';
    priority: number;
    disruptionImpactScore: number;
    affectedPopulation: number;
    dailyPassengers: number;
    keyRiskFactors: string[];
    mitigationStrategies: string[];
    corridorSegment: string;
    geographicBounds: {
      startKm: number;
      endKm: number;
      centerPoint: { lat: number; lon: number };
    };
  }>> {
    const riskZones = [];

    for (const risk of riskData) {
      // Determine risk level and priority
      const { riskLevel, priority } = this.determineRiskLevelAndPriority(risk.disruptionImpactScore);
      
      // Get geographic bounds for the zone
      const geographicBounds = await this.calculateGeographicBounds(risk.corridorSegment);
      
      // Identify key risk factors
      const keyRiskFactors = this.identifyKeyRiskFactors(risk);
      
      // Get appropriate mitigation strategies
      const mitigationStrategies = this.getMitigationStrategies(riskLevel);
      
      // Generate zone name
      const zoneName = await this.generateZoneName(risk.municipalityId, risk.corridorSegment);

      riskZones.push({
        zoneId: `RZ_${risk.municipalityId}_${Date.now()}`,
        zoneName,
        riskLevel,
        priority,
        disruptionImpactScore: risk.disruptionImpactScore,
        affectedPopulation: risk.population,
        dailyPassengers: risk.dailyTrafficVolume,
        keyRiskFactors,
        mitigationStrategies,
        corridorSegment: risk.corridorSegment,
        geographicBounds
      });
    }

    // Sort by priority (lower number = higher priority)
    return riskZones.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Determines risk level and priority based on impact score
   */
  private determineRiskLevelAndPriority(impactScore: number): {
    riskLevel: 'critical' | 'high' | 'elevated' | 'moderate' | 'low';
    priority: number;
  } {
    if (impactScore >= this.ZONE_THRESHOLDS.CRITICAL.minScore) {
      return { riskLevel: 'critical', priority: this.ZONE_THRESHOLDS.CRITICAL.priority };
    } else if (impactScore >= this.ZONE_THRESHOLDS.HIGH.minScore) {
      return { riskLevel: 'high', priority: this.ZONE_THRESHOLDS.HIGH.priority };
    } else if (impactScore >= this.ZONE_THRESHOLDS.ELEVATED.minScore) {
      return { riskLevel: 'elevated', priority: this.ZONE_THRESHOLDS.ELEVATED.priority };
    } else if (impactScore >= this.ZONE_THRESHOLDS.MODERATE.minScore) {
      return { riskLevel: 'moderate', priority: this.ZONE_THRESHOLDS.MODERATE.priority };
    } else {
      return { riskLevel: 'low', priority: this.ZONE_THRESHOLDS.LOW.priority };
    }
  }

  /**
   * Calculates geographic bounds for a corridor segment
   */
  private async calculateGeographicBounds(corridorSegment: string): Promise<{
    startKm: number;
    endKm: number;
    centerPoint: { lat: number; lon: number };
  }> {
    // Parse corridor segment (format: "km_X-Y")
    const match = corridorSegment.match(/km_(\d+)-(\d+)/);
    if (!match) {
      return {
        startKm: 0,
        endKm: 0,
        centerPoint: { lat: 52.5, lon: 13.4 } // Default to Berlin
      };
    }

    const startKm = parseInt(match[1]);
    const endKm = parseInt(match[2]);
    const centerKm = (startKm + endKm) / 2;

    // Approximate coordinates along Berlin-Hamburg corridor
    // Berlin: 52.5200° N, 13.4050° E
    // Hamburg: 53.5511° N, 9.9937° E
    const berlinLat = 52.5200;
    const berlinLon = 13.4050;
    const hamburgLat = 53.5511;
    const hamburgLon = 9.9937;
    
    // Linear interpolation based on distance (289 km total)
    const progress = centerKm / 289;
    const centerLat = berlinLat + (hamburgLat - berlinLat) * progress;
    const centerLon = berlinLon + (hamburgLon - berlinLon) * progress;

    return {
      startKm,
      endKm,
      centerPoint: { lat: centerLat, lon: centerLon }
    };
  }

  /**
   * Identifies key risk factors for a zone
   */
  private identifyKeyRiskFactors(risk: PopulationTrafficRisk): string[] {
    const factors = [];

    // Population-based factors
    if (risk.population > 1000000) {
      factors.push('Major metropolitan area');
    } else if (risk.population > 500000) {
      factors.push('Large urban center');
    } else if (risk.population > 100000) {
      factors.push('Significant population concentration');
    }

    // Traffic-based factors
    if (risk.dailyTrafficVolume > 50000) {
      factors.push('Major transportation hub');
    } else if (risk.dailyTrafficVolume > 20000) {
      factors.push('High passenger traffic');
    } else if (risk.dailyTrafficVolume > 5000) {
      factors.push('Moderate passenger volume');
    }

    // Risk level factors
    if (risk.riskLevel === 'high') {
      factors.push('Limited alternative transportation');
      factors.push('High disruption sensitivity');
    }

    // Impact score factors
    if (risk.disruptionImpactScore >= 80) {
      factors.push('Critical corridor position');
    } else if (risk.disruptionImpactScore >= 60) {
      factors.push('Strategic corridor importance');
    }

    return factors;
  }

  /**
   * Gets mitigation strategies for a risk level
   */
  private getMitigationStrategies(riskLevel: 'critical' | 'high' | 'elevated' | 'moderate' | 'low'): string[] {
    const levelMap = {
      'critical': 'CRITICAL',
      'high': 'HIGH',
      'elevated': 'ELEVATED',
      'moderate': 'MODERATE',
      'low': 'LOW'
    };

    return [...this.MITIGATION_STRATEGIES[levelMap[riskLevel] as keyof typeof this.MITIGATION_STRATEGIES]];
  }

  /**
   * Generates a descriptive zone name
   */
  private async generateZoneName(municipalityId: string, corridorSegment: string): Promise<string> {
    // Mock municipality name mapping
    const municipalityNames: { [key: string]: string } = {
      '11000000': 'Berlin Metropolitan Area',
      '12051000': 'Brandenburg Region',
      '13073141': 'Wittenberge Area',
      '15090015': 'Stendal Region',
      '03353032': 'Uelzen Area',
      '02000000': 'Hamburg Metropolitan Area'
    };

    const municipalityName = municipalityNames[municipalityId] || `Municipality ${municipalityId}`;
    return `${municipalityName} (${corridorSegment})`;
  }

  /**
   * Calculates overall corridor risk profile
   */
  private calculateCorridorRiskProfile(riskZones: Array<{
    riskLevel: string;
    affectedPopulation: number;
    disruptionImpactScore: number;
  }>): {
    totalRiskZones: number;
    criticalZones: number;
    highRiskZones: number;
    totalPopulationAtRisk: number;
    corridorVulnerabilityIndex: number;
    riskDistribution: { [key: string]: number };
  } {
    const totalRiskZones = riskZones.length;
    const criticalZones = riskZones.filter(z => z.riskLevel === 'critical').length;
    const highRiskZones = riskZones.filter(z => z.riskLevel === 'high').length;
    const totalPopulationAtRisk = riskZones.reduce((sum, z) => sum + z.affectedPopulation, 0);
    
    // Calculate vulnerability index (0-100)
    const averageRiskScore = riskZones.reduce((sum, z) => sum + z.disruptionImpactScore, 0) / totalRiskZones;
    const criticalZoneWeight = (criticalZones / totalRiskZones) * 30;
    const highRiskZoneWeight = (highRiskZones / totalRiskZones) * 20;
    const corridorVulnerabilityIndex = Math.min(100, averageRiskScore + criticalZoneWeight + highRiskZoneWeight);

    // Calculate risk distribution
    const riskDistribution: { [key: string]: number } = {};
    ['critical', 'high', 'elevated', 'moderate', 'low'].forEach(level => {
      riskDistribution[level] = riskZones.filter(z => z.riskLevel === level).length;
    });

    return {
      totalRiskZones,
      criticalZones,
      highRiskZones,
      totalPopulationAtRisk,
      corridorVulnerabilityIndex: Math.round(corridorVulnerabilityIndex * 100) / 100,
      riskDistribution
    };
  }

  /**
   * Generates priority actions based on risk zones
   */
  private async generatePriorityActions(riskZones: Array<{
    zoneId: string;
    zoneName: string;
    riskLevel: string;
    affectedPopulation: number;
    dailyPassengers: number;
  }>): Promise<Array<{
    actionId: string;
    description: string;
    targetZones: string[];
    urgency: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    estimatedCost: 'low' | 'medium' | 'high' | 'very_high';
    expectedImpact: string;
    implementationTimeframe: string;
  }>> {
    const actions = [];

    // Immediate actions for critical zones
    const criticalZones = riskZones.filter(z => z.riskLevel === 'critical');
    if (criticalZones.length > 0) {
      actions.push({
        actionId: 'ACT_001_CRITICAL_RESPONSE',
        description: 'Deploy emergency response teams and enhanced monitoring systems',
        targetZones: criticalZones.map(z => z.zoneId),
        urgency: 'immediate' as const,
        estimatedCost: 'high' as const,
        expectedImpact: 'Immediate improvement in disruption response capability',
        implementationTimeframe: '1-2 weeks'
      });

      actions.push({
        actionId: 'ACT_002_CRITICAL_INFO',
        description: 'Implement real-time passenger information and alternative transport coordination',
        targetZones: criticalZones.map(z => z.zoneId),
        urgency: 'immediate' as const,
        estimatedCost: 'medium' as const,
        expectedImpact: 'Reduced passenger confusion and improved service recovery',
        implementationTimeframe: '2-4 weeks'
      });
    }

    // Short-term actions for high-risk zones
    const highRiskZones = riskZones.filter(z => z.riskLevel === 'high');
    if (highRiskZones.length > 0) {
      actions.push({
        actionId: 'ACT_003_HIGH_RISK_MGMT',
        description: 'Enhance delay management protocols and backup service arrangements',
        targetZones: highRiskZones.map(z => z.zoneId),
        urgency: 'short_term' as const,
        estimatedCost: 'medium' as const,
        expectedImpact: 'Improved service reliability and passenger experience',
        implementationTimeframe: '1-3 months'
      });
    }

    // Medium-term actions for high-traffic zones
    const highTrafficZones = riskZones.filter(z => z.dailyPassengers > 20000);
    if (highTrafficZones.length > 0) {
      actions.push({
        actionId: 'ACT_004_CAPACITY_MGMT',
        description: 'Implement advanced passenger flow management and capacity optimization',
        targetZones: highTrafficZones.map(z => z.zoneId),
        urgency: 'medium_term' as const,
        estimatedCost: 'high' as const,
        expectedImpact: 'Better handling of high passenger volumes during disruptions',
        implementationTimeframe: '3-6 months'
      });
    }

    // Long-term actions for high-population zones
    const highPopulationZones = riskZones.filter(z => z.affectedPopulation > 500000);
    if (highPopulationZones.length > 0) {
      actions.push({
        actionId: 'ACT_005_INFRASTRUCTURE',
        description: 'Infrastructure resilience improvements and redundancy development',
        targetZones: highPopulationZones.map(z => z.zoneId),
        urgency: 'long_term' as const,
        estimatedCost: 'very_high' as const,
        expectedImpact: 'Fundamental improvement in corridor resilience',
        implementationTimeframe: '1-3 years'
      });
    }

    return actions;
  }

  /**
   * Stores risk zone analysis results
   */
  private async storeRiskZoneAnalysis(
    riskZones: any[],
    corridorProfile: any
  ): Promise<void> {
    try {
      // Store risk zones
      const zoneQuery = `
        INSERT INTO risk_zone_analysis 
        (zone_id, zone_name, risk_level, priority, disruption_impact_score, 
         affected_population, daily_passengers, corridor_segment, analysis_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)
        ON CONFLICT (zone_id, analysis_date) DO UPDATE SET
          zone_name = EXCLUDED.zone_name,
          risk_level = EXCLUDED.risk_level,
          priority = EXCLUDED.priority,
          disruption_impact_score = EXCLUDED.disruption_impact_score,
          affected_population = EXCLUDED.affected_population,
          daily_passengers = EXCLUDED.daily_passengers,
          corridor_segment = EXCLUDED.corridor_segment
      `;

      for (const zone of riskZones) {
        await this.db.query(zoneQuery, [
          zone.zoneId,
          zone.zoneName,
          zone.riskLevel,
          zone.priority,
          zone.disruptionImpactScore,
          zone.affectedPopulation,
          zone.dailyPassengers,
          zone.corridorSegment
        ]);
      }

      // Store corridor profile
      const profileQuery = `
        INSERT INTO corridor_risk_profile 
        (analysis_date, total_risk_zones, critical_zones, high_risk_zones, 
         total_population_at_risk, corridor_vulnerability_index, risk_distribution)
        VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)
        ON CONFLICT (analysis_date) DO UPDATE SET
          total_risk_zones = EXCLUDED.total_risk_zones,
          critical_zones = EXCLUDED.critical_zones,
          high_risk_zones = EXCLUDED.high_risk_zones,
          total_population_at_risk = EXCLUDED.total_population_at_risk,
          corridor_vulnerability_index = EXCLUDED.corridor_vulnerability_index,
          risk_distribution = EXCLUDED.risk_distribution
      `;

      await this.db.query(profileQuery, [
        corridorProfile.totalRiskZones,
        corridorProfile.criticalZones,
        corridorProfile.highRiskZones,
        corridorProfile.totalPopulationAtRisk,
        corridorProfile.corridorVulnerabilityIndex,
        JSON.stringify(corridorProfile.riskDistribution)
      ]);

      this.logger.debug(`Stored analysis for ${riskZones.length} risk zones`);
    } catch (error) {
      this.logger.error('Error storing risk zone analysis:', error);
      throw new Error('Failed to store risk zone analysis');
    }
  }

  /**
   * Gets current risk zone status and recommendations
   */
  async getRiskZoneStatus(): Promise<{
    activeRiskZones: Array<{
      zoneId: string;
      zoneName: string;
      riskLevel: string;
      currentStatus: 'normal' | 'elevated' | 'disrupted';
      lastUpdated: string;
      activeAlerts: string[];
      recommendedActions: string[];
    }>;
    corridorStatus: {
      overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
      activeDisruptions: number;
      zonesUnderWatch: number;
      lastAssessment: string;
    };
  }> {
    try {
      const query = `
        SELECT rza.zone_id, rza.zone_name, rza.risk_level, rza.priority,
               rza.disruption_impact_score, rza.analysis_date
        FROM risk_zone_analysis rza
        WHERE rza.analysis_date = CURRENT_DATE
        ORDER BY rza.priority ASC
      `;

      const result = await this.db.query(query);
      
      const activeRiskZones = result.rows.map((row: any) => ({
        zoneId: row.zone_id,
        zoneName: row.zone_name,
        riskLevel: row.risk_level,
        currentStatus: this.determineCurrentStatus(row.risk_level),
        lastUpdated: row.analysis_date,
        activeAlerts: this.generateActiveAlerts(row.risk_level, row.disruption_impact_score),
        recommendedActions: this.getMitigationStrategies(row.risk_level as any).slice(0, 3)
      }));

      // Determine overall corridor status
      const criticalZones = activeRiskZones.filter(z => z.riskLevel === 'critical').length;
      const highRiskZones = activeRiskZones.filter(z => z.riskLevel === 'high').length;
      
      let overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
      if (criticalZones > 0) {
        overallRiskLevel = 'critical';
      } else if (highRiskZones > 2) {
        overallRiskLevel = 'high';
      } else if (highRiskZones > 0) {
        overallRiskLevel = 'moderate';
      } else {
        overallRiskLevel = 'low';
      }

      return {
        activeRiskZones,
        corridorStatus: {
          overallRiskLevel,
          activeDisruptions: criticalZones,
          zonesUnderWatch: highRiskZones,
          lastAssessment: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Error getting risk zone status:', error);
      throw new Error('Failed to get risk zone status');
    }
  }

  /**
   * Determines current operational status
   */
  private determineCurrentStatus(riskLevel: string): 'normal' | 'elevated' | 'disrupted' {
    switch (riskLevel) {
      case 'critical':
        return 'disrupted';
      case 'high':
        return 'elevated';
      default:
        return 'normal';
    }
  }

  /**
   * Generates active alerts for a zone
   */
  private generateActiveAlerts(riskLevel: string, impactScore: number): string[] {
    const alerts = [];

    if (riskLevel === 'critical') {
      alerts.push('CRITICAL: High disruption risk - Enhanced monitoring active');
    } else if (riskLevel === 'high') {
      alerts.push('HIGH RISK: Increased vulnerability to service disruptions');
    }

    if (impactScore >= 90) {
      alerts.push('Maximum impact zone - Priority response required');
    } else if (impactScore >= 80) {
      alerts.push('High impact potential - Contingency plans activated');
    }

    return alerts;
  }
}