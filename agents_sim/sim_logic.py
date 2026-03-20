import json
import time
import random
import math
import os
from enum import Enum
from dotenv import load_dotenv

# Re-importing brain for local reasoning if needed, but keeping sim logic focused on state
# from gaia_agent import LLMBrain

class HumanState(Enum):
    ACTIVITY = "ACTIVITY"
    RESTING = "RESTING"
    SICK = "SICK"

class RobotState(Enum):
    WORKING = "WORKING"
    CHARGING = "CHARGING"
    MAINTENANCE = "MAINTENANCE"

class CrewEntity:
    def __init__(self, name, role):
        self.id = name
        self.role = role
        self.health = 100
        self.fatigue = 10
        self.status = "IDLE"

    def tick(self):
        pass

class Human(CrewEntity):
    def __init__(self, name, role):
        super().__init__(name, role)
        self.hunger = 20
        self.stress = 10
        self.state = HumanState.RESTING
        self.bmi = 22.0 # Body Mass Index for Major Tom to track

    def tick(self):
        # Natural degradation
        self.hunger += random.randint(2, 8)
        self.fatigue += random.randint(2, 5)
        
        # State based impacts
        if self.state == HumanState.ACTIVITY:
            self.fatigue += 5
            self.hunger += 3
        elif self.state == HumanState.RESTING:
            self.fatigue = max(0, self.fatigue - 10)
        elif self.state == HumanState.SICK:
            self.health -= 2
            self.fatigue += 2
        
        # Random sickness chance
        if random.random() < 0.01:
            self.state = HumanState.SICK
            
        # Vitals boundaries
        self.health = max(0, min(100, self.health))
        self.stress = max(0, min(100, self.stress))
        self.fatigue = max(0, min(100, self.fatigue))
        self.hunger = max(0, min(100, self.hunger))

class Robot(CrewEntity):
    def __init__(self, name, model):
        super().__init__(name, "Robot")
        self.model = model
        self.battery = 100
        self.state = RobotState.WORKING

    def tick(self):
        if self.state == RobotState.WORKING:
            self.battery -= random.randint(3, 7)
            if self.battery < 20:
                self.state = RobotState.CHARGING
        elif self.state == RobotState.CHARGING:
            self.battery += 10
            if self.battery >= 100:
                self.battery = 100
                self.state = RobotState.WORKING
        
        # Random malfunction
        if random.random() < 0.005:
            self.state = RobotState.MAINTENANCE

# Botanical Library
PLANT_LIBRARY = {
    "Potato": {"o2_rate": 0.5, "calories": 150, "growth_speed": 10, "water_req": 20},
    "Kale": {"o2_rate": 0.9, "calories": 50, "growth_speed": 15, "water_req": 10},
    "Spinach": {"o2_rate": 1.2, "calories": 30, "growth_speed": 20, "water_req": 15},
    "Radish": {"o2_rate": 0.4, "calories": 20, "growth_speed": 25, "water_req": 5},
    "Soybean": {"o2_rate": 0.7, "calories": 100, "growth_speed": 12, "water_req": 18},
    "Tomato": {"o2_rate": 0.8, "calories": 60, "growth_speed": 14, "water_req": 25},
    "Carrot": {"o2_rate": 0.6, "calories": 80, "growth_speed": 11, "water_req": 12},
    "Lettuce": {"o2_rate": 1.1, "calories": 25, "growth_speed": 22, "water_req": 30}
}

class Plant:
    def __init__(self, id, variety):
        self.id = id
        self.variety = variety
        metadata = PLANT_LIBRARY.get(variety, PLANT_LIBRARY["Potato"])
        self.o2_rate = metadata["o2_rate"]
        self.calories = metadata["calories"]
        self.growth_speed = metadata["growth_speed"]
        self.water_req = metadata["water_req"]
        self.growth = 0
        self.hydration_limit = 1.0 

    def grow(self, global_multiplier=1.0):
        effective_multiplier = global_multiplier * self.hydration_limit
        self.growth += int(self.growth_speed * effective_multiplier * random.uniform(0.8, 1.2))
        self.growth = min(100, self.growth)

class State:
    def __init__(self, humans, robots, o2, active_plants, inactive_seeds):
        self.humans = humans
        self.robots = robots
        self.o2 = o2
        self.h2o = 1000.0
        self.power = 100.0
        self.active_plants = active_plants
        self.inactive_seeds = inactive_seeds
        self.biomass_calories = 500
        self.metrics_history = {"o2": [], "stress": []}
        self.total_calories_produced = 0
        self.total_calories_consumed = 0

    def get_z_score(self, value, history):
        if len(history) < 5: return 0
        mean = sum(history) / len(history)
        std = math.sqrt(sum((x - mean)**2 for x in history) / len(history))
        if std == 0: return 0
        return abs(value - mean) / std

def calculate_tick(sol, current_state):
    # Update Entities
    for h in current_state.humans: h.tick()
    for r in current_state.robots: r.tick()
    
    # Environment Logic
    produced_o2 = sum([p.o2_rate * p.hydration_limit for p in current_state.active_plants])
    consumed_o2 = len(current_state.humans) * 0.5 
    current_state.o2 += (produced_o2 - consumed_o2)
    
    plant_water_use = sum([p.water_req * p.hydration_limit for p in current_state.active_plants])
    current_state.h2o -= (plant_water_use * 0.05) 
    current_state.h2o = max(0, current_state.h2o)
    
    global_growth_mult = 1.0
    if current_state.h2o <= 0: global_growth_mult = 0.0
    for p in current_state.active_plants: p.grow(global_growth_mult)
    
    # Anomaly Detection
    is_anomaly = False
    z_o2 = current_state.get_z_score(current_state.o2, current_state.metrics_history["o2"])
    current_state.metrics_history["o2"].append(current_state.o2)
    if z_o2 > 3: is_anomaly = True
    
    avg_stress = sum([h.stress for h in current_state.humans]) / len(current_state.humans) if current_state.humans else 0
    z_stress = current_state.get_z_score(avg_stress, current_state.metrics_history["stress"])
    current_state.metrics_history["stress"].append(avg_stress)
    if z_stress > 3: is_anomaly = True
    
    event = None
    if random.random() < 0.05:
        event = random.choice(["DUST_STORM", "BLIGHT", "EQUIPMENT_FAILURE", "SOLAR_FLARE"])
        is_anomaly = True
    
    return event, is_anomaly
