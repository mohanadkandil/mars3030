import json
import time
import os

OBSERVABILITY_FILE = "agent_observability.jsonl"

def log_agent_decision(agent_id, sol, telemetry, prompt, reasoning, action):
    """
    Logs an agent's internal state, the prompt given to their 'brain',
    their reasoning process, and the final action taken.
    """
    entry = {
        "timestamp": time.time(),
        "sol": sol,
        "agent": agent_id,
        "telemetry_context": telemetry,
        "llm_prompt": prompt,
        "reasoning": reasoning,
        "action_taken": action
    }
    with open(OBSERVABILITY_FILE, 'a') as f:
        f.write(json.dumps(entry) + "\n")

def get_agent_history(agent_id, limit=5):
    """Retrieves the last N decisions for an agent."""
    history = []
    if not os.path.exists(OBSERVABILITY_FILE):
        return history
    with open(OBSERVABILITY_FILE, 'r') as f:
        for line in f:
            data = json.loads(line)
            if data["agent"] == agent_id:
                history.append(data)
    return history[-limit:]
