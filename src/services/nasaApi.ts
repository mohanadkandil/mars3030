// NASA InSight Mars Weather Service API
// Endpoint: https://api.nasa.gov/insight_weather/
// Returns ~7 sols of real Martian weather from InSight lander at Elysium Planitia

export interface NASASolWeather {
  sol: string;
  season: string;
  northernSeason: string;
  southernSeason: string;
  firstUTC: string;
  lastUTC: string;
  temperature: { avg: number; min: number; max: number } | null;
  wind: { avg: number; min: number; max: number; direction: string; degrees: number } | null;
  pressure: { avg: number; min: number; max: number } | null;
}

export interface NASAMarsWeatherResponse {
  sols: NASASolWeather[];
  fetchedAt: string;
  source: string;
}

function parseSolData(sol: string, data: Record<string, unknown>): NASASolWeather {
  const at = data.AT as { av?: number; mn?: number; mx?: number } | undefined;
  const hws = data.HWS as { av?: number; mn?: number; mx?: number } | undefined;
  const pre = data.PRE as { av?: number; mn?: number; mx?: number } | undefined;
  const wd = data.WD as { most_common?: { compass_point?: string; compass_degrees?: number } } | undefined;

  return {
    sol,
    season: (data.Season as string) || 'Unknown',
    northernSeason: (data.Northern_season as string) || '',
    southernSeason: (data.Southern_season as string) || '',
    firstUTC: (data.First_UTC as string) || '',
    lastUTC: (data.Last_UTC as string) || '',
    temperature: at ? {
      avg: Math.round(at.av! * 10) / 10,
      min: Math.round(at.mn! * 10) / 10,
      max: Math.round(at.mx! * 10) / 10,
    } : null,
    wind: hws ? {
      avg: Math.round(hws.av! * 10) / 10,
      min: Math.round(hws.mn! * 10) / 10,
      max: Math.round(hws.mx! * 10) / 10,
      direction: wd?.most_common?.compass_point || 'N/A',
      degrees: wd?.most_common?.compass_degrees || 0,
    } : null,
    pressure: pre ? {
      avg: Math.round(pre.av! * 10) / 10,
      min: Math.round(pre.mn! * 10) / 10,
      max: Math.round(pre.mx! * 10) / 10,
    } : null,
  };
}

let cachedResponse: NASAMarsWeatherResponse | null = null;

export async function fetchNASAMarsWeather(): Promise<NASAMarsWeatherResponse> {
  if (cachedResponse) return cachedResponse;

  try {
    const res = await fetch(
      'https://api.nasa.gov/insight_weather/?api_key=DEMO_KEY&feedtype=json&ver=1.0'
    );
    if (!res.ok) throw new Error(`NASA API: ${res.status}`);

    const json = await res.json();
    const solKeys: string[] = json.sol_keys || [];
    const sols = solKeys.map(sol => parseSolData(sol, json[sol]));

    cachedResponse = {
      sols,
      fetchedAt: new Date().toISOString(),
      source: 'NASA InSight SEIS/APSS — Elysium Planitia, Mars (4.5°N, 135.6°E)',
    };
    return cachedResponse;
  } catch (err) {
    console.warn('NASA API fetch failed, using fallback data:', err);
    return getFallbackData();
  }
}

// Fallback: real data from InSight Sol 675-681 (Oct 2020)
// This ensures the tab always shows real Mars data even offline
function getFallbackData(): NASAMarsWeatherResponse {
  return {
    sols: [
      {
        sol: '675', season: 'fall', northernSeason: 'early winter', southernSeason: 'early summer',
        firstUTC: '2020-10-19T18:32:20Z', lastUTC: '2020-10-20T19:11:55Z',
        temperature: { avg: -62.3, min: -96.9, max: -15.9 },
        wind: { avg: 7.2, min: 1.1, max: 22.5, direction: 'WNW', degrees: 292.5 },
        pressure: { avg: 750.6, min: 722.1, max: 768.8 },
      },
      {
        sol: '676', season: 'fall', northernSeason: 'early winter', southernSeason: 'early summer',
        firstUTC: '2020-10-20T19:11:55Z', lastUTC: '2020-10-21T19:51:31Z',
        temperature: { avg: -62.8, min: -96.9, max: -16.5 },
        wind: { avg: 8.5, min: 1.1, max: 26.9, direction: 'WNW', degrees: 292.5 },
        pressure: { avg: 749.1, min: 722.5, max: 767.1 },
      },
      {
        sol: '677', season: 'fall', northernSeason: 'mid winter', southernSeason: 'mid summer',
        firstUTC: '2020-10-21T19:51:31Z', lastUTC: '2020-10-22T20:31:06Z',
        temperature: { avg: -63.1, min: -97.2, max: -16.9 },
        wind: { avg: 7.9, min: 0.5, max: 23.2, direction: 'WNW', degrees: 292.5 },
        pressure: { avg: 748.7, min: 720.6, max: 767.4 },
      },
      {
        sol: '678', season: 'fall', northernSeason: 'mid winter', southernSeason: 'mid summer',
        firstUTC: '2020-10-22T20:31:06Z', lastUTC: '2020-10-23T21:10:41Z',
        temperature: { avg: -62.6, min: -97.7, max: -9.1 },
        wind: { avg: 5.2, min: 0.2, max: 18.4, direction: 'WNW', degrees: 292.5 },
        pressure: { avg: 743.7, min: 717.7, max: 760.3 },
      },
      {
        sol: '679', season: 'fall', northernSeason: 'mid winter', southernSeason: 'mid summer',
        firstUTC: '2020-10-23T21:10:41Z', lastUTC: '2020-10-24T21:50:16Z',
        temperature: { avg: -62.6, min: -96.6, max: -11.6 },
        wind: { avg: 5.6, min: 0.2, max: 19.4, direction: 'WNW', degrees: 292.5 },
        pressure: { avg: 744.5, min: 719.4, max: 763.3 },
      },
      {
        sol: '680', season: 'fall', northernSeason: 'mid winter', southernSeason: 'mid summer',
        firstUTC: '2020-10-24T21:50:16Z', lastUTC: '2020-10-25T22:29:51Z',
        temperature: { avg: -61.8, min: -96.8, max: -15.3 },
        wind: { avg: 6.5, min: 0.3, max: 24.2, direction: 'WNW', degrees: 292.5 },
        pressure: { avg: 744.0, min: 717.1, max: 764.0 },
      },
      {
        sol: '681', season: 'fall', northernSeason: 'mid winter', southernSeason: 'mid summer',
        firstUTC: '2020-10-25T22:29:51Z', lastUTC: '2020-10-26T23:09:26Z',
        temperature: { avg: -62.4, min: -95.4, max: -4.4 },
        wind: { avg: 5.6, min: 0.2, max: 18.6, direction: 'WNW', degrees: 292.5 },
        pressure: { avg: 743.6, min: 718.5, max: 760.2 },
      },
    ],
    fetchedAt: new Date().toISOString(),
    source: 'NASA InSight SEIS/APSS — Elysium Planitia, Mars (4.5°N, 135.6°E) [cached Sol 675-681]',
  };
}
