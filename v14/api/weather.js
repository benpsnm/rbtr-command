// ── Standalone weather endpoint — Open-Meteo (no API key) ──────────────────
// GET /api/weather  → { temp, wind_speed, weather_code, description, high, low, rain_probability }
// Rotherham: lat 53.4302, lon -1.3568

const LAT = 53.4302;
const LON = -1.3568;

const WMO_DESCRIPTIONS = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Foggy', 48:'Freezing fog', 51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain', 71:'Light snow', 73:'Snow', 75:'Heavy snow',
  80:'Rain showers', 81:'Rain showers', 82:'Violent rain showers',
  95:'Thunderstorm', 96:'Thunderstorm with hail', 99:'Thunderstorm with heavy hail',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=600');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FLondon&forecast_days=1`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
    const j = await r.json();
    const c = j.current || {};
    const d = j.daily || {};
    const code = c.weather_code ?? null;
    res.status(200).json({
      temp: c.temperature_2m ?? null,
      wind_speed: c.wind_speed_10m ?? null,
      weather_code: code,
      description: WMO_DESCRIPTIONS[code] || 'Unknown',
      high: d.temperature_2m_max?.[0] ?? null,
      low: d.temperature_2m_min?.[0] ?? null,
      rain_probability: d.precipitation_probability_max?.[0] ?? null,
      location: 'Rotherham',
    });
  } catch (e) {
    res.status(200).json({ temp: null, wind_speed: null, weather_code: null, description: null, high: null, low: null, rain_probability: null, location: 'Rotherham', error: e.message });
  }
};
