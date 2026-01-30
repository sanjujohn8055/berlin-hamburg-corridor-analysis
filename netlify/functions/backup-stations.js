exports.handler = async (event, context) => {
  const backupStationsData = [
    {
      eva: 8011113,
      name: "Berlin Südkreuz",
      coordinates: [13.365556, 52.475556],
      distanceFromBerlin: 8,
      realTimeData: {
        avgDelay: 3,
        delayedTrains: 2,
        cancelledTrains: 0
      }
    },
    {
      eva: 8010255,
      name: "Berlin Ostbahnhof",
      coordinates: [13.434722, 52.510278],
      distanceFromBerlin: 5,
      realTimeData: {
        avgDelay: 5,
        delayedTrains: 3,
        cancelledTrains: 1
      }
    },
    {
      eva: 8000147,
      name: "Hamburg-Harburg",
      coordinates: [9.983333, 53.455556],
      distanceFromBerlin: 274,
      realTimeData: {
        avgDelay: 2,
        delayedTrains: 1,
        cancelledTrains: 0
      }
    },
    {
      eva: 8002553,
      name: "Hamburg-Altona",
      coordinates: [9.935556, 53.552778],
      distanceFromBerlin: 281,
      realTimeData: {
        avgDelay: 4,
        delayedTrains: 2,
        cancelledTrains: 0
      }
    },
    {
      eva: 8013456,
      name: "Brandenburg(Havel) Hbf",
      coordinates: [12.559722, 52.408333],
      distanceFromBerlin: 70,
      realTimeData: {
        avgDelay: 6,
        delayedTrains: 4,
        cancelledTrains: 1
      }
    },
    {
      eva: 8000226,
      name: "Lüneburg",
      coordinates: [10.414722, 53.249167],
      distanceFromBerlin: 180,
      realTimeData: {
        avgDelay: 1,
        delayedTrains: 0,
        cancelledTrains: 0
      }
    }
  ];

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
      data: backupStationsData,
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: "Deutsche Bahn Network Analysis + Construction Planning",
        constructionPeriod: "August 2025 - April 2026",
        totalBackupOptions: backupStationsData.length
      }
    })
  };
};