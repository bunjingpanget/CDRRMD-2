export function getWeatherVisualByCode(weatherCode?: number) {
  if (weatherCode === undefined || weatherCode === null) {
    return {
      condition: 'Unknown',
      backgroundUri: 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=1200&auto=format&fit=crop',
    };
  }

  const rainyCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
  const cloudyCodes = [1, 2, 3, 45, 48];
  const sunnyCodes = [0];

  if (rainyCodes.includes(weatherCode)) {
    return {
      condition: 'Rainy',
      backgroundUri: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1200&auto=format&fit=crop',
    };
  }

  if (sunnyCodes.includes(weatherCode)) {
    return {
      condition: 'Sunny',
      backgroundUri: 'https://images.unsplash.com/photo-1498925008800-019c04b2fcf1?w=1200&auto=format&fit=crop',
    };
  }

  if (cloudyCodes.includes(weatherCode)) {
    return {
      condition: 'Cloudy',
      backgroundUri: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1200&auto=format&fit=crop',
    };
  }

  return {
    condition: 'Partly Cloudy',
    backgroundUri: 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=1200&auto=format&fit=crop',
  };
}
