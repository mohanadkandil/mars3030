import json
import os

STATE_FILE = "ares7_state.json"

class StateStorage:
    """Mock storage for DynamoDB state."""
    
    @staticmethod
    def save_state(state_data):
        with open(STATE_FILE, 'w') as f:
            json.dump(state_data, f, indent=2)
        # print(f"DEBUG: State saved to {STATE_FILE}")

    @staticmethod
    def load_state():
        if not os.path.exists(STATE_FILE):
            # Default initial state
            return {
                "sol": 0,
                "resources": {"O2": 100.0, "H2O": 450.0},
                "crew_count": 4,
                "active_plants": [
                    {"id": f"slot_{i}", "o2_rate": 0.8} for i in range(8)
                ]
            }
        with open(STATE_FILE, 'r') as f:
            return json.load(f)

    @staticmethod
    def log_event(event_data):
        with open("cloudwatch_logs.jsonl", 'a') as f:
            f.write(json.dumps(event_data) + "\n")
