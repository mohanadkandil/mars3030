import { useState, useEffect } from "react";
import type { MarsWeather } from "../types";
import {
  fetchPSGMarsData,
  generateHourlyForecast,
  generateMultiSolForecast,
  type PSGMarsData,
  type HourlyForecast,
  type SolForecast,
} from "../services/psgApi";
import MarsWindCanvas from "./MarsWindCanvas";

interface Props {
  weather: MarsWeather;
  solHour: number;
  day: number;
  outsideTemp: number;
  insideTemp: number;
  insideHumidity: number;
}

export default function MarsWeatherMap({ weather, solHour, day }: Props) {
  const [psgData, setPsgData] = useState<PSGMarsData | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [solForecast, setSolForecast] = useState<SolForecast[]>([]);

  useEffect(() => {
    fetchPSGMarsData(day).then((data) => {
      setPsgData(data);
      setHourlyForecast(generateHourlyForecast(data));
    });
    generateMultiSolForecast(day, 4).then(setSolForecast);
  }, [day]);

  const currentHour = Math.floor(solHour);

  if (!psgData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🛰️</div>
          <div className="text-mars-400">
            Connecting to Mars Climate Sounder...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full grid grid-cols-12 grid-rows-[auto_auto_auto_1fr] gap-3 overflow-hidden">
      <div className="col-span-4 glass rounded-xl p-4">
        <TemperaturePanel data={psgData} weather={weather} day={day} />
      </div>
      <div className="col-span-4 glass rounded-xl p-4">
        <WindPressurePanel data={psgData} weather={weather} />
      </div>
      <div className="col-span-4 glass rounded-xl p-4">
        <DustVisibilityPanel data={psgData} />
      </div>

      <div className="col-span-6 glass rounded-xl p-4">
        <SunriseSunsetPanel data={psgData} />
      </div>
      <div className="col-span-6 glass rounded-xl p-4">
        <UVRadiationPanel data={psgData} />
      </div>

      <div className="col-span-12 glass rounded-xl p-3">
        <HourlyForecastStrip
          forecast={hourlyForecast}
          currentHour={currentHour}
        />
      </div>

      <div className="col-span-4 glass rounded-xl p-4 overflow-hidden">
        <MultiSolForecastPanel forecast={solForecast} />
        <div className="mt-2 pt-2 border-t border-mars-800/50 text-[9px] text-mars-600 leading-tight">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full ${psgData.isLive ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></span>
            <span className={psgData.isLive ? 'text-green-400' : 'text-orange-400'}>
              {psgData.isLive ? 'LIVE' : 'MODEL'}
            </span>
          </div>
          📡 {psgData.source}
          <br />
          Sol {psgData.sol} · Ls {psgData.solarLongitude}°
        </div>
      </div>
      <div className="col-span-8 glass rounded-xl p-3 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-xs font-semibold text-mars-300 uppercase tracking-wider">
              Mars Wind Map
            </span>
            <div className="flex gap-3 text-[10px] text-mars-500">
              <label className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Winds
              </label>
              <label className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400"></span> POIs
              </label>
              <label className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>{" "}
                Topo
              </label>
            </div>
          </div>
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-mars-700/40">
            <MarsWindCanvas weather={weather} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TemperaturePanel({
  data,
  weather,
  day,
}: {
  data: PSGMarsData;
  weather: MarsWeather;
  day: number;
}) {
  return (
    <div className="h-full flex gap-4">
      <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-orange-900 to-red-950 flex items-center justify-center">
        <span className="text-4xl">🏜️</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1">
          <span className="text-5xl font-bold text-white">
            {data.temperature}
          </span>
          <span className="text-xl text-mars-400 mt-1">°C</span>
        </div>
        <div className="text-xs text-mars-500 mt-1">
          Surface at {weather.surfaceTempMin}°C and {weather.surfaceTempMax}°C
          at a scaleheight above
        </div>

        <div className="mt-3 space-y-1 text-xs">
          <div className="flex items-center gap-2 text-mars-400">
            <span>☁️</span>
            <span>
              {data.season}, peri at LS:{data.solarLongitude.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-mars-500">
            <span>📅</span>
            <span>
              MY38, Sol {day} (Ls {data.solarLongitude.toFixed(2)})
            </span>
          </div>
          <div className="flex items-center gap-2 text-mars-500">
            <span>📍</span>
            <span>Jezero Crater, Mars · 18.4°N 77.5°E</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WindPressurePanel({
  data,
}: {
  data: PSGMarsData;
  weather: MarsWeather;
}) {
  return (
    <div className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <span>💨</span>
        <span className="text-sm font-semibold text-white">
          Wind and Pressure
        </span>
      </div>

      <div className="flex items-center justify-around">
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 80 80" className="w-full h-full">
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="#374151"
              strokeWidth="1"
            />
            <circle
              cx="40"
              cy="40"
              r="25"
              fill="none"
              stroke="#374151"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
            {["N", "E", "S", "W"].map((d, i) => {
              const angle = ((i * 90 - 90) * Math.PI) / 180;
              const x = 40 + Math.cos(angle) * 32;
              const y = 40 + Math.sin(angle) * 32;
              return (
                <text
                  key={d}
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize="8"
                >
                  {d}
                </text>
              );
            })}
            <g transform={`rotate(${data.windDirection}, 40, 40)`}>
              <line
                x1="40"
                y1="40"
                x2="40"
                y2="18"
                stroke="#f97316"
                strokeWidth="2"
              />
              <polygon points="40,12 36,20 44,20" fill="#f97316" />
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white">
              {data.windSpeed}
            </span>
            <span className="text-[8px] text-mars-500">km/h</span>
          </div>
        </div>

        <div className="text-center">
          <div className="relative w-16 h-8 bg-mars-800 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
              style={{ width: `${Math.min(100, (data.pressure / 10) * 100)}%` }}
            />
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold text-white">
              {data.pressure.toFixed(3)}
            </span>
            <span className="text-xs text-mars-500 ml-1">mbar</span>
          </div>
          <div className="flex justify-between text-[8px] text-mars-600 mt-0.5">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-mars-500 text-center mt-2">
        {data.windSpeed < 10
          ? "Light"
          : data.windSpeed < 20
            ? "Moderate"
            : "Strong"}{" "}
        wind conditions at this location
      </div>
    </div>
  );
}

function DustVisibilityPanel({ data }: { data: PSGMarsData }) {
  const visibilityRisk =
    data.visibility < 5
      ? "Risky low"
      : data.visibility < 10
        ? "Moderate"
        : "Good";

  return (
    <div className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <span>🌫️</span>
        <span className="text-sm font-semibold text-white">
          Dust and Visibility
        </span>
      </div>

      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-white">
              {data.visibility.toFixed(1)}
            </span>
            <span className="text-sm text-mars-400 mb-1">km</span>
          </div>
          <div className="text-xs text-mars-400 flex items-center gap-1">
            {visibilityRisk} visibility {data.visibility < 5 && "⚠️"}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <div className="flex items-center gap-2 text-[10px] text-mars-400 mb-1">
              <span>☀️ Dust</span>
              <span className="ml-auto">{data.dustTau.toFixed(3)}</span>
            </div>
            <div className="h-2 bg-mars-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
                style={{ width: `${Math.min(100, data.dustTau * 30)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-[10px] text-mars-400 mb-1">
              <span>❄️ Ice</span>
              <span className="ml-auto">{data.iceTau.toFixed(3)}</span>
            </div>
            <div className="h-2 bg-mars-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${Math.min(100, data.iceTau * 500)}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] text-mars-500 mt-1">
            {data.waterVapor.toFixed(1)} pr-um of water vapor above
          </div>
        </div>
      </div>
    </div>
  );
}

function SunriseSunsetPanel({ data }: { data: PSGMarsData }) {
  return (
    <div className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <span>☀️</span>
        <span className="text-sm font-semibold text-white">
          Sunrise and Sunset
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-white">{data.sunrise}</div>
          <div className="text-xs text-mars-500 mt-1">Sunrise</div>
        </div>

        <div className="flex-1 relative h-16">
          <svg viewBox="0 0 200 60" className="w-full h-full">
            <path
              d="M 10 55 Q 100 -20 190 55"
              fill="none"
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <circle cx="100" cy="20" r="12" fill="#fbbf24" />
            <line
              x1="0"
              y1="55"
              x2="200"
              y2="55"
              stroke="#374151"
              strokeWidth="1"
            />
            <text x="20" y="52" fill="#6b7280" fontSize="8">
              {data.sunrise}
            </text>
            <text x="170" y="52" fill="#6b7280" fontSize="8">
              {data.sunset}
            </text>
          </svg>
        </div>

        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-red-900 flex items-center justify-center">
          <span className="text-mars-300">📍</span>
        </div>
      </div>

      <div className="text-[10px] text-mars-500 mt-2">
        Times in Local Mean Solar Time (LMST). Day length: ~24h 37m.
      </div>
    </div>
  );
}

function UVRadiationPanel({ data }: { data: PSGMarsData }) {
  const uvRisk =
    data.uvIndex < 3
      ? "Low"
      : data.uvIndex < 6
        ? "Moderate"
        : data.uvIndex < 8
          ? "High"
          : "Very High";
  const uvColor =
    data.uvIndex < 3
      ? "#22c55e"
      : data.uvIndex < 6
        ? "#eab308"
        : data.uvIndex < 8
          ? "#f97316"
          : "#ef4444";

  return (
    <div className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <span>☢️</span>
        <span className="text-sm font-semibold text-white">
          UV Radiation Levels
        </span>
      </div>

      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold" style={{ color: uvColor }}>
              {data.uvIndex.toFixed(0)}
            </span>
            <span className="text-sm text-mars-400 mb-1">{uvRisk} risk</span>
          </div>

          <div className="mt-2 h-2 w-40 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500 relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-white rounded-sm shadow"
              style={{ left: `${Math.min(95, (data.uvIndex / 12) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex-1 text-[10px] text-mars-500">
          The local UV radiation field is being affected by the aerosols column
          (τ {data.dustTau.toFixed(3)}), the local pressure, the atmospheric
          composition, and the heliocentric distance.
        </div>
      </div>
    </div>
  );
}

function HourlyForecastStrip({
  forecast,
  currentHour,
}: {
  forecast: HourlyForecast[];
  currentHour: number;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      <div className="shrink-0 w-12 text-center">
        <div className="text-xs font-semibold text-orange-400">Now</div>
        <div className="text-lg">🌤️</div>
        <div className="text-xs font-medium text-white">
          {forecast[currentHour]?.temp ?? "--"}°C
        </div>
      </div>

      {forecast
        .slice(currentHour + 1)
        .concat(forecast.slice(0, currentHour + 1))
        .slice(0, 23)
        .map((h, i) => {
          const hour = (currentHour + 1 + i) % 24;
          const isNight = hour < 6 || hour >= 18;
          return (
            <div key={i} className="shrink-0 w-12 text-center">
              <div className="text-[10px] text-mars-500">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="text-sm">
                {isNight
                  ? "🌙"
                  : h.dustLevel === "storm"
                    ? "🌪️"
                    : h.dustLevel === "high"
                      ? "🌫️"
                      : "☀️"}
              </div>
              <div
                className={`text-[10px] font-medium ${h.temp > -40 ? "text-red-400" : h.temp < -80 ? "text-blue-400" : "text-white"}`}
              >
                {h.temp}°C
              </div>
            </div>
          );
        })}
    </div>
  );
}

function MultiSolForecastPanel({ forecast }: { forecast: SolForecast[] }) {
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 text-xs font-semibold text-mars-300 uppercase tracking-wider mb-3">
        Multi-Sol Forecast
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {forecast.map((sol) => (
          <div
            key={sol.sol}
            className="flex items-center gap-3 p-2 rounded-lg bg-mars-900/40"
          >
            <div className="w-16 shrink-0">
              <div className="text-sm font-semibold text-white">
                {sol.label}
              </div>
            </div>

            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-800 to-orange-950 flex items-center justify-center shrink-0">
              <span className="text-xl">
                {sol.dustTau > 1.5 ? "🌪️" : sol.dustTau > 0.8 ? "🌫️" : "☀️"}
              </span>
            </div>

            <div className="flex-1 min-w-0 text-[10px] text-mars-500 space-y-0.5">
              <div className="flex items-center gap-1">
                <span>⏱️</span> &lt; {sol.pressure.toFixed(2)} mbar
              </div>
              <div className="flex items-center gap-1">
                <span>💨</span> &lt; {(sol.windSpeed * 3.6).toFixed(0)} km/h
              </div>
              <div className="flex items-center gap-1">
                <span>🌫️</span> &lt; {sol.dustTau.toFixed(3)} tau
              </div>
            </div>

            <div className="w-20 shrink-0">
              <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500 relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-blue-400 rounded-sm"
                  style={{
                    left: `${Math.max(0, Math.min(100, ((sol.tempMin + 100) / 120) * 100))}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-red-400 rounded-sm"
                  style={{
                    left: `${Math.max(0, Math.min(100, ((sol.tempMax + 100) / 120) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] mt-0.5">
                <span className="text-blue-400">{sol.tempMin}°</span>
                <span className="text-red-400">{sol.tempMax}°</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
