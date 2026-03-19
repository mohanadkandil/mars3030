import { useState, useEffect, useCallback, useRef } from "react";
import { SimulationState, SimEvent, Astronaut, MissionConfig } from "./types";
import {
  createInitialState,
  simulateDay,
  injectEvent,
  confirmAction,
  dismissAction,
  confirmAllActions,
} from "./simulation/engine";
import { calculateCrewNeeds } from "./data/crew";
import Header from "./components/Header";
import GreenhouseView from "./components/GreenhouseView";
import GreenhouseGrid from "./components/GreenhouseGrid";
import CameraFeed from "./components/CameraFeed";
import ResourcePanel from "./components/ResourcePanel";
import NutritionPanel from "./components/NutritionPanel";
import AgentLog from "./components/AgentLog";
import ScenarioPanel from "./components/ScenarioPanel";
import HistoryCharts from "./components/HistoryCharts";
import ChatInterface from "./components/ChatInterface";
import CrewConfig from "./components/CrewConfig";
import CrewActionAlert from "./components/CrewActionAlert";
import MarsWeatherMap from "./components/MarsWeatherMap";
import MissionSetup from "./components/MissionSetup";
import SeedLibrary from "./components/SeedLibrary";
import HarvestOrganizer from "./components/HarvestOrganizer";

type TabId =
  | "dashboard"
  | "greenhouse"
  | "analytics"
  | "control"
  | "assistant"
  | "crew"
  | "weather"
  | "harvest"
  | "seeds";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "greenhouse", label: "Greenhouse", icon: "🌱" },
  { id: "harvest", label: "Food & Harvest", icon: "🌾" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "control", label: "Mission Control", icon: "🎛️" },
  { id: "crew", label: "Crew", icon: "👨‍🚀" },
  { id: "weather", label: "Mars Weather", icon: "🌪️" },
  { id: "seeds", label: "Seed Library", icon: "🌱" },
  { id: "assistant", label: "CERES", icon: "🌱" },
];

export default function App() {
  const [state, setState] = useState<SimulationState>(createInitialState);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [setupComplete, setSetupComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.day >= prev.missionDays) {
        return { ...prev, running: false };
      }
      return simulateDay(prev);
    });
  }, []);

  useEffect(() => {
    if (state.running) {
      const ms = Math.max(50, 600 / state.speed);
      intervalRef.current = setInterval(tick, ms);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.running, state.speed, tick]);

  const toggleRunning = () => {
    setState((prev) => ({ ...prev, running: !prev.running }));
  };

  const setSpeed = (speed: number) => {
    setState((prev) => ({ ...prev, speed }));
  };

  const handleInjectEvent = (
    type: string,
    name: string,
    description: string,
    severity: number,
    duration: number,
  ) => {
    setState((prev) =>
      injectEvent(
        prev,
        type as SimEvent["type"],
        name,
        description,
        severity,
        duration,
      ),
    );
  };

  const handleUpdateCrew = (newCrew: Astronaut[]) => {
    setState((prev) => ({
      ...prev,
      crew: newCrew,
      crewNutrientTarget: calculateCrewNeeds(newCrew),
    }));
  };

  const handleConfirmAction = (actionId: string) => {
    setState((prev) => confirmAction(prev, actionId));
  };

  const handleDismissAction = (actionId: string) => {
    setState((prev) => dismissAction(prev, actionId));
  };

  const handleConfirmAll = () => {
    setState((prev) => confirmAllActions(prev));
  };

  const handleLaunchMission = (config: MissionConfig) => {
    // Rebuild state from config + current crew
    const newState = createInitialState(config);
    newState.crew = structuredClone(state.crew);
    newState.crewNutrientTarget = calculateCrewNeeds(state.crew);
    newState.running = true;
    // Update the initial log to reflect actual crew
    newState.agentLog[0].reasoning = `Crew nutritional analysis complete: ${state.crew.length} astronauts, target ${Math.round(newState.crewNutrientTarget.dailyCalories)} kcal/day, ${Math.round(newState.crewNutrientTarget.dailyProtein)}g protein/day.`;
    const zoneDesc = newState.zones
      .map((z) => {
        const crop = config.selectedSeeds.find((s) => s.cropId === z.cropId);
        return crop ? `${z.cropId} (${crop.area}m²)` : z.cropId;
      })
      .join(", ");
    newState.agentLog[1].message = `Planted initial crop layout: ${zoneDesc}.`;
    setState(newState);
    setSetupComplete(true);
  };

  // ─── Setup Screen: Mission Configuration ───
  if (!setupComplete) {
    return (
      <div className="mars-bg h-screen w-screen flex flex-col overflow-hidden">
        {/* Background stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 2 + 1,
                height: Math.random() * 2 + 1,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.2,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="relative z-10 text-center pt-6 pb-2">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            🚀 Mission Setup
          </h1>
          <p className="text-lg text-white/60 mt-1">
            Configure crew, resources, and seeds before launching your
            greenhouse mission
          </p>
        </div>

        {/* Mission Setup Wizard */}
        <div className="relative z-10 flex-1 min-h-0">
          <MissionSetup
            crew={state.crew}
            crewTarget={state.crewNutrientTarget}
            onUpdateCrew={handleUpdateCrew}
            onLaunch={handleLaunchMission}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mars-bg h-screen w-screen flex flex-col p-3 gap-3 overflow-hidden">
      {/* Crew Action Alert — modal overlay */}
      <CrewActionAlert
        actions={state.pendingActions}
        onConfirm={handleConfirmAction}
        onDismiss={handleDismissAction}
        onConfirmAll={handleConfirmAll}
      />

      {/* Header */}
      <Header
        day={state.day}
        solHour={state.solHour}
        running={state.running}
        speed={state.speed}
        onToggle={toggleRunning}
        onSpeedChange={setSpeed}
        activeEventCount={state.activeEvents.length}
      />

      {/* Tab Navigation */}
      <nav className="flex gap-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-t-lg text-sm font-medium transition-all duration-200
              ${
                activeTab === tab.id
                  ? "glass text-white border-b-2 border-orange-400 shadow-lg shadow-orange-500/10"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }
            `}
          >
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {/* Dashboard — Overview with key metrics + compact greenhouse */}
        {activeTab === "dashboard" && (
          <div className="h-full grid grid-cols-12 gap-3">
            <div className="col-span-7 flex flex-col gap-3 min-h-0">
              <div className="flex-1 min-h-0">
                <GreenhouseGrid
                  zones={state.zones}
                  activeEvents={state.activeEvents}
                  solHour={state.solHour}
                  greenhouseArea={state.greenhouseArea}
                />
              </div>
            </div>
            <div className="col-span-5 flex flex-col gap-3 min-h-0">
              <div className="flex-1 min-h-0">
                <ResourcePanel
                  water={state.waterReservoir}
                  waterCapacity={state.waterCapacity}
                  energy={state.energyStored}
                  energyCapacity={state.energyCapacity}
                  nutrients={state.nutrientReservoir}
                  nutrientCapacity={state.nutrientCapacity}
                  solarOutput={state.solarOutput}
                  recycleRate={state.waterRecycleRate}
                  insideTemp={state.insideTemp}
                  insideHumidity={state.insideHumidity}
                  co2Level={state.co2Level}
                  lightIntensity={state.lightIntensity}
                />
              </div>
              <div className="flex-1 min-h-0">
                <NutritionPanel
                  dailyCalories={state.dailyCalories}
                  dailyProtein={state.dailyProtein}
                  dailyVitaminC={state.dailyVitaminC}
                  totalHarvested={state.totalHarvested}
                  day={state.day}
                  crewTarget={state.crewNutrientTarget}
                />
              </div>
            </div>
          </div>
        )}

        {/* Greenhouse — Full digital twin + camera feed + grid */}
        {activeTab === "greenhouse" && (
          <div className="h-full grid grid-cols-12 gap-3">
            <div className="col-span-4 min-h-0">
              <GreenhouseView
                zones={state.zones}
                activeEvents={state.activeEvents}
                day={state.day}
              />
            </div>
            <div className="col-span-4 min-h-0">
              <GreenhouseGrid
                zones={state.zones}
                activeEvents={state.activeEvents}
                solHour={state.solHour}
                greenhouseArea={state.greenhouseArea}
              />
            </div>
            <div className="col-span-4 min-h-0">
              <CameraFeed
                zones={state.zones}
                activeEvents={state.activeEvents}
                day={state.day}
              />
            </div>
          </div>
        )}

        {/* Analytics — Charts + nutrition deep-dive */}
        {activeTab === "analytics" && (
          <div className="h-full grid grid-cols-12 gap-3">
            <div className="col-span-9 min-h-0">
              <HistoryCharts history={state.history} />
            </div>
            <div className="col-span-3 min-h-0">
              <NutritionPanel
                dailyCalories={state.dailyCalories}
                dailyProtein={state.dailyProtein}
                dailyVitaminC={state.dailyVitaminC}
                totalHarvested={state.totalHarvested}
                day={state.day}
                crewTarget={state.crewNutrientTarget}
              />
            </div>
          </div>
        )}

        {/* Mission Control — Agent log + scenario injection */}
        {activeTab === "control" && (
          <div className="h-full grid grid-cols-12 gap-3">
            <div className="col-span-7 min-h-0">
              <AgentLog log={state.agentLog} />
            </div>
            <div className="col-span-5 min-h-0">
              <ScenarioPanel
                onInject={handleInjectEvent}
                activeEventTypes={state.activeEvents
                  .filter((e) => e.active)
                  .map((e) => e.type)}
                disabled={!state.running && state.day <= 1}
              />
            </div>
          </div>
        )}

        {/* Crew — Astronaut profiles + nutritional needs */}
        {activeTab === "crew" && (
          <div className="h-full grid grid-cols-12 gap-3">
            <div className="col-span-7 min-h-0">
              <CrewConfig
                crew={state.crew}
                crewTarget={state.crewNutrientTarget}
                onUpdateCrew={handleUpdateCrew}
              />
            </div>
            <div className="col-span-5 min-h-0">
              <NutritionPanel
                dailyCalories={state.dailyCalories}
                dailyProtein={state.dailyProtein}
                dailyVitaminC={state.dailyVitaminC}
                totalHarvested={state.totalHarvested}
                day={state.day}
                crewTarget={state.crewNutrientTarget}
              />
            </div>
          </div>
        )}

        {/* Mars Weather — Surface conditions + wind map + crop impact */}
        {activeTab === "weather" && (
          <MarsWeatherMap
            weather={state.marsWeather}
            solHour={state.solHour}
            day={state.day}
            outsideTemp={state.outsideTemp}
            insideTemp={state.insideTemp}
            insideHumidity={state.insideHumidity}
          />
        )}

        {/* Seed Library — Complete crop catalog with nutrition & Mars suitability */}
        {activeTab === "seeds" && <SeedLibrary />}

        {/* Harvest & Food Organizer — Food stores, harvest log, consumption tracking */}
        {activeTab === "harvest" && (
          <div className="h-full grid grid-cols-12 gap-3">
            <div className="col-span-8 min-h-0">
              <HarvestOrganizer
                foodStores={state.foodStores}
                consumptionLog={state.consumptionLog}
                productionLog={state.productionLog}
                prePackedCaloriesRemaining={state.prePackedCaloriesRemaining}
                totalHarvested={state.totalHarvested}
                crewTarget={state.crewNutrientTarget}
                day={state.day}
                initialFoodDays={state.initialFoodDays}
                crewSize={state.crew.length}
              />
            </div>
            <div className="col-span-4 flex flex-col gap-3 min-h-0">
              <div className="flex-1 min-h-0">
                <NutritionPanel
                  dailyCalories={state.dailyCalories}
                  dailyProtein={state.dailyProtein}
                  dailyVitaminC={state.dailyVitaminC}
                  totalHarvested={state.totalHarvested}
                  day={state.day}
                  crewTarget={state.crewNutrientTarget}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "assistant" && (
          <div className="h-full grid grid-cols-12 gap-3">
            <div className="col-span-8 min-h-0">
              <ChatInterface />
            </div>
            <div className="col-span-4 flex flex-col gap-3 min-h-0">
              <div className="flex-1 min-h-0">
                <AgentLog log={state.agentLog} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Persistent stop/resume button — always accessible, even over modals */}
      <button
        onClick={toggleRunning}
        className={`fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 ${
          state.running
            ? "bg-alert-500 hover:bg-alert-400 text-white shadow-alert-500/40"
            : "bg-bio-500 hover:bg-bio-400 text-white shadow-bio-500/40"
        }`}
        title={state.running ? "Pause Simulation" : "Resume Simulation"}
      >
        {state.running ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect x="4" y="3" width="4" height="14" rx="1" />
            <rect x="12" y="3" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <polygon points="5,3 17,10 5,17" />
          </svg>
        )}
      </button>
    </div>
  );
}
