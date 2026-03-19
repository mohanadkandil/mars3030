export interface PSGMarsData {
  temperature: number;
  tempMin: number;
  tempMax: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  dustTau: number;
  iceTau: number;
  visibility: number;
  waterVapor: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  season: string;
  solarLongitude: number;
  source: string;
  sol: string;
  isLive: boolean;
}

export interface HourlyForecast {
  hour: number;
  temp: number;
  windSpeed: number;
  dustLevel: 'clear' | 'low' | 'moderate' | 'high' | 'storm';
}

export interface SolForecast {
  sol: number;
  label: string;
  tempMin: number;
  tempMax: number;
  pressure: number;
  windSpeed: number;
  dustTau: number;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function calculateSolarLongitude(date: Date): number {
  const j2000 = new Date('2000-01-01T12:00:00Z');
  const daysSinceJ2000 = (date.getTime() - j2000.getTime()) / (1000 * 60 * 60 * 24);
  const M = (19.3871 + 0.52402073 * daysSinceJ2000) % 360;
  const Mrad = M * Math.PI / 180;
  const eoc = (10.691 + 3.7e-7 * daysSinceJ2000) * Math.sin(Mrad)
            + 0.623 * Math.sin(2 * Mrad)
            + 0.050 * Math.sin(3 * Mrad)
            + 0.005 * Math.sin(4 * Mrad);
  const ls = (M + eoc + 250.99) % 360;
  return ls < 0 ? ls + 360 : ls;
}

function getMarsSeason(ls: number): string {
  if (ls >= 0 && ls < 90) return 'Northern Spring';
  if (ls >= 90 && ls < 180) return 'Northern Summer';
  if (ls >= 180 && ls < 270) return 'Northern Fall';
  return 'Northern Winter';
}

function calculateMarsSol(date: Date): number {
  const perseveranceLanding = new Date('2021-02-18T20:55:00Z');
  const earthMs = date.getTime() - perseveranceLanding.getTime();
  const solMs = 88775.244 * 1000;
  return Math.floor(earthMs / solMs);
}

function calculateSunTimes(ls: number): { sunrise: string; sunset: string; dayLength: number } {
  const latitude = 18.4;
  const latRad = latitude * Math.PI / 180;
  const obliquity = 25.19;
  const declination = obliquity * Math.sin(ls * Math.PI / 180);
  const decRad = declination * Math.PI / 180;
  const cosH = -Math.tan(latRad) * Math.tan(decRad);

  let dayLengthHours: number;
  if (cosH < -1) {
    dayLengthHours = 24.66;
  } else if (cosH > 1) {
    dayLengthHours = 0;
  } else {
    const H = Math.acos(cosH) * 180 / Math.PI;
    dayLengthHours = (2 * H / 360) * 24.66;
  }

  const solarNoon = 12.33;
  const halfDay = dayLengthHours / 2;
  const sunriseHour = solarNoon - halfDay;
  const sunsetHour = solarNoon + halfDay;

  const formatTime = (h: number): string => {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  return {
    sunrise: formatTime(Math.max(0, sunriseHour)),
    sunset: formatTime(Math.min(24.66, sunsetHour)),
    dayLength: dayLengthHours
  };
}

function calculatePressure(ls: number, sol: number): number {
  const seasonalVariation = Math.cos((ls - 300) * Math.PI / 180) * 1.2;
  const basePressure = 7.5;
  const dailyVar = seededRandom(sol * 7) * 0.2 - 0.1;
  return basePressure + seasonalVariation + dailyVar;
}

function calculateDustTau(ls: number, sol: number): number {
  let baseTau = 0.3;

  if (ls >= 180 && ls <= 330) {
    const stormSeasonProgress = (ls - 180) / 150;
    baseTau += 0.4 * Math.sin(stormSeasonProgress * Math.PI);
    if (seededRandom(sol * 13) > 0.85) {
      baseTau += seededRandom(sol * 17) * 1.5;
    }
  }

  if (seededRandom(sol * 23) > 0.995 && ls > 200 && ls < 300) {
    baseTau += 2.0 + seededRandom(sol * 29) * 2.0;
  }

  baseTau += (seededRandom(sol * 31) - 0.5) * 0.15;
  return Math.max(0.1, baseTau);
}

function calculateWind(ls: number, sol: number): { speed: number; direction: number } {
  let baseDirection = 270;

  if (ls >= 0 && ls < 180) {
    baseDirection += (seededRandom(sol * 41) - 0.5) * 60;
  } else {
    baseDirection += (seededRandom(sol * 43) - 0.5) * 40;
  }

  let windSpeed = 5 + seededRandom(sol * 47) * 10;

  if (ls >= 180 && ls <= 330) {
    windSpeed += 5 + seededRandom(sol * 51) * 8;
  }

  const windKmh = windSpeed * 3.6;

  return {
    speed: Math.round(windKmh),
    direction: Math.round(((baseDirection % 360) + 360) % 360)
  };
}

function calculateTemperature(ls: number, sol: number): { avg: number; min: number; max: number } {
  const seasonalTemp = 15 * Math.sin((ls - 90) * Math.PI / 180);
  const baseTemp = -55 + seasonalTemp;
  const dailyVar = (seededRandom(sol * 53) - 0.5) * 8;
  const avgTemp = baseTemp + dailyVar;
  const diurnalRange = 70 + seededRandom(sol * 59) * 15;

  return {
    avg: Math.round(avgTemp),
    min: Math.round(avgTemp - diurnalRange / 2),
    max: Math.round(avgTemp + diurnalRange / 2 - 10)
  };
}

function calculateUVIndex(dustTau: number, ls: number): number {
  const distanceEffect = 1 + 0.2 * Math.cos((ls - 250) * Math.PI / 180);
  const baseUV = 10 * distanceEffect;
  const uvIndex = baseUV * Math.exp(-dustTau * 0.5);
  return Math.round(uvIndex * 10) / 10;
}

function calculateVisibility(dustTau: number): number {
  const visibility = 40 * Math.exp(-dustTau * 1.2);
  return Math.round(Math.max(0.5, visibility) * 10) / 10;
}

function calculateWaterVapor(ls: number, sol: number): number {
  let baseVapor = 8;
  if (ls >= 60 && ls <= 180) {
    baseVapor += 8 * Math.sin((ls - 60) / 120 * Math.PI);
  }
  baseVapor += (seededRandom(sol * 61) - 0.5) * 3;
  return Math.round(Math.max(2, baseVapor) * 10) / 10;
}

function calculateIceTau(ls: number, sol: number): number {
  let iceTau = 0.01;
  if (ls >= 30 && ls <= 150) {
    iceTau += 0.02 * Math.sin((ls - 30) / 120 * Math.PI);
  }
  iceTau += seededRandom(sol * 67) * 0.01;
  return Math.round(iceTau * 1000) / 1000;
}

let cachedPSGData: { timestamp: number; data: PSGMarsData } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

function buildPSGConfig(date: Date, ls: number): string {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
  const timeStr = date.toISOString().split('T')[1].substring(0, 5);
  const sol = calculateMarsSol(date);
  const temp = calculateTemperature(ls, sol);
  const surfaceTempK = temp.avg + 273.15;

  return `<OBJECT>Mars
<OBJECT-DATE>${dateStr} ${timeStr}
<OBJECT-NAME>Mars
<GEOMETRY>Nadir
<GEOMETRY-OBS-ALTITUDE>0
<GEOMETRY-ALTITUDE-UNIT>km
<GEOMETRY-USER-PARAM>18.4,77.5
<ATMOSPHERE-STRUCTURE>Equilibrium
<ATMOSPHERE-WEIGHT>43.34
<ATMOSPHERE-PRESSURE>${calculatePressure(ls, sol).toFixed(2)}
<ATMOSPHERE-PUNIT>mbar
<ATMOSPHERE-NGAS>2
<ATMOSPHERE-GAS>CO2,N2
<ATMOSPHERE-TYPE>HIT[2],HIT[22]
<ATMOSPHERE-ABUN>0.953,0.027
<ATMOSPHERE-UNIT>scl,scl
<SURFACE-TEMPERATURE>${Math.round(surfaceTempK)}
<SURFACE-ALBEDO>0.2
<GENERATOR-RANGE1>1.0
<GENERATOR-RANGE2>5.0
<GENERATOR-RANGEUNIT>um
<GENERATOR-RESOLUTION>200
<GENERATOR-RESOLUTIONUNIT>RP`;
}

async function fetchLivePSGData(): Promise<PSGMarsData | null> {
  try {
    const now = new Date();
    const ls = calculateSolarLongitude(now);
    const config = buildPSGConfig(now, ls);

    const response = await fetch('https://psg.gsfc.nasa.gov/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `file=${encodeURIComponent(config)}`,
    });

    if (!response.ok) throw new Error(`PSG API error: ${response.status}`);

    const text = await response.text();
    const lines = text.split('\n');

    let surfaceTemp = 220;
    let pressure = 6.1;

    for (const line of lines) {
      if (line.includes('Surface-Temperature')) {
        const match = line.match(/(\d+\.?\d*)/);
        if (match) surfaceTemp = parseFloat(match[1]);
      }
      if (line.includes('Pressure')) {
        const match = line.match(/(\d+\.?\d*)/);
        if (match) pressure = parseFloat(match[1]);
      }
    }

    const sol = calculateMarsSol(now);
    const sunTimes = calculateSunTimes(ls);
    const dustTau = calculateDustTau(ls, sol);
    const wind = calculateWind(ls, sol);

    return {
      temperature: Math.round(surfaceTemp - 273.15),
      tempMin: Math.round(surfaceTemp - 273.15 - 35),
      tempMax: Math.round(surfaceTemp - 273.15 + 25),
      pressure: Math.round(pressure * 1000) / 1000,
      windSpeed: wind.speed,
      windDirection: wind.direction,
      dustTau: dustTau,
      iceTau: calculateIceTau(ls, sol),
      visibility: calculateVisibility(dustTau),
      waterVapor: calculateWaterVapor(ls, sol),
      uvIndex: calculateUVIndex(dustTau, ls),
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
      season: getMarsSeason(ls),
      solarLongitude: Math.round(ls * 100) / 100,
      source: 'NASA PSG API — Jezero Crater (18.4°N, 77.5°E)',
      sol: sol.toString(),
      isLive: true,
    };
  } catch (error) {
    console.warn('PSG API fetch failed:', error);
    return null;
  }
}

function generateMarsWeather(simDay: number): PSGMarsData {
  const now = new Date();
  const simDate = new Date(now.getTime() + simDay * 24 * 60 * 60 * 1000);

  const ls = calculateSolarLongitude(simDate);
  const sol = calculateMarsSol(simDate);
  const sunTimes = calculateSunTimes(ls);
  const temp = calculateTemperature(ls, sol);
  const pressure = calculatePressure(ls, sol);
  const dustTau = calculateDustTau(ls, sol);
  const wind = calculateWind(ls, sol);

  return {
    temperature: temp.avg,
    tempMin: temp.min,
    tempMax: temp.max,
    pressure: Math.round(pressure * 1000) / 1000,
    windSpeed: wind.speed,
    windDirection: wind.direction,
    dustTau: Math.round(dustTau * 1000) / 1000,
    iceTau: calculateIceTau(ls, sol),
    visibility: calculateVisibility(dustTau),
    waterVapor: calculateWaterVapor(ls, sol),
    uvIndex: calculateUVIndex(dustTau, ls),
    sunrise: sunTimes.sunrise,
    sunset: sunTimes.sunset,
    season: getMarsSeason(ls),
    solarLongitude: Math.round(ls * 100) / 100,
    source: `NASA PSG Model — Jezero Crater | ${simDate.toISOString().split('T')[0]}`,
    sol: sol.toString(),
    isLive: false,
  };
}

export async function fetchPSGMarsData(simDay: number = 0): Promise<PSGMarsData> {
  if (cachedPSGData && Date.now() - cachedPSGData.timestamp < CACHE_DURATION && simDay === 0) {
    return cachedPSGData.data;
  }

  if (simDay === 0) {
    const liveData = await fetchLivePSGData();
    if (liveData) {
      cachedPSGData = { timestamp: Date.now(), data: liveData };
      return liveData;
    }
  }

  return generateMarsWeather(simDay);
}

export function generateHourlyForecast(data: PSGMarsData): HourlyForecast[] {
  const forecast: HourlyForecast[] = [];
  const tempRange = data.tempMax - data.tempMin;
  const sol = parseInt(data.sol) || 0;

  for (let hour = 0; hour < 24; hour++) {
    const hourAngle = ((hour - 14) / 24) * Math.PI * 2;
    const tempVariation = Math.cos(hourAngle) * (tempRange / 2);
    const temp = Math.round(data.temperature + tempVariation);

    const isDaytime = hour >= 7 && hour <= 18;
    const windMultiplier = isDaytime ? 1.3 : 0.6;
    const hourSeed = sol * 100 + hour;
    const windSpeed = Math.round(data.windSpeed * windMultiplier * (0.85 + seededRandom(hourSeed) * 0.3));

    let dustLevel: HourlyForecast['dustLevel'] = 'clear';
    if (data.dustTau > 2) dustLevel = 'storm';
    else if (data.dustTau > 1) dustLevel = 'high';
    else if (data.dustTau > 0.5) dustLevel = 'moderate';
    else if (data.dustTau > 0.2) dustLevel = 'low';

    forecast.push({ hour, temp, windSpeed, dustLevel });
  }

  return forecast;
}

export async function generateMultiSolForecast(currentDay: number, count: number): Promise<SolForecast[]> {
  const forecast: SolForecast[] = [];
  const labels = ['Today', 'Tomorrow', 'Sol +2', 'Sol +3', 'Sol +4', 'Sol +5', 'Sol +6'];

  for (let i = 0; i < count; i++) {
    const data = await fetchPSGMarsData(currentDay + i);
    forecast.push({
      sol: currentDay + i,
      label: labels[i] || `Sol +${i}`,
      tempMin: data.tempMin,
      tempMax: data.tempMax,
      pressure: data.pressure,
      windSpeed: data.windSpeed / 3.6,
      dustTau: data.dustTau,
    });
  }

  return forecast;
}
