exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      mode: 'netlify-serverless',
      apis: {
        transport_rest: {
          configured: true,
          status: 'connected',
          endpoint: 'https://v6.db.transport.rest'
        }
      },
      features: {
        realTimeData: true,
        congestionAnalysis: true,
        gtfsData: true,
        constructionImpact: true
      }
    })
  };
};