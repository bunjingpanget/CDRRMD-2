async function getWeather(req, res) {
  const latitude = Number(req.query.latitude ?? 14.2117);
  const longitude = Number(req.query.longitude ?? 121.1653);
  const forecastDays = Math.min(16, Math.max(1, Number(req.query.forecast_days ?? 14)));

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m,apparent_temperature&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max&forecast_days=${forecastDays}&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    return res.status(502).json({ message: 'Failed to fetch weather from Open-Meteo.' });
  }

  const data = await response.json();
  return res.json(data);
}

module.exports = { getWeather };
