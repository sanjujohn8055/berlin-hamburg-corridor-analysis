import { ConnectionFragility, CorridorStation } from '../../shared/types';
import { DatabaseService } from './DatabaseService';
import { ConnectionFragilityService } from './ConnectionFragilityService';
import { Logger } from '../utils/Logger';

/**
 * Service for ranking fragile connections and generating improvement recommendations
 */
export class FragilityRankingService {
  private db: DatabaseService;
  private fragilityService: ConnectionFragilityService;
  private logger = Logger.getInstance();

  // Ranking criteria weights
  private readonly RANKING_WEIGHTS = {
    FRAGILITY_SCORE: 0.4,      // Base fragility score importance
    CASCADE_IMPACT: 0.3,       // Cascade delay impact
    PASSENGER_VOLUME: 0.2,     // Passenger volume affected
    STRATEGIC_IMPORTANCE: 0.1   // Strategic corridor importance
  };

  // Recommendation priority levels
  private readonly PRIORITY_LEVELS = {
    CRITICAL: { min: 80, label: 'Critical', color: '#FF4444' },
    HIGH: { min: 60, label: 'High', color: '#FF8800' },
    MEDIUM: { min: 40, label: 'Medium', color: '#FFAA00' },
    LOW: { min: 0, label: 'Low', color: '#88CC88' }
  };

  constructor(databaseService: DatabaseService, fragilityService: ConnectionFragilityService) {
    this.db = databaseService;
    this.fragilityService = fragilityService;
  }

  /**
   * Ranks all corridor connections by vulnerability impact
   */
  async rankConnectionsByVulnerability(): Promise<Array<{
    connection: ConnectionFragility;
    vulnerabilityRank: number;
    impactScore: number;
    priorityLevel: string;
    stationNames: { from: string; to: string };
    recommendations: Array<{
      type: 'immediate' | 'short_term' | 'long_term';
      action: string;
      expectedImpact: string;
      estimatedCost: 'low' | 'medium' | 'high';
      implementationTime: string;
    }>;
  }>> {
    try {
      this.logger.info('Starting connection vulnerability ranking');

      // Get all fragility analysis data
      const connections = await this.fragilityService.getFragilityAnalysis();
      
      // Calculate impact scores and rank connections
      const rankedConnections = [];
      
      for (let i = 0; i < connections.length; i++) {
        const connection = connections[i];
        
        // Calculate comprehensive impact score
        const impactScore = await this.calculateImpactScore(connection);
        
        // Get station names for display
        const stationNames = await this.getStationNames(connection.fromStation, connection.toStation);
        
        // Generate detailed recommendations
        const recommendations = await this.generateDetailedRecommendations(connection, impactScore);
        
        // Determine priority level
        const priorityLevel = this.getPriorityLevel(impactScore);
        
        rankedConnections.push({
          connection,
          vulnerabilityRank: i + 1, // Will be re-sorted
          impactScore,
          priorityLevel,
          stationNames,
          recommendations
        });
      }

      // Sort by impact score (highest first)
      rankedConnections.sort((a, b) => b.impactScore - a.impactScore);
      
      // Update ranks after sorting
      rankedConnections.forEach((item, index) => {
        item.vulnerabilityRank = index + 1;
      });

      this.logger.info(`Ranked ${rankedConnections.length} connections by vulnerability`);
      return rankedConnections;
    } catch (error) {
      this.logger.error('Error ranking connections by vulnerability:', error);
      throw new Error('Failed to rank connections by vulnerability');
    }
  }

  /**
   * Gets the top N most vulnerable connections
   */
  async getTopVulnerableConnections(limit: number = 10): Promise<Array<{
    fromStation: string;
    toStation: string;
    fragilityScore: number;
    impactScore: number;
    priorityLevel: string;
    keyIssues: string[];
    recommendedActions: string[];
  }>> {
    try {
      const rankedConnections = await this.rankConnectionsByVulnerability();
      
      return rankedConnections.slice(0, limit).map(item => ({
        fromStation: item.stationNames.from,
        toStation: item.stationNames.to,
        fragilityScore: item.connection.fragilityScore,
        impactScore: item.impactScore,
        priorityLevel: item.priorityLevel,
        keyIssues: this.identifyKeyIssues(item.connection),
        recommendedActions: item.recommendations
          .filter(rec => rec.type === 'immediate')
          .map(rec => rec.action)
      }));
    } catch (error) {
      this.logger.error('Error getting top vulnerable connections:', error);
      throw new Error('Failed to get top vulnerable connections');
    }
  }

  /**
   * Generates timetable improvement recommendations for the corridor
   */
  async generateTimetableImprovements(): Promise<{
    overallAssessment: {
      totalConnections: number;
      criticalConnections: number;
      averageFragilityScore: number;
      corridorHealthScore: number;
    };
    priorityActions: Array<{
      priority: 'immediate' | 'short_term' | 'long_term';
      actions: Array<{
        description: string;
        affectedConnections: number;
        expectedImprovement: string;
        implementationComplexity: 'low' | 'medium' | 'high';
      }>;
    }>;
    specificRecommendations: Array<{
      connectionRoute: string;
      currentIssues: string[];
      proposedSolutions: string[];
      expectedOutcome: string;
    }>;
  }> {
    try {
      this.logger.info('Generating timetable improvement recommendations');

      const rankedConnections = await this.rankConnectionsByVulnerability();
      
      // Calculate overall assessment
      const totalConnections = rankedConnections.length;
      const criticalConnections = rankedConnections.filter(c => c.priorityLevel === 'Critical').length;
      const averageFragilityScore = rankedConnections.reduce((sum, c) => sum + c.connection.fragilityScore, 0) / totalConnections;
      const corridorHealthScore = Math.max(0, 100 - averageFragilityScore);

      // Group recommendations by priority
      const priorityActions = this.groupRecommendationsByPriority(rankedConnections);
      
      // Generate specific recommendations for top connections
      const specificRecommendations = rankedConnections
        .slice(0, 10) // Top 10 most vulnerable
        .map(item => ({
          connectionRoute: `${item.stationNames.from} → ${item.stationNames.to}`,
          currentIssues: this.identifyKeyIssues(item.connection),
          proposedSolutions: item.recommendations.map(rec => rec.action),
          expectedOutcome: this.calculateExpectedOutcome(item.connection, item.recommendations)
        }));

      return {
        overallAssessment: {
          totalConnections,
          criticalConnections,
          averageFragilityScore: Math.round(averageFragilityScore * 100) / 100,
          corridorHealthScore: Math.round(corridorHealthScore * 100) / 100
        },
        priorityActions,
        specificRecommendations
      };
    } catch (error) {
      this.logger.error('Error generating timetable improvements:', error);
      throw new Error('Failed to generate timetable improvements');
    }
  }

  /**
   * Updates fragility assessments with real-time data
   */
  async updateFragilityAssessments(): Promise<{
    updatedConnections: number;
    newCriticalConnections: number;
    improvedConnections: number;
    analysisTimestamp: string;
  }> {
    try {
      this.logger.info('Updating fragility assessments with real-time data');

      // Get previous analysis for comparison
      const previousAnalysis = await this.fragilityService.getFragilityAnalysis();
      const previousCritical = previousAnalysis.filter(c => c.fragilityScore >= 80).length;

      // Run new fragility analysis
      const newAnalysis = await this.fragilityService.analyzeCorridorConnectionFragility();
      const newCritical = newAnalysis.filter(c => c.fragilityScore >= 80).length;

      // Calculate improvements (connections that became less fragile)
      const improvedConnections = this.calculateImprovedConnections(previousAnalysis, newAnalysis);

      return {
        updatedConnections: newAnalysis.length,
        newCriticalConnections: Math.max(0, newCritical - previousCritical),
        improvedConnections,
        analysisTimestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error updating fragility assessments:', error);
      throw new Error('Failed to update fragility assessments');
    }
  }

  /**
   * Calculates comprehensive impact score for a connection
   */
  private async calculateImpactScore(connection: ConnectionFragility): Promise<number> {
    try {
      // Base fragility score (0-100)
      const fragilityComponent = connection.fragilityScore * this.RANKING_WEIGHTS.FRAGILITY_SCORE;
      
      // Cascade impact (0-100)
      const cascadeComponent = connection.cascadeRisk * this.RANKING_WEIGHTS.CASCADE_IMPACT;
      
      // Passenger volume impact (estimated based on station importance)
      const passengerVolumeComponent = await this.estimatePassengerVolumeImpact(connection) * this.RANKING_WEIGHTS.PASSENGER_VOLUME;
      
      // Strategic importance (based on corridor position and station category)
      const strategicComponent = await this.calculateStrategicImportance(connection) * this.RANKING_WEIGHTS.STRATEGIC_IMPORTANCE;
      
      return Math.min(100, fragilityComponent + cascadeComponent + passengerVolumeComponent + strategicComponent);
    } catch (error) {
      this.logger.error('Error calculating impact score:', error);
      return connection.fragilityScore; // Fallback to base fragility score
    }
  }

  /**
   * Estimates passenger volume impact for a connection
   */
  private async estimatePassengerVolumeImpact(connection: ConnectionFragility): Promise<number> {
    try {
      const fromStation = await this.getStationInfo(connection.fromStation);
      const toStation = await this.getStationInfo(connection.toStation);
      
      if (!fromStation || !toStation) return 50; // Default medium impact
      
      // Higher category stations (lower numbers) have higher passenger volumes
      const avgCategory = (fromStation.category + toStation.category) / 2;
      
      // Strategic hubs have higher impact
      const hubBonus = (fromStation.is_strategic_hub || toStation.is_strategic_hub) ? 20 : 0;
      
      // Convert category to impact score (category 1 = high impact, category 7 = low impact)
      const categoryImpact = Math.max(0, 100 - (avgCategory - 1) * 15);
      
      return Math.min(100, categoryImpact + hubBonus);
    } catch (error) {
      this.logger.error('Error estimating passenger volume impact:', error);
      return 50; // Default medium impact
    }
  }

  /**
   * Calculates strategic importance of a connection
   */
  private async calculateStrategicImportance(connection: ConnectionFragility): Promise<number> {
    try {
      const fromStation = await this.getStationInfo(connection.fromStation);
      const toStation = await this.getStationInfo(connection.toStation);
      
      if (!fromStation || !toStation) return 50; // Default medium importance
      
      // Distance from Berlin affects strategic importance
      const avgDistance = (fromStation.distance_from_berlin + toStation.distance_from_berlin) / 2;
      
      // Mid-corridor connections are often more strategic
      let distanceScore = 50;
      if (avgDistance > 50 && avgDistance < 200) {
        distanceScore = 80; // High importance for mid-corridor
      } else if (avgDistance <= 50 || avgDistance >= 250) {
        distanceScore = 90; // Very high importance for endpoints
      }
      
      // Alternative routes factor
      const alternativeBonus = Math.max(0, (5 - connection.alternativeRoutes) * 10);
      
      return Math.min(100, distanceScore + alternativeBonus);
    } catch (error) {
      this.logger.error('Error calculating strategic importance:', error);
      return 50; // Default medium importance
    }
  }

  /**
   * Generates detailed recommendations for a connection
   */
  private async generateDetailedRecommendations(
    connection: ConnectionFragility, 
    impactScore: number
  ): Promise<Array<{
    type: 'immediate' | 'short_term' | 'long_term';
    action: string;
    expectedImpact: string;
    estimatedCost: 'low' | 'medium' | 'high';
    implementationTime: string;
  }>> {
    const recommendations = [];

    // Immediate actions (high fragility)
    if (connection.fragilityScore >= 80) {
      recommendations.push({
        type: 'immediate' as const,
        action: `Increase buffer time to minimum 15 minutes for this critical connection`,
        expectedImpact: 'Reduce delay cascade risk by 40-60%',
        estimatedCost: 'low' as const,
        implementationTime: '1-2 weeks'
      });
    }

    if (connection.cascadeRisk >= 70) {
      recommendations.push({
        type: 'immediate' as const,
        action: 'Implement real-time delay management protocols',
        expectedImpact: 'Reduce cascade delays by 30-50%',
        estimatedCost: 'medium' as const,
        implementationTime: '2-4 weeks'
      });
    }

    // Short-term actions
    if (connection.fragilityScore >= 60) {
      recommendations.push({
        type: 'short_term' as const,
        action: 'Optimize timetable structure to improve connection reliability',
        expectedImpact: 'Improve on-time performance by 15-25%',
        estimatedCost: 'medium' as const,
        implementationTime: '2-3 months'
      });
    }

    if (connection.alternativeRoutes <= 2) {
      recommendations.push({
        type: 'short_term' as const,
        action: 'Develop alternative routing procedures for service disruptions',
        expectedImpact: 'Reduce passenger impact during disruptions by 20-40%',
        estimatedCost: 'low' as const,
        implementationTime: '1-2 months'
      });
    }

    // Long-term actions
    if (impactScore >= 70) {
      recommendations.push({
        type: 'long_term' as const,
        action: 'Consider infrastructure improvements to increase capacity and reliability',
        expectedImpact: 'Fundamental improvement in connection stability',
        estimatedCost: 'high' as const,
        implementationTime: '1-3 years'
      });
    }

    return recommendations;
  }

  /**
   * Gets station names for display
   */
  private async getStationNames(fromEva: number, toEva: number): Promise<{ from: string; to: string }> {
    try {
      const query = `
        SELECT eva, name FROM corridor_stations 
        WHERE eva IN ($1, $2)
      `;
      
      const result = await this.db.query(query, [fromEva, toEva]);
      const stations = new Map(result.rows.map((row: any) => [row.eva, row.name]));
      
      return {
        from: stations.get(fromEva) || `Station ${fromEva}`,
        to: stations.get(toEva) || `Station ${toEva}`
      };
    } catch (error) {
      this.logger.error('Error getting station names:', error);
      return {
        from: `Station ${fromEva}`,
        to: `Station ${toEva}`
      };
    }
  }

  /**
   * Gets station information
   */
  private async getStationInfo(eva: number): Promise<any> {
    try {
      const query = `
        SELECT eva, name, distance_from_berlin, category, is_strategic_hub
        FROM corridor_stations
        WHERE eva = $1
      `;

      const result = await this.db.query(query, [eva]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error getting station info:', error);
      return null;
    }
  }

  /**
   * Determines priority level based on impact score
   */
  private getPriorityLevel(impactScore: number): string {
    for (const [level, config] of Object.entries(this.PRIORITY_LEVELS)) {
      if (impactScore >= config.min) {
        return config.label;
      }
    }
    return this.PRIORITY_LEVELS.LOW.label;
  }

  /**
   * Identifies key issues for a connection
   */
  private identifyKeyIssues(connection: ConnectionFragility): string[] {
    const issues = [];
    
    if (connection.bufferTime < 5) {
      issues.push('Critically short buffer time');
    } else if (connection.bufferTime < 10) {
      issues.push('Insufficient buffer time');
    }
    
    if (connection.cascadeRisk >= 70) {
      issues.push('High cascade delay risk');
    }
    
    if (connection.alternativeRoutes <= 1) {
      issues.push('No alternative routing options');
    } else if (connection.alternativeRoutes <= 2) {
      issues.push('Limited alternative routes');
    }
    
    if (connection.fragilityScore >= 80) {
      issues.push('Critical connection vulnerability');
    }
    
    return issues;
  }

  /**
   * Groups recommendations by priority level
   */
  private groupRecommendationsByPriority(rankedConnections: any[]): Array<{
    priority: 'immediate' | 'short_term' | 'long_term';
    actions: Array<{
      description: string;
      affectedConnections: number;
      expectedImprovement: string;
      implementationComplexity: 'low' | 'medium' | 'high';
    }>;
  }> {
    const grouped = {
      immediate: new Map<string, number>(),
      short_term: new Map<string, number>(),
      long_term: new Map<string, number>()
    };

    // Count occurrences of each recommendation type
    rankedConnections.forEach(item => {
      item.recommendations.forEach((rec: any) => {
        const map = grouped[rec.type as keyof typeof grouped];
        if (map) {
          map.set(rec.action, (map.get(rec.action) || 0) + 1);
        }
      });
    });

    return [
      {
        priority: 'immediate',
        actions: Array.from(grouped.immediate.entries()).map(([action, count]) => ({
          description: action,
          affectedConnections: count,
          expectedImprovement: 'High impact within weeks',
          implementationComplexity: 'low'
        }))
      },
      {
        priority: 'short_term',
        actions: Array.from(grouped.short_term.entries()).map(([action, count]) => ({
          description: action,
          affectedConnections: count,
          expectedImprovement: 'Moderate impact within months',
          implementationComplexity: 'medium'
        }))
      },
      {
        priority: 'long_term',
        actions: Array.from(grouped.long_term.entries()).map(([action, count]) => ({
          description: action,
          affectedConnections: count,
          expectedImprovement: 'Fundamental improvements over years',
          implementationComplexity: 'high'
        }))
      }
    ];
  }

  /**
   * Calculates expected outcome for recommendations
   */
  private calculateExpectedOutcome(connection: ConnectionFragility, recommendations: any[]): string {
    const immediateActions = recommendations.filter(r => r.type === 'immediate').length;
    const shortTermActions = recommendations.filter(r => r.type === 'short_term').length;
    
    if (immediateActions >= 2) {
      return 'Significant improvement in connection reliability expected within 1-2 months';
    } else if (immediateActions >= 1 || shortTermActions >= 2) {
      return 'Moderate improvement in connection stability expected within 3-6 months';
    } else {
      return 'Gradual improvement expected with long-term infrastructure investments';
    }
  }

  /**
   * Calculates number of improved connections
   */
  private calculateImprovedConnections(previous: ConnectionFragility[], current: ConnectionFragility[]): number {
    let improved = 0;
    
    const currentMap = new Map(
      current.map(c => [`${c.fromStation}-${c.toStation}`, c.fragilityScore])
    );
    
    previous.forEach(prev => {
      const key = `${prev.fromStation}-${prev.toStation}`;
      const currentScore = currentMap.get(key);
      
      if (currentScore !== undefined && currentScore < prev.fragilityScore - 5) {
        improved++;
      }
    });
    
    return improved;
  }
}