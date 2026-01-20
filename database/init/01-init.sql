-- Berlin-Hamburg Corridor Analysis Database Schema
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Berlin-Hamburg corridor stations
CREATE TABLE corridor_stations (
    eva BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    coordinates GEOMETRY(POINT, 4326) NOT NULL,
    distance_from_berlin INTEGER, -- km
    category INTEGER,
    platform_count INTEGER,
    facilities JSONB,
    is_strategic_hub BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index for coordinates
CREATE INDEX idx_corridor_stations_coordinates ON corridor_stations USING GIST(coordinates);
CREATE INDEX idx_corridor_stations_distance ON corridor_stations(distance_from_berlin);

-- Station upgrade priority analysis
CREATE TABLE station_upgrade_priorities (
    eva BIGINT REFERENCES corridor_stations(eva),
    analysis_date DATE,
    traffic_volume INTEGER,
    capacity_constraints DECIMAL(5,2),
    strategic_importance DECIMAL(5,2),
    facility_deficits DECIMAL(5,2),
    upgrade_priority_score DECIMAL(5,2),
    recommendations JSONB,
    PRIMARY KEY (eva, analysis_date)
);

-- Connection fragility analysis
CREATE TABLE connection_fragility (
    from_eva BIGINT REFERENCES corridor_stations(eva),
    to_eva BIGINT REFERENCES corridor_stations(eva),
    analysis_date DATE,
    buffer_time INTEGER, -- minutes
    fragility_score DECIMAL(5,2),
    cascade_risk DECIMAL(5,2),
    alternative_routes INTEGER,
    recommendations JSONB,
    PRIMARY KEY (from_eva, to_eva, analysis_date)
);

-- Population-traffic risk zones
CREATE TABLE population_traffic_risk (
    municipality_id VARCHAR(20),
    corridor_segment VARCHAR(100),
    analysis_date DATE,
    population INTEGER,
    daily_traffic_volume INTEGER,
    disruption_impact_score DECIMAL(5,2),
    risk_level VARCHAR(10),
    recommendations JSONB,
    PRIMARY KEY (municipality_id, analysis_date)
);

-- User priority configurations
CREATE TABLE priority_configurations (
    user_id VARCHAR(50),
    config_name VARCHAR(100),
    infrastructure_weight DECIMAL(3,2),
    timetable_weight DECIMAL(3,2),
    population_risk_weight DECIMAL(3,2),
    focus_area VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, config_name)
);

-- User active configurations tracking
CREATE TABLE user_active_configurations (
    user_id VARCHAR(50) PRIMARY KEY,
    active_config_name VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Risk zone analysis
CREATE TABLE risk_zone_analysis (
    zone_id VARCHAR(50),
    analysis_date DATE,
    zone_name VARCHAR(255) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    priority INTEGER NOT NULL,
    disruption_impact_score DECIMAL(5,2) NOT NULL,
    affected_population INTEGER,
    daily_passengers INTEGER,
    corridor_segment VARCHAR(50),
    key_risk_factors JSONB,
    mitigation_strategies JSONB,
    geographic_bounds JSONB,
    PRIMARY KEY (zone_id, analysis_date)
);

-- Corridor risk profile
CREATE TABLE corridor_risk_profile (
    analysis_date DATE PRIMARY KEY,
    total_risk_zones INTEGER NOT NULL,
    critical_zones INTEGER NOT NULL,
    high_risk_zones INTEGER NOT NULL,
    total_population_at_risk BIGINT,
    corridor_vulnerability_index DECIMAL(5,2),
    risk_distribution JSONB
);

-- Analysis cache for performance
CREATE TABLE analysis_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_data JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_upgrade_priorities_date ON station_upgrade_priorities(analysis_date);
CREATE INDEX idx_upgrade_priorities_score ON station_upgrade_priorities(upgrade_priority_score DESC);
CREATE INDEX idx_connection_fragility_date ON connection_fragility(analysis_date);
CREATE INDEX idx_connection_fragility_score ON connection_fragility(fragility_score DESC);
CREATE INDEX idx_population_risk_date ON population_traffic_risk(analysis_date);
CREATE INDEX idx_population_risk_score ON population_traffic_risk(disruption_impact_score DESC);
CREATE INDEX idx_analysis_cache_expires ON analysis_cache(expires_at);

-- Insert sample Berlin-Hamburg corridor stations for development
INSERT INTO corridor_stations (eva, name, coordinates, distance_from_berlin, category, platform_count, facilities, is_strategic_hub) VALUES
(8011160, 'Berlin Hbf', ST_GeomFromText('POINT(13.369545 52.525589)', 4326), 0, 1, 14, '{"hasWiFi": true, "hasTravelCenter": true, "hasDBLounge": true, "hasLocalPublicTransport": true, "hasParking": true, "steplessAccess": "yes", "hasMobilityService": true}', true),
(8010404, 'Berlin-Spandau', ST_GeomFromText('POINT(13.197540 52.534722)', 4326), 15, 2, 6, '{"hasWiFi": true, "hasTravelCenter": true, "hasDBLounge": false, "hasLocalPublicTransport": true, "hasParking": true, "steplessAccess": "yes", "hasMobilityService": true}', false),
(8000152, 'Hagenow Land', ST_GeomFromText('POINT(11.187500 53.425000)', 4326), 180, 4, 2, '{"hasWiFi": false, "hasTravelCenter": false, "hasDBLounge": false, "hasLocalPublicTransport": false, "hasParking": true, "steplessAccess": "partial", "hasMobilityService": false}', false),
(8002548, 'Hamburg Hbf', ST_GeomFromText('POINT(10.006389 53.552778)', 4326), 289, 1, 12, '{"hasWiFi": true, "hasTravelCenter": true, "hasDBLounge": true, "hasLocalPublicTransport": true, "hasParking": true, "steplessAccess": "yes", "hasMobilityService": true}', true);

-- Insert default priority configuration
INSERT INTO priority_configurations (user_id, config_name, infrastructure_weight, timetable_weight, population_risk_weight, focus_area) VALUES
('default', 'balanced', 0.33, 0.33, 0.34, 'balanced'),
('default', 'infrastructure_focus', 0.60, 0.20, 0.20, 'infrastructure'),
('default', 'timetable_focus', 0.20, 0.60, 0.20, 'timetable'),
('default', 'population_focus', 0.20, 0.20, 0.60, 'population');