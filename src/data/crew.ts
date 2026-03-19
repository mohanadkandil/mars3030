import { Astronaut, NutrientTarget, ActivityLevel, Gender } from '../types';

// Default crew of 4 astronauts with varied parameters
export const DEFAULT_CREW: Astronaut[] = [
  {
    id: 'a1',
    name: 'S. Rutz',
    title: 'Commander',
    photo: '/crew/sara.png',
    age: 27,
    gender: 'female',
    weightKg: 65,
    heightCm: 168,
    activityLevel: 'moderate',
    dietaryRestrictions: [],
  },
  {
    id: 'a2',
    name: 'K. Jaroslavceva',
    title: 'Flight Engineer',
    photo: '/crew/kate.jpeg',
    age: 25,
    gender: 'female',
    weightKg: 60,
    heightCm: 170,
    activityLevel: 'high',
    dietaryRestrictions: [],
  },
  {
    id: 'a3',
    name: 'A. Mitra',
    title: 'Science Officer',
    photo: '/crew/arka.png',
    age: 26,
    gender: 'male',
    weightKg: 76,
    heightCm: 178,
    activityLevel: 'high',
    dietaryRestrictions: [],
  },
  {
    id: 'a4',
    name: 'M. Kandil',
    title: 'Systems Engineer',
    photo: '/crew/mo.png',
    age: 24,
    gender: 'male',
    weightKg: 80,
    heightCm: 182,
    activityLevel: 'moderate',
    dietaryRestrictions: [],
  },
];

// Basal Metabolic Rate (Mifflin-St Jeor Equation)
function calculateBMR(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

// Activity multiplier (adjusted for Mars gravity — 0.38g means less energy for movement,
// but EVA suits and resistance exercise compensate)
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  low: 1.4,       // Minimal EVA, mostly lab work
  moderate: 1.6,  // Regular EVA, maintenance tasks
  high: 1.8,      // Heavy EVA, construction, intense exercise
};

// Calculate individual daily nutritional needs
export function calculateAstronautNeeds(astronaut: Astronaut): NutrientTarget {
  const bmr = calculateBMR(astronaut.gender, astronaut.weightKg, astronaut.heightCm, astronaut.age);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[astronaut.activityLevel];

  // Protein: 1.2-1.6 g/kg based on activity (NASA recommends higher protein on Mars for bone/muscle)
  const proteinPerKg = astronaut.activityLevel === 'high' ? 1.6 : astronaut.activityLevel === 'moderate' ? 1.4 : 1.2;
  const protein = astronaut.weightKg * proteinPerKg;

  // Vitamin C: 90mg male, 75mg female + 10% for space radiation stress
  const vitC = (astronaut.gender === 'male' ? 90 : 75) * 1.1;

  // Fiber: 25-38g/day
  const fiber = astronaut.gender === 'male' ? 38 : 25;

  // Iron: 8mg male, 18mg female
  const iron = astronaut.gender === 'male' ? 8 : 18;

  // Calcium: 1000-1200mg (higher on Mars due to bone density concerns in low gravity)
  const calcium = 1200;

  return {
    dailyCalories: Math.round(tdee),
    dailyProtein: Math.round(protein),
    dailyVitaminC: Math.round(vitC),
    dailyFiber: fiber,
    dailyIron: iron,
    dailyCalcium: calcium,
  };
}

// Aggregate crew needs
export function calculateCrewNeeds(crew: Astronaut[]): NutrientTarget {
  return crew.reduce<NutrientTarget>(
    (acc, a) => {
      const needs = calculateAstronautNeeds(a);
      return {
        dailyCalories: acc.dailyCalories + needs.dailyCalories,
        dailyProtein: acc.dailyProtein + needs.dailyProtein,
        dailyVitaminC: acc.dailyVitaminC + needs.dailyVitaminC,
        dailyFiber: acc.dailyFiber + needs.dailyFiber,
        dailyIron: acc.dailyIron + needs.dailyIron,
        dailyCalcium: acc.dailyCalcium + needs.dailyCalcium,
      };
    },
    { dailyCalories: 0, dailyProtein: 0, dailyVitaminC: 0, dailyFiber: 0, dailyIron: 0, dailyCalcium: 0 },
  );
}
