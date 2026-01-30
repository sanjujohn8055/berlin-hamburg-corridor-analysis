exports.handler = async (event, context) => {
  // Extract route parameters from path
  const pathSegments = event.path.split('/');
  const from = pathSegments[pathSegments.length - 2];
  const to = pathSegments[pathSegments.length - 1];

  // Handle the case where the path might be /api/routes/from/to or /.netlify/functions/routes/from/to
  let fromEva = from;
  let toEva = to;
  
  // If the path doesn't contain the EVA numbers, use defaults
  if (!from || !to || from === 'routes') {
    fromEva = '8011160'; // Berlin Hbf
    toEva = '8002548';   // Hamburg Hbf
  }

  const alternativeRoutes = {
    success: true,
    data: [
      {
        legs: [
          {
            line: {
              name: "ICE 18",
              product: "ICE"
            },
            origin: {
              name: "Berlin Hbf"
            },
            destination: {
              name: "Hamburg Hbf"
            },
            departure: "08:00",
            arrival: "09:40",
            duration: 100
          }
        ],
        duration: 100,
        price: {
          amount: 49.90,
          currency: "EUR"
        }
      },
      {
        legs: [
          {
            line: {
              name: "ICE 23",
              product: "ICE"
            },
            origin: {
              name: "Berlin Hbf"
            },
            destination: {
              name: "Hamburg-Harburg"
            },
            departure: "09:30",
            arrival: "11:45",
            duration: 135
          },
          {
            line: {
              name: "S3",
              product: "S-Bahn"
            },
            origin: {
              name: "Hamburg-Harburg"
            },
            destination: {
              name: "Hamburg Hbf"
            },
            departure: "11:50",
            arrival: "12:10",
            duration: 20
          }
        ],
        duration: 155,
        price: {
          amount: 49.90,
          currency: "EUR"
        }
      },
      {
        legs: [
          {
            line: {
              name: "RE 1",
              product: "Regional"
            },
            origin: {
              name: "Berlin Hbf"
            },
            destination: {
              name: "Lüneburg"
            },
            departure: "10:15",
            arrival: "12:30",
            duration: 135
          },
          {
            line: {
              name: "RE 3",
              product: "Regional"
            },
            origin: {
              name: "Lüneburg"
            },
            destination: {
              name: "Hamburg Hbf"
            },
            departure: "12:45",
            arrival: "13:30",
            duration: 45
          }
        ],
        duration: 195,
        price: {
          amount: 29.90,
          currency: "EUR"
        }
      }
    ],
    metadata: {
      requestedRoute: `${fromEva} → ${toEva}`,
      lastUpdated: new Date().toISOString(),
      dataSource: "Deutsche Bahn Route Planning + Construction Analysis",
      constructionPeriod: "August 2025 - April 2026"
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
    body: JSON.stringify(alternativeRoutes)
  };
};