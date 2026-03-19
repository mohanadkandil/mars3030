export interface CropType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: 'leafy' | 'root' | 'legume' | 'fruit' | 'grain' | 'herb';
  
  // Growing requirements
  growthDays: number;
  waterPerDay: number;      // liters per m²
  energyPerDay: number;     // kWh per m²
  spacePerPlant: number;    // m² needed per individual plant
  optimalTemp: [number, number];  // min, max °C
  optimalHumidity: [number, number]; // min, max %
  lightHoursPerDay: number; // ideal photoperiod (hours)
  co2Tolerance: 'low' | 'medium' | 'high'; // tolerance for elevated CO₂
  
  // Yield
  yieldPerM2: number;       // kg per m² per harvest
  
  // Nutrition per kg edible portion
  caloriesPerKg: number;
  proteinPerKg: number;     // grams
  vitaminCPerKg: number;    // mg
  fiberPerKg: number;       // grams
  ironPerKg: number;        // mg
  calciumPerKg: number;     // mg
  
  // Nutri-Score (A–E, A being best)
  nutriScore: 'A' | 'B' | 'C' | 'D' | 'E';
  
  // Mars suitability
  marsSuitability: number;  // 1-10 score
  marsNotes: string;        // brief note on Mars viability
  difficulty: 'easy' | 'moderate' | 'hard';
  
  // Flags
  canGrowHydroponic: boolean;
  canGrowAeroponic: boolean;
  edibleParts: string;      // e.g. "leaves", "tuber", "seeds, pods"
}

export interface MarsWeather {
  surfaceTemp: number;        // °C (current)
  surfaceTempMin: number;     // °C (sol min)
  surfaceTempMax: number;     // °C (sol max)
  pressure: number;           // Pa (typical ~600-700 Pa)
  windSpeed: number;          // m/s
  windDirection: number;      // degrees (0-360)
  windGusts: number;          // m/s
  dustOpacity: number;        // tau (0 = clear, >3 = global storm)
  uvIndex: number;            // relative (0-15+ on Mars)
  solarIrradiance: number;    // W/m²
  season: string;             // e.g., 'Northern Spring'
  solarLongitude: number;     // Ls (0-360°, determines season)
  humidity: number;           // % (very low on Mars, 0-100 scale for display)
}

export interface CropZone {
  id: string;
  cropId: string;
  plantedDay: number;
  area: number;  // m²
  health: number; // 0-100
  growthProgress: number; // 0-1
  waterStress: number; // 0-1 (0 = no stress)
  harvested: boolean;
}

export interface SimulationState {
  day: number;
  solHour: number;
  running: boolean;
  wasRunningBeforePause: boolean;
  speed: number;
  missionDays: number;  // configurable mission length
  initialFoodDays: number; // sols of pre-packed food supply
  greenhouseArea: number;  // m² total greenhouse area
  
  // Environment
  insideTemp: number;
  insideHumidity: number;
  outsideTemp: number;
  co2Level: number;
  lightIntensity: number;

  // Mars weather
  marsWeather: MarsWeather;
  
  // Resources
  waterReservoir: number;    // liters remaining
  waterCapacity: number;
  waterRecycleRate: number;  // liters/day recovered
  energyStored: number;      // kWh remaining  
  energyCapacity: number;
  solarOutput: number;       // kWh/day current
  nutrientReservoir: number; // kg remaining
  nutrientCapacity: number;
  
  // Crops
  zones: CropZone[];
  totalHarvested: number; // kg total
  
  // Nutrition tracking (daily output)
  dailyCalories: number;
  dailyProtein: number;
  dailyVitaminC: number;
  
  // Cumulative
  totalCalories: number;
  totalProtein: number;

  // Crew
  crew: Astronaut[];
  crewNutrientTarget: NutrientTarget;  // computed from crew params

  // Production tracking
  productionLog: ProductionSnapshot[];

  // Food stores & consumption
  foodStores: Record<string, FoodStoreEntry>;
  consumptionLog: ConsumptionEntry[];
  prePackedCaloriesRemaining: number;  // kcal remaining from pre-packed supply

  // Crew actions awaiting manual confirmation
  pendingActions: PendingCrewAction[];

  // Active events
  activeEvents: SimEvent[];
  
  // Agent log
  agentLog: AgentLogEntry[];
  
  // History for charts
  history: DaySnapshot[];
}

export interface DaySnapshot {
  day: number;
  calories: number;
  protein: number;
  water: number;
  energy: number;
  avgHealth: number;
}

export interface SimEvent {
  id: string;
  type: 'dust_storm' | 'pump_failure' | 'temperature_spike' | 'crop_disease' | 'power_outage';
  name: string;
  description: string;
  severity: number; // 1-3
  startDay: number;
  duration: number;
  active: boolean;
}

export interface AgentLogEntry {
  id: string;
  day: number;
  type: 'info' | 'warning' | 'action' | 'critical';
  message: string;
  reasoning?: string;
}

export interface NutrientTarget {
  dailyCalories: number;
  dailyProtein: number;   // grams
  dailyVitaminC: number;  // mg
  dailyFiber: number;     // grams
  dailyIron: number;      // mg
  dailyCalcium: number;   // mg
}

export type Gender = 'male' | 'female';
export type ActivityLevel = 'low' | 'moderate' | 'high';

export interface Astronaut {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  dietaryRestrictions: string[];  // e.g., 'vegetarian', 'low-sodium', 'gluten-free'
}

// Production tracking snapshot
export interface ProductionSnapshot {
  day: number;
  cropId: string;
  yieldKg: number;
  calories: number;
  protein: number;
  vitaminC: number;
}

// Food store entry — kg of each crop in storage
export interface FoodStoreEntry {
  cropId: string;
  kgStored: number;
  totalHarvestedKg: number;  // lifetime total harvested of this crop
  totalConsumedKg: number;   // lifetime total consumed of this crop
  harvestCount: number;      // how many times harvested
}

// Consumption log — what crew ate each day
export interface ConsumptionEntry {
  day: number;
  items: { cropId: string; kgConsumed: number; calories: number; protein: number }[];
  totalCalories: number;
  totalProtein: number;
  fromPrePacked: number;  // kcal from pre-packed food
}

// Mission configuration — pre-launch setup
export interface MissionConfig {
  missionDays: number;            // total mission length
  greenhouseArea: number;         // m² total
  initialFoodDays: number;        // days of pre-packed food supply
  waterReservoir: number;         // liters
  waterCapacity: number;          // liters
  energyStored: number;           // kWh
  energyCapacity: number;         // kWh
  nutrientReservoir: number;      // kg
  nutrientCapacity: number;       // kg
  selectedSeeds: SeedAllocation[];
}

export interface SeedAllocation {
  cropId: string;
  area: number;  // m² allocated
}

// Crew action that requires manual confirmation
export interface PendingCrewAction {
  id: string;
  day: number;
  type: 'harvest' | 'replant';
  zoneId: string;
  cropId: string;           // current crop (for harvest) or new crop (for replant)
  description: string;
  reasoning: string;
  newCropId?: string;       // only for replant — what the agent recommends
}
