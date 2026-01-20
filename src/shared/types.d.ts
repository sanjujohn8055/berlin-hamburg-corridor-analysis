export interface CorridorStation {
    eva: number;
    name: string;
    coordinates: [number, number];
    distanceFromBerlin: number;
    category: number;
    platforms: number;
    facilities: StationFacilities;
    upgradePriority: number;
    isStrategicHub: boolean;
}
export interface StationFacilities {
    hasWiFi: boolean;
    hasTravelCenter: boolean;
    hasDBLounge: boolean;
    hasLocalPublicTransport: boolean;
    hasParking: boolean;
    steplessAccess: 'yes' | 'no' | 'partial';
    hasMobilityService: boolean;
}
export interface UpgradePriorityMetrics {
    trafficVolume: number;
    capacityConstraints: number;
    strategicImportance: number;
    facilityDeficits: number;
    compositeScore: number;
}
export interface ConnectionFragility {
    fromStation: number;
    toStation: number;
    bufferTime: number;
    fragilityScore: number;
    cascadeRisk: number;
    alternativeRoutes: number;
    recommendations: string[];
}
export interface PopulationTrafficRisk {
    municipalityId: string;
    corridorSegment: string;
    population: number;
    dailyTrafficVolume: number;
    disruptionImpactScore: number;
    riskLevel: 'low' | 'medium' | 'high';
}
export interface PriorityConfiguration {
    infrastructureWeight: number;
    timetableWeight: number;
    populationRiskWeight: number;
    focusArea: 'infrastructure' | 'timetable' | 'population' | 'balanced';
}
export interface CorridorStationsResponse {
    stations: {
        eva: number;
        name: string;
        distanceFromBerlin: number;
        upgradePriority: number;
        priorityLevel: 'low' | 'medium' | 'high';
        recommendations: string[];
    }[];
    corridorHealth: {
        overallScore: number;
        criticalStationsCount: number;
        averageUpgradePriority: number;
    };
}
export interface ConnectionFragilityResponse {
    connections: {
        fromStation: string;
        toStation: string;
        fragilityScore: number;
        bufferTime: number;
        cascadeRisk: number;
        recommendations: string[];
    }[];
    mostVulnerableConnections: string[];
}
export interface RiskZonesResponse {
    riskZones: {
        municipalityId: string;
        name: string;
        population: number;
        trafficVolume: number;
        disruptionImpactScore: number;
        riskLevel: 'low' | 'medium' | 'high';
    }[];
    highestRiskAreas: string[];
}
export interface CorridorDashboardResponse {
    topUpgradePriorities: {
        eva: number;
        name: string;
        urgencyScore: number;
        estimatedCost: string;
        expectedImpact: string;
    }[];
    mostFragileConnections: {
        route: string;
        fragilityScore: number;
        recommendedAction: string;
    }[];
    highestRiskZones: {
        area: string;
        impactScore: number;
        affectedPopulation: number;
    }[];
}
export interface StationRecord {
    eva: number;
    name: string;
    coordinates: string;
    distance_from_berlin: number;
    category: number;
    platform_count: number;
    facilities: object;
    is_strategic_hub: boolean;
}
export interface UpgradePriorityRecord {
    eva: number;
    analysis_date: string;
    traffic_volume: number;
    capacity_constraints: number;
    strategic_importance: number;
    facility_deficits: number;
    upgrade_priority_score: number;
}
export interface ConnectionFragilityRecord {
    from_eva: number;
    to_eva: number;
    analysis_date: string;
    buffer_time: number;
    fragility_score: number;
    cascade_risk: number;
    alternative_routes: number;
}
export interface PopulationRiskRecord {
    municipality_id: string;
    corridor_segment: string;
    analysis_date: string;
    population: number;
    daily_traffic_volume: number;
    disruption_impact_score: number;
    risk_level: string;
}
export interface PriorityConfigRecord {
    user_id: string;
    config_name: string;
    infrastructure_weight: number;
    timetable_weight: number;
    population_risk_weight: number;
    focus_area: string;
    created_at: string;
}
//# sourceMappingURL=types.d.ts.map