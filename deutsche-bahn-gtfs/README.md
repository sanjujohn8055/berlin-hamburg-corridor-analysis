# Deutsche Bahn GTFS Data

This folder contains Deutsche Bahn GTFS (General Transit Feed Specification) data for the Berlin-Hamburg corridor, stored using Git LFS for efficient handling of large files.

## 📁 Structure

```
deutsche-bahn-gtfs/
├── gtfs-files/          # GTFS text files (managed by Git LFS)
│   ├── agency.txt       # Transit agencies (small)
│   ├── routes.txt       # Train routes (ICE, RE, etc.) (small)
│   ├── trips.txt        # Individual trip instances (medium)
│   ├── stops.txt        # Station information (small)
│   ├── stop_times.txt   # Schedule data (large ~1GB) 🔄 Git LFS
│   ├── calendar.txt     # Service calendar (small)
│   ├── calendar_dates.txt # Service exceptions (small)
│   ├── feed_info.txt    # Feed metadata (small)
│   └── attributions.txt # Data attributions (small)
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

### ✅ **GTFS Files Included (Git LFS)**

The GTFS files are now included in the repository using Git LFS:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sanjujohn8055/berlin-hamburg-corridor-analysis.git
   cd berlin-hamburg-corridor-analysis
   ```

2. **Git LFS will automatically download the files:**
   ```bash
   git lfs pull  # If needed
   ```

3. **Start the application:**
   ```bash
   node real-time-api-server.js
   ```

4. **Verify GTFS data loading:**
   - Check console for "✅ Loaded X real trains from GTFS data"
   - Visit http://localhost:3000/api/health for data source status

### 🔄 **Git LFS Configuration**

The repository uses Git LFS to handle large GTFS files:

```bash
# Files tracked by Git LFS
deutsche-bahn-gtfs/gtfs-files/*.txt

# Large files (>100MB) are stored efficiently
# stop_times.txt (~1GB) is handled seamlessly
```

## 📝 File Descriptions

| File | Description | Size | Git LFS |
|------|-------------|------|---------|
| `agency.txt` | Transit agency info | 1KB | No |
| `routes.txt` | Train route definitions | 15KB | No |
| `trips.txt` | Trip instances | 2MB | Yes |
| `stops.txt` | Station information | 500KB | No |
| `stop_times.txt` | Schedule data | ~1GB | Yes ✅ |
| `calendar.txt` | Service calendar | 5KB | No |
| `calendar_dates.txt` | Service exceptions | 100KB | No |
| `feed_info.txt` | Feed metadata | 1KB | No |
| `attributions.txt` | Data attributions | 1KB | No |

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

## 📊 Real Data Benefits

With GTFS files included, you get:

- **Authentic Train Numbers:** Real ICE 18, ICE 23, ICE 28
- **Official Schedules:** Actual Deutsche Bahn departure/arrival times
- **Real Station Data:** Correct EVA codes and coordinates
- **Service Patterns:** Accurate frequency and routing
- **Construction Modeling:** Realistic 2026 impact simulation

## 📞 Support

If you need help with GTFS data:
1. Check the application logs for parsing errors
2. Verify Git LFS is installed: `git lfs --version`
3. Pull LFS files if needed: `git lfs pull`
4. Ensure files are UTF-8 encoded
5. Contact Deutsche Bahn for official data access

## 🔄 Updating GTFS Data

To update with newer GTFS data:

1. **Replace files in `deutsche-bahn-gtfs/gtfs-files/`**
2. **Add and commit:**
   ```bash
   git add deutsche-bahn-gtfs/gtfs-files/
   git commit -m "update: GTFS data to latest version"
   git push origin main
   ```
3. **Git LFS handles large files automatically**

---

**✅ GTFS files are now included in the repository using Git LFS for optimal performance and full project functionality with authentic Deutsche Bahn data!**