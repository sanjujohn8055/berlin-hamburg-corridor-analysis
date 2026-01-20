import { CorridorStation, UpgradePriorityMetrics } from '../../shared/types';
import { Logger } from '../utils/Logger';

/**
 * Service for generating station-specific upgrade recommendations
 */
export class RecommendationService {
  private logger = Logger.getInstance();

  /**
   * Generates upgrade recommendations for a station based on its metrics
   */
  generateStationRecommendations(
    station: CorridorStation,
    metrics: UpgradePriorityMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Infrastructure recommendations based on capacity constraints
    if (metrics.capacityConstraints >= 75) {
      recommendations.push(...this.getInfrastructureRecommendations(station, 'high'));
    } else if (metrics.capacityConstraints >= 50) {
      recommendations.push(...this.getInfrastructureRecommendations(station, 'medium'));
    } else if (metrics.capacityConstraints >= 25) {
      recommendations.push(...this.getInfrastructureRecommendations(station, 'low'));
    }

    // Facility recommendations based on deficits
    if (metrics.facilityDeficits >= 60) {
      recommendations.push(...this.getFacilityRecommendations(station, 'high'));
    } else if (metrics.facilityDeficits >= 30) {
      recommendations.push(...this.getFacilityRecommendations(station, 'medium'));
    }

    // Strategic recommendations based on importance and traffic
    if (metrics.strategicImportance >= 80 && metrics.trafficVolume >= 70) {
      recommendations.push(...this.getStrategicRecommendations(station));
    }

    // Ensure we have at least one recommendation
    if (recommendations.length === 0) {
      recommendations.push('Monitor station performance and reassess in 6 months');
    }

    return recommendations;
  }

  /**
   * Gets infrastructure upgrade recommendations
   */
  private getInfrastructureRecommendations(
    station: CorridorStation,
    priority: 'high' | 'medium' | 'low'
  ): string[] {
    const recommendations: string[] = [];

    switch (priority) {
      case 'high':
        if (station.platforms < this.getExpectedPlatforms(station.category)) {
          recommendations.push(`Urgent: Add ${this.getExpectedPlatforms(station.category) - station.platforms} additional platforms to meet capacity demands`);
        }
        recommendations.push('Implement platform extension project within 12 months');
        recommendations.push('Conduct detailed capacity analysis and passenger flow study');
        break;

      case 'medium':
        recommendations.push('Plan platform capacity improvements within 18-24 months');
        if (station.platforms < this.getExpectedPlatforms(station.category)) {
          recommendations.push('Consider platform lengthening for longer trains');
        }
        break;

      case 'low':
        recommendations.push('Monitor platform utilization and plan future capacity increases');
        break;
    }

    return recommendations;
  }

  /**
   * Gets facility upgrade recommendations
   */
  private getFacilityRecommendations(
    station: CorridorStation,
    priority: 'high' | 'medium'
  ): string[] {
    const recommendations: string[] = [];
    const facilities = station.facilities;

    if (priority === 'high') {
      if (facilities.steplessAccess === 'no') {
        recommendations.push('Priority: Install elevators/ramps for barrier-free access (legal requirement)');
      }
      if (!facilities.hasWiFi && station.category <= 3) {
        recommendations.push('Install free WiFi infrastructure for passenger convenience');
      }
      if (!facilities.hasTravelCenter && station.category <= 2) {
        recommendations.push('Establish or upgrade travel center for improved customer service');
      }
    }

    if (priority === 'medium' || priority === 'high') {
      if (!facilities.hasLocalPublicTransport) {
        recommendations.push('Coordinate with local authorities to improve public transport connections');
      }
      if (!facilities.hasParking && station.category <= 4) {
        recommendations.push('Develop Park & Ride facilities to increase accessibility');
      }
      if (facilities.steplessAccess === 'partial') {
        recommendations.push('Complete barrier-free access improvements throughout the station');
      }
    }

    return recommendations;
  }

  /**
   * Gets strategic upgrade recommendations for important stations
   */
  private getStrategicRecommendations(station: CorridorStation): string[] {
    const recommendations: string[] = [];

    if (station.isStrategicHub) {
      recommendations.push('Prioritize as strategic corridor hub - allocate premium upgrade budget');
      recommendations.push('Implement digital passenger information systems');
      recommendations.push('Consider premium facility upgrades (DB Lounge, enhanced waiting areas)');
    }

    // Position-specific recommendations
    if (station.distanceFromBerlin === 0 || station.distanceFromBerlin >= 289) {
      recommendations.push('Endpoint station: Focus on capacity and passenger flow optimization');
    } else if (station.distanceFromBerlin >= 140 && station.distanceFromBerlin <= 150) {
      recommendations.push('Mid-corridor position: Optimize for connection reliability and transfer efficiency');
    }

    return recommendations;
  }

  /**
   * Gets expected platform count for station category
   */
  private getExpectedPlatforms(category: number): number {
    const expectedPlatforms: { [key: number]: number } = {
      1: 12, // Major stations
      2: 8,  // Important stations
      3: 6,  // Regional stations
      4: 4,  // Local stations
      5: 2,  // Small stations
      6: 2,  // Halt points
      7: 1   // Basic stops
    };
    return expectedPlatforms[category] || 2;
  }

  /**
   * Estimates implementation cost category
   */
  estimateImplementationCost(
    station: CorridorStation,
    metrics: UpgradePriorityMetrics
  ): 'low' | 'medium' | 'high' | 'very_high' {
    let costScore = 0;

    // Platform infrastructure costs
    if (metrics.capacityConstraints >= 75) {
      costScore += 40; // Major platform work
    } else if (metrics.capacityConstraints >= 50) {
      costScore += 25; // Moderate platform work
    }

    // Facility upgrade costs
    if (metrics.facilityDeficits >= 60) {
      costScore += 30; // Major facility upgrades
    } else if (metrics.facilityDeficits >= 30) {
      costScore += 15; // Moderate facility upgrades
    }

    // Station category multiplier
    if (station.category <= 2) {
      costScore *= 1.5; // Major stations cost more
    }

    if (costScore >= 80) return 'very_high';
    if (costScore >= 60) return 'high';
    if (costScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Estimates expected impact of improvements
   */
  estimateExpectedImpact(
    station: CorridorStation,
    metrics: UpgradePriorityMetrics
  ): 'low' | 'medium' | 'high' | 'very_high' {
    let impactScore = 0;

    // Traffic volume impact
    if (metrics.trafficVolume >= 80) {
      impactScore += 30; // High traffic = high impact
    } else if (metrics.trafficVolume >= 60) {
      impactScore += 20;
    }

    // Strategic importance impact
    if (metrics.strategicImportance >= 80) {
      impactScore += 25;
    } else if (metrics.strategicImportance >= 60) {
      impactScore += 15;
    }

    // Current deficit impact (higher deficits = higher improvement potential)
    if (metrics.capacityConstraints >= 75 || metrics.facilityDeficits >= 75) {
      impactScore += 30;
    } else if (metrics.capacityConstraints >= 50 || metrics.facilityDeficits >= 50) {
      impactScore += 20;
    }

    // Hub status multiplier
    if (station.isStrategicHub) {
      impactScore *= 1.3;
    }

    if (impactScore >= 80) return 'very_high';
    if (impactScore >= 60) return 'high';
    if (impactScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Generates implementation timeline
   */
  generateImplementationTimeline(
    metrics: UpgradePriorityMetrics,
    costCategory: 'low' | 'medium' | 'high' | 'very_high'
  ): string {
    if (metrics.compositeScore >= 90) {
      return 'Immediate (0-6 months) - Critical priority';
    } else if (metrics.compositeScore >= 75) {
      return costCategory === 'very_high' ? 'Short-term (6-18 months)' : 'Short-term (3-12 months)';
    } else if (metrics.compositeScore >= 50) {
      return costCategory === 'very_high' ? 'Medium-term (1-3 years)' : 'Medium-term (6-24 months)';
    } else {
      return 'Long-term (2-5 years) - Monitor and reassess';
    }
  }
}