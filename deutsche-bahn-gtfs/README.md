# Deutsche Bahn GTFS Data

This folder contains Deutsche Bahn GTFS (General Transit Feed Specification) data for the Berlin-Hamburg corridor.

## 📁 Structure

```
deutsche-bahn-gtfs/
├── gtfs-files/          # GTFS text files (excluded from git due to size)
│   ├── agency.txt       # Transit agencies
│   ├── routes.txt       # Train routes (ICE, RE, etc.)
│   ├── trips.txt        # Individual trip instances
│   ├── stops.txt        # Station information
│   ├── stop_times.txt   # Schedule data (large file ~1GB)
│   ├── calendar.txt     # Service calendar
│   └── ...              # Other GTFS files
└── README.md           # This file
```

## 🚄 Data Source

The GTFS data is sourced from Deutsche Bahn's official GTFS feed, containing:

- **Real train routes:** ICE 18, ICE 23, ICE 28
- **Authentic schedules:** Official departure/arrival times
- **Station data:** EVA codes, coordinates, facilities
- **Service patterns:** Daily, weekly, and seasonal variations

## 📊 Usage in Application

The application uses this data through:

1. **GTFS Parser** (`src/parsers/gtfs-parser.js`)
   - Extracts Berlin-Hamburg corridor trains
   - Processes real trip IDs and schedules
   - Validates station data and coordinates

2. **Real-Time Integration**
   - Combines GTFS static data with live APIs
   - Provides authentic train numbers and routes
   - Enables construction impact modeling

## 🔧 Setup Instructions

### Option 1: Download GTFS Data (Recommended)

1. Download Deutsche Bahn GTFS data from official source
2. Extract files to `deutsche-bahn-gtfs/gtfs-files/`
3. Restart the application to load real data

### Option 2: Use Without GTFS (Fallback)

The application works without GTFS files by using:
- Research-based real train data
- Validated route information
- Realistic schedule patterns

## 📝 File Descriptions

| File | Description | Size | Required |
|------|-------------|------|----------|
| `agency.txt` | Transit agency info | Small | Yes |
| `routes.txt` | Train route definitions | Small | Yes |
| `trips.txt` | Trip instances | Medium | Yes |
| `stops.txt` | Station information | Small | Yes |
| `stop_times.txt` | Schedule data | Large (~1GB) | Optional* |
| `calendar.txt` | Service calendar | Small | Yes |
| `calendar_dates.txt` | Service exceptions | Small | Optional |
| `feed_info.txt` | Feed metadata | Small | Optional |

*The application includes fallback data for stop_times.txt due to its large size.

## 🚧 Construction Impact (2026)

The GTFS data is processed to model 2026 construction impacts:

- **Route Changes:** Alternative routing via Lüneburg
- **Schedule Adjustments:** +45 minute journey times
- **Service Reductions:** Hourly instead of every 30 minutes
- **Station Changes:** New stops and cancellations

## 🔍 Data Validation

The parser validates:
- ✅ Station EVA codes match corridor
- ✅ Coordinates are within Germany
- ✅ Train types are ICE/RE/RB
- ✅ Routes connect Berlin-Hamburg
- ✅ Schedules are realistic

## 📞 Support

If you need help with GTFS data:
1. Check the application logs for parsing errors
2. Verify file formats match GTFS specification
3. Ensure files are UTF-8 encoded
4. Contact Deutsche Bahn for official data access

---

**Note:** GTFS files are excluded from git due to size constraints. The application includes fallback data to ensure functionality without requiring large file downloads.