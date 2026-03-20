import time
import random
import json
import os
from sim_logic import calculate_tick, Plant, Human, Robot, State, PLANT_LIBRARY, HumanState, RobotState
from gaia_agent import GaiaAgent, MajorTomAgent, DemeterAgent, VoltAgent
from storage import StateStorage
from observability import log_agent_decision

def run_mission(ticks=30):
    print("🚀 INITIALIZING PROJECT GAIA: THE MARTIAN COUNCIL IS ONLINE...")
    
    # 1. Initialize Agents (The Brains)
    gaia = GaiaAgent()
    major_tom = MajorTomAgent()
    demeter = DemeterAgent()
    volt = VoltAgent()
    
    # 2. Initialize Crew Entities (The Bodies)
    humans = [
        Human("Mark Watney", "Botanist"),
        Human("Melissa Lewis", "Commander"),
        Human("Rick Martinez", "Pilot"),
        Human("Beth Johanssen", "Sysop")
    ]
    robots = [
        Robot("TARS", "Utility"),
        Robot("CASE", "Tactical")
    ]
    
    all_varieties = list(PLANT_LIBRARY.keys())
    active_plants = [Plant(f"slot_{i}", all_varieties[i]) for i in range(8)]
    inactive_seeds = all_varieties[8:]
    
    mock_state = State(humans=humans, robots=robots, o2=100.0, active_plants=active_plants, inactive_seeds=inactive_seeds)
    
    for sol in range(1, ticks + 1):
        # 3. Simulation Step (Natural Entropy)
        event, is_anomaly = calculate_tick(sol, mock_state)
        
        # 4. Telemetry Collection
        telemetry = {
            "sol": sol,
            "resources": {
                "O2": round(mock_state.o2, 2),
                "H2O": round(mock_state.h2o, 2),
                "Power": round(mock_state.power, 2),
                "Biomass": mock_state.biomass_calories
            },
            "humans": [
                {"id": h.id, "state": h.state.value, "health": h.health, "fatigue": h.fatigue, "stress": h.stress}
                for h in mock_state.humans
            ],
            "robots": [
                {"id": r.id, "state": r.state.value, "battery": r.battery}
                for r in mock_state.robots
            ],
            "is_anomaly": is_anomaly,
            "event": event
        }

        print(f"\n--- [ SOL {sol} ] ---")
        if is_anomaly:
            print(f"⚠️ ANOMALY DETECTED: {event}")

        # 5. Agent Reasoning (The Council Decides)
        # Major Tom manages humans
        tom_output = major_tom.decide(sol, telemetry)
        for h in mock_state.humans:
            if f"MED_TRIAGE: {h.id}" in tom_output or f"REST_ORDER: {h.id}" in tom_output:
                h.state = HumanState.RESTING
            elif f"WORK_ASSIGN: {h.id}" in tom_output:
                h.state = HumanState.ACTIVITY

        # Demeter manages plants
        demeter_output = demeter.decide(sol, telemetry)
        if "SCAN_YIELD" in demeter_output:
            for p in mock_state.active_plants:
                if p.growth >= 90:
                    mock_state.biomass_calories += p.calories
                    p.growth = 0
                    print(f"🌿 Demeter Harvest: {p.variety} harvested.")

        # Volt manages resources
        volt_output = volt.decide(sol, telemetry)
        if "BROWNOUT" in volt_output:
            mock_state.power = max(0, mock_state.power - 5)
            print("⚡ Volt: Power Brownout active.")

        # Gaia oversees everything
        gaia_output = gaia.decide(sol, telemetry)
        
        # 6. Display Current Status
        for h in mock_state.humans:
            print(f"👤 {h.id}: {h.state.value} (H:{h.health} F:{h.fatigue} S:{h.stress})")
        for r in mock_state.robots:
            print(f"🤖 {r.id}: {r.state.value} (Bat:{r.battery}%)")

        # Slow down slightly for terminal readability
        time.sleep(0.1)

    print("\n✅ Simulation cycle completed. The Martian Council has spoken.")

if __name__ == "__main__":
    run_mission(ticks=30)
