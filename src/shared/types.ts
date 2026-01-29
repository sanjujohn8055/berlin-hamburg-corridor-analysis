// Core data types for Berlin-Hamburg Corridor Analysis System

export interface CorridorStation {
  eva: number;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  distanceFromBerlin: number; // km along corridor
  category: number;
  platforms: number;
  facilities: StationFacilities;
  upgradePriority: number; // 0-100
  isStrategicHub: boolean;
  suggestions?: string[]; // Actionable improvement suggestions
  congestionReasons?: string[]; // Real-time congestion analysis
  realTimeData?: RealTimeStationData; // Live operational data
  dataSource?: 'real-api' | 'enhanced-mock';
}

export interface Train {
  trainNumber: string;
  trainType: string;
  operator: string;
  route: string;
  frequency: string;
  journey: TrainStop[];
  constructionImpact?: boolean;
  busReplacement?: string[];
  line?: string;
  realTimeStatus?: {
    overallDelay: number;
    status: 'on-time' | 'minor-delay' | 'delayed';
    lastUpdated: string;
    stops: TrainStop[];
    reliability: number;
    passengerLoad: number;
  };
  delayHistory?: Array<{
    date: string;
    avgDelay: number;
    onTimePerformance: number;
    cancellations: number;
  }>;
  nextDepartures?: Array<{
    scheduledTime: string;
    estimatedDelay: number;
    platform: string;
    status: string;
  }>;
}

export interface TrainStop {
  station: string;
  eva: number;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  actualDeparture?: string | null;
  actualArrival?: string | null;
  delay?: number;
  status?: 'on-time' | 'minor-delay' | 'delayed';
  platform: string;
}

export interface RealTimeStationData {
  avgDelay: number; // Average delay in minutes
  delayedTrains: number; // Number of delayed trains
  cancelledTrains: number; // Number of cancelled trains
  platformChanges: number; // Number of platform changes
  totalDepartures: number; // Total departures in time window
  lastUpdated: string; // ISO timestamp
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
  compositeScore: number; // 0-100
}

export interface ConnectionFragility {
  fromStation: number;
  toStation: number;
  bufferTime: number; // minutes
  fragilityScore: number; // 0-100
  cascadeRisk: number;
  alternativeRoutes: number;
  recommendations: string[];
}

export interface PopulationTrafficRisk {
  municipalityId: string;
  corridorSegment: string;
  population: number;
  dailyTrafficVolume: number;
  disruptionImpactScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PriorityConfiguration {
  infrastructureWeight: number; // 0-1
  timetableWeight: number; // 0-1
  populationRiskWeight: number; // 0-1
  focusArea: 'infrastructure' | 'timetable' | 'population' | 'balanced';
}

// API Response Types
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

// Database Models
export interface StationRecord {
  eva: number;
  name: string;
  coordinates: string; // PostGIS POINT
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