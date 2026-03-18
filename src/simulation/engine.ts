import { SimulationState, CropZone, AgentLogEntry, DaySnapshot, SimEvent, ProductionSnapshot, PendingCrewAction, MarsWeather } from '../types';
import { CROPS, GREENHOUSE_AREA } from '../data/crops';
import { DEFAULT_CREW, calculateCrewNeeds } from '../data/crew';

let logIdCounter = 0;
const nextLogId = () => `log-${++logIdCounter}`;
let eventIdCounter = 0;
const nextEventId = () => `evt-${++eventIdCounter}`;

function getCrop(id: string) {
  return CROPS.find(c => c.id === id)!;
}

// Mars weather simulation based on real Martian atmospheric data
function generateMarsWeather(day: number, solHour: number, hasStorm: boolean): MarsWeather {
  // Solar longitude (Ls) — approximate progression over 450 sols (~669 sol Martian year)
  const Ls = (day / 669) * 360 % 360;

  // Season determination
  let season: string;
  if (Ls < 90) season = 'Northern Spring';
  else if (Ls < 180) season = 'Northern Summer';
  else if (Ls < 270) season = 'Northern Autumn';
  else season = 'Northern Winter';

  // Base temperature varies by season and time of day (Gale Crater reference data)
  const seasonalOffset = -10 * Math.cos((Ls / 180) * Math.PI); // warmer near Ls=270 (perihelion)
  const diurnalFactor = Math.sin(((solHour - 6) / 12) * Math.PI); // peaks at noon
  const isDaytime = solHour >= 6 && solHour < 18;

  const baseTempMax = -10 + seasonalOffset + (Math.random() - 0.5) * 5;
  const baseTempMin = -80 + seasonalOffset + (Math.random() - 0.5) * 8;
  const surfaceTemp = isDaytime
    ? baseTempMin + (baseTempMax - baseTempMin) * Math.max(0, diurnalFactor)
    : baseTempMin + (Math.random() - 0.5) * 5;

  // Pressure (seasonal CO2 cycle — ranges ~600-900 Pa)
  const pressure = 650 + 80 * Math.sin((Ls / 180) * Math.PI) + (Math.random() - 0.5) * 30;

  // Wind — generally 2-15 m/s, gusts up to 30+
  const baseWind = 5 + Math.sin(day * 0.3) * 4 + (Math.random() - 0.5) * 3;
  const windSpeed = hasStorm ? baseWind * 3 + Math.random() * 15 : Math.max(0.5, baseWind);
  const windGusts = windSpeed * (1.5 + Math.random() * 0.8);
  const windDirection = (day * 7 + solHour * 15 + Math.random() * 30) % 360;

  // Dust opacity (tau): 0.3-0.8 normal, >2 during storms
  const baseTau = 0.4 + 0.3 * Math.sin((Ls - 180) / 180 * Math.PI); // dustier near Ls 200-300
  const dustOpacity = hasStorm ? baseTau + 2 + Math.random() * 2 : baseTau + (Math.random() - 0.5) * 0.2;

  // UV (no ozone layer — very high, reduced by dust)
  const solarAngle = isDaytime ? Math.sin(((solHour - 6) / 12) * Math.PI) : 0;
  const uvIndex = Math.max(0, solarAngle * 14 * (1 - dustOpacity * 0.3));

  // Solar irradiance (~590 W/m² at Mars distance, reduced by dust and angle)
  const solarIrradiance = Math.max(0, 590 * solarAngle * Math.exp(-dustOpacity * 0.5));

  // Humidity (Mars: extremely dry, ~0.03% water vapor)
  const humidity = 0.01 + Math.random() * 0.04 + (isDaytime ? 0 : 0.02);

  return {
    surfaceTemp: Math.round(surfaceTemp * 10) / 10,
    surfaceTempMin: Math.round(baseTempMin),
    surfaceTempMax: Math.round(baseTempMax),
    pressure: Math.round(pressure),
    windSpeed: Math.round(windSpeed * 10) / 10,
    windDirection: Math.round(windDirection),
    windGusts: Math.round(windGusts * 10) / 10,
    dustOpacity: Math.round(dustOpacity * 100) / 100,
    uvIndex: Math.round(uvIndex * 10) / 10,
    solarIrradiance: Math.round(solarIrradiance),
    season,
    solarLongitude: Math.round(Ls * 10) / 10,
    humidity: Math.round(humidity * 1000) / 1000,
  };
}

export function createInitialState(): SimulationState {
  const crew = structuredClone(DEFAULT_CREW);
  const crewNutrientTarget = calculateCrewNeeds(crew);

  // Start with a pre-planned crop layout
  const zones: CropZone[] = [
    { id: 'z1', cropId: 'lettuce', plantedDay: 0, area: 25, health: 95, growthProgress: 0, waterStress: 0, harvested: false },
    { id: 'z2', cropId: 'potato',  plantedDay: 0, area: 30, health: 92, growthProgress: 0, waterStress: 0, harvested: false },
    { id: 'z3', cropId: 'beans',   plantedDay: 0, area: 25, health: 97, growthProgress: 0, waterStress: 0, harvested: false },
    { id: 'z4', cropId: 'radish',  plantedDay: 0, area: 20, health: 93, growthProgress: 0, waterStress: 0, harvested: false },
    { id: 'z5', cropId: 'herbs',   plantedDay: 0, area: 20, health: 96, growthProgress: 0, waterStress: 0, harvested: false },
  ];

  return {
    day: 1,
    solHour: 6,
    running: false,
    speed: 1,
    insideTemp: 21,
    insideHumidity: 58,
    outsideTemp: -63,
    co2Level: 800,
    lightIntensity: 85,
    marsWeather: generateMarsWeather(1, 6, false),
    waterReservoir: 8000,
    waterCapacity: 10000,
    waterRecycleRate: 35,
    energyStored: 500,
    energyCapacity: 800,
    solarOutput: 120,
    nutrientReservoir: 2000,
    nutrientCapacity: 2500,
    zones,
    totalHarvested: 0,
    dailyCalories: 0,
    dailyProtein: 0,
    dailyVitaminC: 0,
    totalCalories: 0,
    totalProtein: 0,
    crew,
    crewNutrientTarget,
    productionLog: [],
    pendingActions: [],
    activeEvents: [],
    agentLog: [
      {
        id: nextLogId(),
        day: 1,
        type: 'info',
        message: 'AresFarm AI Agent initialized. Beginning 450-day greenhouse management protocol.',
        reasoning: `Crew nutritional analysis complete: ${crew.length} astronauts, target ${Math.round(crewNutrientTarget.dailyCalories)} kcal/day, ${Math.round(crewNutrientTarget.dailyProtein)}g protein/day based on individual BMR, activity levels, and body composition.`,
      },
      {
        id: nextLogId(),
        day: 1,
        type: 'action',
        message: 'Planted initial crop layout: Lettuce (25m²), Potato (30m²), Beans (25m²), Radish (20m²), Herbs (20m²).',
        reasoning: `Crop mix optimized for crew profile. High-activity crew members (${crew.filter(a => a.activityLevel === 'high').map(a => a.name).join(', ')}) drive caloric needs. Potato+beans provide ${Math.round(30 * 4.5 * 770 / 90 + 25 * 1.8 * 3470 / 60)} kcal/day estimated.`,
      },
    ],
    history: [],
  };
}

export function simulateDay(state: SimulationState): SimulationState {
  const next = structuredClone(state);
  next.day += 1;
  
  // Mars sol hour cycle (~24.6 hr sol, we cycle solHour 0-24)
  // Each "day" tick advances ~6 sol hours for visible day/night transitions
  next.solHour = (state.solHour + 6) % 24;
  const isDaytime = next.solHour >= 6 && next.solHour < 18;

  // Update outside temp with some variation
  next.outsideTemp = -63 + Math.sin(next.day * 0.1) * 8 + (Math.random() - 0.5) * 4;

  // Process active events
  const hasStorm = next.activeEvents.some(e => e.type === 'dust_storm' && e.active);

  // Update Mars weather
  next.marsWeather = generateMarsWeather(next.day, next.solHour, hasStorm);
  next.outsideTemp = next.marsWeather.surfaceTemp; // sync with weather model

  const hasPumpFailure = next.activeEvents.some(e => e.type === 'pump_failure' && e.active);
  const hasTempSpike = next.activeEvents.some(e => e.type === 'temperature_spike' && e.active);
  const hasDisease = next.activeEvents.some(e => e.type === 'crop_disease' && e.active);
  const hasPowerOutage = next.activeEvents.some(e => e.type === 'power_outage' && e.active);

  // Solar output affected by dust storms
  let effectiveSolar = 120;
  if (hasStorm) effectiveSolar *= 0.3;
  if (hasPowerOutage) effectiveSolar *= 0.2;
  next.solarOutput = effectiveSolar;

  // Energy balance
  const dailyEnergyUse = next.zones.reduce((sum, z) => sum + getCrop(z.cropId).energyPerDay * z.area, 0);
  next.energyStored = Math.min(next.energyCapacity, next.energyStored + effectiveSolar - dailyEnergyUse);
  if (next.energyStored < 0) next.energyStored = 0;

  // Water balance
  let waterMultiplier = 1;
  if (hasPumpFailure) waterMultiplier = 0.5;
  const dailyWaterUse = next.zones.filter(z => !z.harvested).reduce((sum, z) => sum + getCrop(z.cropId).waterPerDay * z.area, 0);
  const actualWaterDelivered = dailyWaterUse * waterMultiplier;
  next.waterReservoir = Math.min(next.waterCapacity, next.waterReservoir - actualWaterDelivered + next.waterRecycleRate);
  if (next.waterReservoir < 0) next.waterReservoir = 0;

  // Temperature management
  if (hasTempSpike) {
    next.insideTemp = Math.min(38, next.insideTemp + 1.5);
  } else {
    // Gradually return to optimal
    next.insideTemp = next.insideTemp + (21 - next.insideTemp) * 0.3 + (Math.random() - 0.5) * 0.5;
  }
  next.insideHumidity = 58 + (Math.random() - 0.5) * 6;
  if (hasPumpFailure) next.insideHumidity -= 8;

  // Light intensity — depends on day/night + events
  const baseLightDay = 80 + Math.random() * 10;
  const baseLightNight = 15 + Math.random() * 5; // LED grow lights only at night
  const baseLight = isDaytime ? baseLightDay : baseLightNight;
  next.lightIntensity = hasStorm ? baseLight * 0.35 : hasPowerOutage ? baseLight * 0.3 : baseLight;

  // CO2 level
  next.co2Level = 800 + (Math.random() - 0.5) * 100;

  // Nutrient consumption
  const dailyNutrientUse = next.zones.filter(z => !z.harvested).length * 0.8;
  next.nutrientReservoir = Math.max(0, next.nutrientReservoir - dailyNutrientUse);

  // Grow crops
  let dayCalories = 0;
  let dayProtein = 0;
  let dayVitaminC = 0;

  next.zones = next.zones.map(zone => {
    if (zone.harvested) return zone;

    const crop = getCrop(zone.cropId);
    const z = { ...zone };

    // Growth progress
    const daysSincePlanted = next.day - z.plantedDay;
    z.growthProgress = Math.min(1, daysSincePlanted / crop.growthDays);

    // Water stress
    if (hasPumpFailure || next.waterReservoir < next.waterCapacity * 0.15) {
      z.waterStress = Math.min(1, z.waterStress + 0.15);
    } else {
      z.waterStress = Math.max(0, z.waterStress - 0.05);
    }

    // Health impacts
    let healthDelta = 0.2; // natural recovery
    if (z.waterStress > 0.3) healthDelta -= z.waterStress * 3;
    if (next.insideTemp > crop.optimalTemp[1] + 5) healthDelta -= 2;
    if (next.insideTemp < crop.optimalTemp[0] - 3) healthDelta -= 1;
    if (hasDisease) healthDelta -= 4;
    if (next.lightIntensity < 50) healthDelta -= 1.5;
    if (next.energyStored < 50) healthDelta -= 2;

    z.health = Math.max(0, Math.min(100, z.health + healthDelta));

    // Harvest check — queue for crew confirmation instead of auto-harvesting
    if (z.growthProgress >= 1 && !z.harvested) {
      const alreadyPending = next.pendingActions.some(a => a.zoneId === z.id && a.type === 'harvest');
      if (!alreadyPending) {
        const healthFactor = z.health / 100;
        const expectedYield = crop.yieldPerM2 * z.area * healthFactor;
        next.pendingActions.push({
          id: `pa-${nextLogId()}`,
          day: next.day,
          type: 'harvest',
          zoneId: z.id,
          cropId: z.cropId,
          description: `${crop.name} in Zone ${z.id.replace('z', '')} is ready for harvest (${Math.round(expectedYield)} kg expected).`,
          reasoning: `Growth complete after ${crop.growthDays} days. Crop health: ${Math.round(z.health)}%. Estimated yield: ${Math.round(expectedYield)} kg (${Math.round(crop.caloriesPerKg * expectedYield)} kcal, ${Math.round(crop.proteinPerKg * expectedYield)}g protein).`,
        });
        // Pause simulation for crew to act
        next.running = false;
      }
    }

    return z;
  });

  // Calculate daily nutritional output (estimate based on growing crops)
  const growingOutput = next.zones.reduce((acc, z) => {
    const crop = getCrop(z.cropId);
    const dailyYield = (crop.yieldPerM2 * z.area) / crop.growthDays * (z.health / 100);
    return {
      cal: acc.cal + crop.caloriesPerKg * dailyYield,
      prot: acc.prot + crop.proteinPerKg * dailyYield,
      vitc: acc.vitc + crop.vitaminCPerKg * dailyYield,
    };
  }, { cal: 0, prot: 0, vitc: 0 });

  next.dailyCalories = growingOutput.cal + dayCalories;
  next.dailyProtein = growingOutput.prot + dayProtein;
  next.dailyVitaminC = growingOutput.vitc + dayVitaminC;
  next.totalCalories += next.dailyCalories;
  next.totalProtein += next.dailyProtein;

  // Expire events
  next.activeEvents = next.activeEvents.map(e => ({
    ...e,
    active: next.day < e.startDay + e.duration,
  })).filter(e => e.active);

  // Agent intelligence — detect issues and log decisions (uses crew-based targets)
  const avgHealth = next.zones.reduce((s, z) => s + z.health, 0) / next.zones.length;
  const target = next.crewNutrientTarget;

  // Smart replant: agent evaluates what the crew needs most and queues replant for confirmation
  next.zones.forEach(z => {
    if (!z.harvested) return;

    const alreadyPending = next.pendingActions.some(a => a.zoneId === z.id && a.type === 'replant');
    if (alreadyPending) return;

    // Assess current deficits
    const calRatio = next.dailyCalories / Math.max(1, target.dailyCalories);
    const protRatio = next.dailyProtein / Math.max(1, target.dailyProtein);
    const vitCRatio = next.dailyVitaminC / Math.max(1, target.dailyVitaminC);

    let newCropId = z.cropId; // default: replant same
    let reason = 'Replanting same crop — balanced output.';

    // Prioritize the biggest deficit
    if (calRatio < 0.6 && calRatio < protRatio && calRatio < vitCRatio) {
      newCropId = 'potato';
      reason = `Calorie deficit detected (${Math.round(calRatio * 100)}% of target). Recommending potato for caloric density.`;
    } else if (protRatio < 0.6 && protRatio < calRatio && protRatio < vitCRatio) {
      newCropId = 'beans';
      reason = `Protein deficit detected (${Math.round(protRatio * 100)}% of target). Recommending beans for protein.`;
    } else if (vitCRatio < 0.6 && vitCRatio < calRatio && vitCRatio < protRatio) {
      newCropId = 'herbs';
      reason = `Vitamin C deficit (${Math.round(vitCRatio * 100)}% of target). Recommending herbs for micronutrients.`;
    }

    const cropName = getCrop(newCropId).name;
    const oldCropName = getCrop(z.cropId).name;
    const desc = newCropId !== z.cropId
      ? `Agent recommends replanting Zone ${z.id.replace('z', '')} with ${cropName} (was ${oldCropName}).`
      : `Zone ${z.id.replace('z', '')} is ready for replanting with ${cropName}.`;

    next.pendingActions.push({
      id: `pa-${nextLogId()}`,
      day: next.day,
      type: 'replant',
      zoneId: z.id,
      cropId: z.cropId,
      newCropId,
      description: desc,
      reasoning: reason,
    });
    next.running = false;
  });

  if (next.day % 15 === 0) {
    const calRatio = next.dailyCalories / target.dailyCalories;
    const protRatio = next.dailyProtein / target.dailyProtein;
    const highActivityCrew = next.crew.filter(a => a.activityLevel === 'high');
    next.agentLog.unshift({
      id: nextLogId(),
      day: next.day,
      type: calRatio > 0.8 ? 'info' : 'warning',
      message: `Day ${next.day} nutrition check: Cal ${Math.round(calRatio * 100)}%, Protein ${Math.round(protRatio * 100)}%. ${calRatio > 0.8 ? 'On track.' : 'Below target.'}`,
      reasoning: `Crew target: ${Math.round(target.dailyCalories)} kcal/day (${next.crew.length} crew, ${highActivityCrew.length} high-activity). Current: ${Math.round(next.dailyCalories)} kcal. ${highActivityCrew.length > 0 ? `High-activity members (${highActivityCrew.map(a => a.name).join(', ')}) need ~${Math.round(target.dailyCalories / next.crew.length * 1.15)} kcal each.` : ''}`,
    });
  }

  if (next.waterReservoir < next.waterCapacity * 0.2 && next.day > 2) {
    next.agentLog.unshift({
      id: nextLogId(),
      day: next.day,
      type: 'warning',
      message: `Water reservoir at ${Math.round(next.waterReservoir)}L (${Math.round(next.waterReservoir / next.waterCapacity * 100)}%). Reducing irrigation to non-critical zones.`,
      reasoning: 'Prioritizing water for calorie-dense crops (potato, beans) to maintain crew energy needs.',
    });
  }

  if (avgHealth < 70) {
    next.agentLog.unshift({
      id: nextLogId(),
      day: next.day,
      type: 'critical',
      message: `Average crop health dropped to ${Math.round(avgHealth)}%. Activating emergency protocols.`,
      reasoning: `At current health levels, projected output is ${Math.round(next.dailyCalories)} kcal vs crew requirement of ${Math.round(target.dailyCalories)} kcal. Risk of crew malnutrition if health doesn't recover within ${Math.ceil((target.dailyCalories - next.dailyCalories) / 100)} days.`,
    });
  }

  // Record history
  if (next.day % 3 === 0 || next.day <= 5) {
    next.history.push({
      day: next.day,
      calories: Math.round(next.dailyCalories),
      protein: Math.round(next.dailyProtein),
      water: Math.round(next.waterReservoir),
      energy: Math.round(next.energyStored),
      avgHealth: Math.round(avgHealth),
    });
  }

  // Trim log to last 50 entries
  if (next.agentLog.length > 50) next.agentLog = next.agentLog.slice(0, 50);
  if (next.productionLog.length > 200) next.productionLog = next.productionLog.slice(-200);

  return next;
}

export function injectEvent(state: SimulationState, eventType: SimEvent['type'], name: string, description: string, severity: number, duration: number): SimulationState {
  const next = structuredClone(state);
  const evt: SimEvent = {
    id: nextEventId(),
    type: eventType,
    name,
    description,
    severity,
    startDay: next.day,
    duration,
    active: true,
  };
  next.activeEvents.push(evt);

  // Agent responds to the event
  const responses: Record<string, { message: string; reasoning: string }> = {
    dust_storm: {
      message: `ALERT: Dust storm detected! Solar output dropping to 30%. Switching to power-conservation mode.`,
      reasoning: 'Reducing non-essential lighting by 40%. Prioritizing energy for water circulation and critical heating. Estimated storm duration: ' + duration + ' sols.',
    },
    pump_failure: {
      message: `WARNING: Water pump failure detected. Activating backup irrigation drip system.`,
      reasoning: 'Reducing water allocation to lettuce and radish by 30% to preserve supply for protein crops. Estimated repair time: ' + duration + ' sols.',
    },
    temperature_spike: {
      message: `ALERT: Thermal regulation failure. Internal temperature rising. Activating emergency venting.`,
      reasoning: 'Opening auxiliary vents to radiate heat. Increasing humidity to cool crops via evapotranspiration. Heat-sensitive crops (lettuce, herbs) at risk.',
    },
    crop_disease: {
      message: `CRITICAL: Fungal contamination detected. Isolating affected zones and applying anti-fungal treatment.`,
      reasoning: 'Reducing humidity in affected zones to inhibit fungal growth. Increasing air circulation. May need to sacrifice affected crops if contamination spreads.',
    },
    power_outage: {
      message: `EMERGENCY: Power grid failure. Switching to battery reserves. Estimated autonomy: ${Math.round(next.energyStored / 30)} hours.`,
      reasoning: 'Shutting down grow lamps in 3 of 5 zones. Maintaining minimum heating to prevent crop freeze. Water circulation reduced to emergency levels.',
    },
  };

  const resp = responses[eventType];
  next.agentLog.unshift({
    id: nextLogId(),
    day: next.day,
    type: severity >= 3 ? 'critical' : 'warning',
    message: resp.message,
    reasoning: resp.reasoning,
  });

  return next;
}

// Confirm a pending crew action (harvest or replant)
export function confirmAction(state: SimulationState, actionId: string): SimulationState {
  const next = structuredClone(state);
  const action = next.pendingActions.find(a => a.id === actionId);
  if (!action) return next;

  const zoneIdx = next.zones.findIndex(z => z.id === action.zoneId);
  if (zoneIdx === -1) return next;

  if (action.type === 'harvest') {
    const zone = next.zones[zoneIdx];
    const crop = getCrop(zone.cropId);
    const healthFactor = zone.health / 100;
    const yieldKg = crop.yieldPerM2 * zone.area * healthFactor;

    next.zones[zoneIdx] = { ...zone, harvested: true };
    next.dailyCalories += crop.caloriesPerKg * yieldKg;
    next.dailyProtein += crop.proteinPerKg * yieldKg;
    next.dailyVitaminC += crop.vitaminCPerKg * yieldKg;
    next.totalHarvested += yieldKg;
    next.totalCalories += crop.caloriesPerKg * yieldKg;
    next.totalProtein += crop.proteinPerKg * yieldKg;

    next.productionLog.push({
      day: next.day,
      cropId: zone.cropId,
      yieldKg,
      calories: crop.caloriesPerKg * yieldKg,
      protein: crop.proteinPerKg * yieldKg,
      vitaminC: crop.vitaminCPerKg * yieldKg,
    });

    next.agentLog.unshift({
      id: nextLogId(),
      day: next.day,
      type: 'action',
      message: `Crew harvested ${crop.name} from Zone ${zone.id.replace('z', '')} — ${Math.round(yieldKg)} kg collected.`,
      reasoning: action.reasoning,
    });
  }

  if (action.type === 'replant') {
    const zone = next.zones[zoneIdx];
    const newCropId = action.newCropId || zone.cropId;
    const newCrop = getCrop(newCropId);
    const oldCrop = getCrop(zone.cropId);

    next.zones[zoneIdx] = {
      ...zone,
      cropId: newCropId,
      plantedDay: next.day,
      health: 90 + Math.random() * 10,
      growthProgress: 0,
      waterStress: 0,
      harvested: false,
    };

    next.agentLog.unshift({
      id: nextLogId(),
      day: next.day,
      type: 'action',
      message: newCropId !== zone.cropId
        ? `Crew replanted Zone ${zone.id.replace('z', '')}: ${oldCrop.name} → ${newCrop.name}.`
        : `Crew replanted Zone ${zone.id.replace('z', '')} with ${newCrop.name}.`,
      reasoning: action.reasoning,
    });
  }

  // Remove the confirmed action
  next.pendingActions = next.pendingActions.filter(a => a.id !== actionId);

  // Resume simulation if no more pending actions
  if (next.pendingActions.length === 0) {
    next.running = true;
  }

  return next;
}

// Dismiss a pending action (skip it)
export function dismissAction(state: SimulationState, actionId: string): SimulationState {
  const next = structuredClone(state);
  const action = next.pendingActions.find(a => a.id === actionId);
  if (!action) return next;

  next.agentLog.unshift({
    id: nextLogId(),
    day: next.day,
    type: 'info',
    message: `Crew skipped: ${action.description}`,
  });

  next.pendingActions = next.pendingActions.filter(a => a.id !== actionId);

  if (next.pendingActions.length === 0) {
    next.running = true;
  }

  return next;
}

// Confirm all pending actions at once
export function confirmAllActions(state: SimulationState): SimulationState {
  let current = state;
  const actionIds = state.pendingActions.map(a => a.id);
  for (const id of actionIds) {
    current = confirmAction(current, id);
  }
  return current;
}
