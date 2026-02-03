# Power BI Data Export

This folder contains scripts to export data from the Berlin-Hamburg Corridor Analysis APIs into CSV files optimized for Power BI Desktop import.

## Usage

```bash
npm run export:powerbi
```

## Generated Files

### stations.csv
Station master data with real-time operational metrics.

**Columns:**
- `eva`: Station EVA number (unique identifier)
- `name`: Station name
- `distanceFromBerlinKm`: Distance from Berlin in kilometers
- `lat`: Latitude coordinate
- `lon`: Longitude coordinate
- `stationType`: Station category (Major Hub, Regional, Local)
- `platformCount`: Number of platforms
- `hasDBLounge`: DB Lounge availability (boolean)
- `hasTravelCenter`: Travel center availability (boolean)
- `hasWifi`: WiFi availability (boolean)
- `accessibilityLevel`: Accessibility level (yes/partial/no)
- `isHub`: Strategic hub status (boolean)
- `avgDelayMinutes`: Average delay in minutes
- `delayedTrains`: Number of delayed trains
- `cancelledTrains`: Number of cancelled trains
- `lastUpdated`: Last update timestamp

### trains.csv
Train service data with routing information.

**Columns:**
- `trainNumber`: Train service number
- `serviceType`: Type of service (ICE, IC, RE, etc.)
- `originStation`: Origin station name
- `destinationStation`: Destination station name
- `plannedDeparture`: Planned departure time
- `plannedArrival`: Planned arrival time
- `direction`: Travel direction
- `isConstructionRoute`: Construction period route (boolean)
- `isAlternativeRoute`: Alternative route flag (boolean)

### delay_summary.csv
Hourly delay analysis by station.

**Columns:**
- `stationEva`: Station EVA number
- `stationName`: Station name
- `hourOfDay`: Hour of day (0-23)
- `avgDelayMinutes`: Average delay for this hour
- `delayedTrainCount`: Number of delayed trains
- `cancelledTrainCount`: Number of cancelled trains

## Data Sources

The export script fetches data from these API endpoints:
- `GET /api/stations` - Station master data with real-time metrics
- `GET /api/trains` - Train service information
- `GET /api/delay-analysis` - Delay analysis and performance data

## Power BI Import

1. Open Power BI Desktop
2. Get Data → Text/CSV
3. Select the generated CSV files from this folder
4. Use the column headers as field names
5. Set appropriate data types:
   - EVA numbers: Whole Number
   - Coordinates: Decimal Number
   - Timestamps: Date/Time
   - Boolean fields: True/False

## Error Handling

The export script includes:
- Automatic retry logic for API calls
- Graceful error handling with detailed logging
- Data validation and transformation
- Non-zero exit codes on failure

## Requirements

- Node.js 18+
- TypeScript
- Running backend API server (default: http://localhost:3001)