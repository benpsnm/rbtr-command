// Weather feed for route cities — no API key needed (Open-Meteo).
// Ben's current position + upcoming route checkpoints.

const POINTS = [
  { name: 'Rotherham',       lat: 53.4302, lon: -1.3568 },
  { name: 'Istanbul',        lat: 41.0082, lon: 28.9784 },  // route start, Turkey
  { name: 'Dushanbe',        lat: 38.5598, lon: 68.7870 },  // Pamir Highway gateway
  { name: 'Kathmandu',       lat: 27.7172, lon: 85.3240 },  // Nepal / EBC
  { name: 'Nairobi',         lat: -1.2921, lon: 36.8219 },  // East Africa
  { name: 'Cape Town',       lat: -33.9249, lon: 18.4241 }, // Southern Africa
  { name: 'Burleigh Heads',  lat: -28.0916, lon: 153.4510 }, // destination
];

exports.handler = async () => {
  try {
    const results = await Promise.all(POINTS.map(async p => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current_weather=true`;
      const r = await fetch(url);
      const j = await r.json();
      return {
        name: p.name,
        temp: j.current_weather?.temperature,
        wind: j.current_weather?.windspeed,
        code: j.current_weather?.weathercode,
        time: j.current_weather?.time,
      };
    }));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ points: results }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
