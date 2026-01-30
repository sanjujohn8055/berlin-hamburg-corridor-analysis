exports.handler = async (event, context) => {
  const backupStations = {
    primaryBackups: [
      {
        originalStation: "Berlin Hbf",
        eva: 8011160,
        backupOptions: [
          {
            stationName: "Berlin Südkreuz",
            eva: 8011113,
            coordinates: [13.365556, 52.475556],
            distance: "8km south",
            capacity: "High",
            facilities: ["ICE services", "S-Bahn hub", "Regional connections"],
            advantages: [
              "🚄 Major ICE hub with excellent connections",
              "🚊 Comprehensive S-Bahn and regional rail access",
              "🅿️ Large parking facilities available"
            ],
            limitations: [
              "⚠️ Slightly longer journey to city center",
              "🚶 Additional transfer required for some destinations"
            ],
            constructionImpact: "Minimal - will serve as primary Berlin alternative during 2026"
          },
          {
            stationName: "Berlin Ostbahnhof",
            eva: 8010255,
            coordinates: [13.434722, 52.510278],
            distance: "5km east",
            capacity: "Medium",
            facilities: ["Regional services", "S-Bahn", "Limited ICE"],
            advantages: [
              "🚊 Excellent S-Bahn connections",
              "🏙️ Close to city center",
              "🚂 Some ICE services available"
            ],
            limitations: [
              "⚠️ Limited ICE frequency",
              "🚶 May require additional transfers"
            ],
            constructionImpact: "Low impact - suitable backup option"
          }
        ]
      },
      {
        originalStation: "Hamburg Hbf",
        eva: 8002548,
        backupOptions: [
          {
            stationName: "Hamburg-Harburg",
            eva: 8000147,
            coordinates: [9.983333, 53.455556],
            distance: "15km south",
            capacity: "High",
            facilities: ["ICE services", "Regional hub", "S-Bahn"],
            advantages: [
              "🚄 Major ICE stop with direct Berlin connections",
              "🚊 S-Bahn connection to Hamburg city center",
              "🅿️ Ample parking facilities"
            ],
            limitations: [
              "🚊 20-minute S-Bahn journey to Hamburg center",
              "⚠️ Less frequent services than main station"
            ],
            constructionImpact: "CRITICAL - Primary Hamburg alternative during 2026 construction"
          },
          {
            stationName: "Hamburg-Altona",
            eva: 8002553,
            coordinates: [9.935556, 53.552778],
            distance: "8km west",
            capacity: "Medium",
            facilities: ["Regional services", "S-Bahn hub"],
            advantages: [
              "🚊 Excellent local transport connections",
              "🏙️ Close to Hamburg city center",
              "🚂 Good regional rail access"
            ],
            limitations: [
              "❌ No ICE services",
              "🔄 Requires transfer for long-distance travel"
            ],
            constructionImpact: "Medium impact - regional alternative only"
          }
        ]
      },
      {
        originalStation: "Rathenow",
        eva: 8010334,
        backupOptions: [
          {
            stationName: "Brandenburg(Havel)",
            eva: 8013456,
            coordinates: [12.559722, 52.408333],
            distance: "25km south",
            capacity: "Medium",
            facilities: ["Regional services", "Limited ICE"],
            advantages: [
              "🚂 Some ICE services available",
              "🏛️ Historic junction with regional connections",
              "🅿️ Parking available"
            ],
            limitations: [
              "🚌 Bus connection required to Rathenow",
              "⚠️ Limited service frequency"
            ],
            constructionImpact: "HIGH - Critical backup during Rathenow closure"
          },
          {
            stationName: "Stendal",
            eva: 8010316,
            coordinates: [11.858611, 52.607222],
            distance: "45km north",
            capacity: "Medium",
            facilities: ["Regional hub", "Some ICE services"],
            advantages: [
              "🚂 Regular ICE services",
              "🎯 Central corridor position",
              "🚌 Bus connections available"
            ],
            limitations: [
              "🚌 Significant bus journey required",
              "⏰ Extended travel time"
            ],
            constructionImpact: "MEDIUM - Alternative routing hub"
          }
        ]
      }
    ],
    emergencyProcedures: {
      majorDisruption: [
        "🚨 Activate emergency passenger information protocols",
        "🚌 Deploy bus replacement services immediately",
        "📱 Send push notifications to all registered passengers",
        "🎯 Redirect passengers to nearest backup stations"
      ],
      constructionPeriod: [
        "🚄 All ICE services rerouted via Lüneburg",
        "🚌 Bus replacement: Rathenow ↔ Hagenow Land",
        "📊 Increase service frequency on alternative routes",
        "🏢 Hamburg-Harburg becomes primary Hamburg hub"
      ],
      weatherDisruption: [
        "❄️ Activate winter service protocols",
        "🚂 Reduce service speed for safety",
        "🔧 Deploy additional maintenance crews",
        "📢 Enhanced passenger communication"
      ]
    },
    constructionAlternatives: {
      period: "August 2025 - April 2026",
      primaryRoute: "Berlin → Lüneburg → Hamburg-Harburg → Hamburg",
      keyChanges: [
        "🚄 All ICE trains rerouted via Lüneburg",
        "🚌 Bus replacement: Rathenow ↔ Hagenow Land section",
        "⏰ Journey time increases by ~45 minutes",
        "🔄 Service frequency reduced from 30min to hourly"
      ],
      temporaryStops: [
        {
          stationName: "Lüneburg",
          eva: 8000226,
          coordinates: [10.414722, 53.249167],
          status: "Temporary ICE stop during construction",
          facilities: ["Platform extension", "Enhanced passenger services"],
          importance: "Critical hub for alternative routing"
        }
      ]
    },
    recommendations: {
      passengers: [
        "📱 Download DB Navigator app for real-time updates",
        "🎫 Consider flexible tickets during construction period",
        "⏰ Allow extra 60 minutes travel time during construction",
        "🚊 Use S-Bahn alternatives in Berlin and Hamburg"
      ],
      operators: [
        "📊 Implement dynamic passenger flow management",
        "🚌 Ensure adequate bus replacement capacity",
        "📱 Enhance mobile information systems",
        "🎯 Staff backup stations with additional personnel"
      ]
    }
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify({
      success: true,
      data: backupStations,
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: "Deutsche Bahn Network Analysis + Construction Planning",
        constructionPeriod: "August 2025 - April 2026",
        totalBackupOptions: 6
      }
    })
  };
};