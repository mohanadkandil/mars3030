import json
import boto3
import os
import random
from dotenv import load_dotenv
from observability import log_agent_decision

# Load AWS credentials from .env
load_dotenv()

class LLMBrain:
    """The Bedrock-powered 'Brain' for an agent with local fallback."""
    def __init__(self, model_id="amazon.titan-text-lite-v1"):
        self.bedrock = None
        try:
            self.bedrock = boto3.client(
                service_name='bedrock-runtime',
                region_name=os.getenv("AWS_DEFAULT_REGION", "us-west-2")
            )
        except Exception:
            self.bedrock = None
        self.model_id = model_id

    def reason(self, system_prompt, user_prompt, telemetry=None):
        """Calls the LLM or falls back to internal reasoning logic."""
        # Try Bedrock first
        if self.bedrock:
            try:
                body = json.dumps({
                    "inputText": f"{system_prompt}\n\nContext:\n{user_prompt}\n\nReasoning and Final Decision:",
                    "textGenerationConfig": {
                        "maxTokenCount": 512,
                        "temperature": 0.7,
                        "topP": 0.9
                    }
                })
                response = self.bedrock.invoke_model(
                    body=body, modelId=self.model_id,
                    accept="application/json", contentType="application/json"
                )
                response_body = json.loads(response.get('body').read())
                return response_body.get('results')[0].get('outputText')
            except Exception as e:
                pass
        
        # Local Reasoning Engine (Deterministic AI) - Enhanced for Multi-Agent
        if not telemetry:
            return "Unable to reason without telemetry context."
            
        h2o = telemetry.get("resources", {}).get("H2O", 0)
        o2 = telemetry.get("resources", {}).get("O2", 0)
        power = telemetry.get("resources", {}).get("Power", 100)
        is_anomaly = telemetry.get("is_anomaly", False)
        
        reasoning = f"LOCAL BRAIN: Analyzing telemetry. "
        decisions = []
        
        # Role-based logic if system_prompt mentions role
        if "Major Tom" in system_prompt:
            reasoning += "Focus: Human Health. "
            for h in telemetry.get("humans", []):
                if h['health'] < 80 or h['stress'] > 70:
                    decisions.append(f"MED_TRIAGE: {h['id']} needs RESTING.")
                elif h['fatigue'] > 60:
                    decisions.append(f"REST_ORDER: {h['id']} needs RESTING.")
                else:
                    decisions.append(f"WORK_ASSIGN: {h['id']} to ACTIVITY.")
        
        elif "Demeter" in system_prompt:
            reasoning += "Focus: Botanical Efficiency. "
            if h2o < 500:
                decisions.append("CONSERVE_WATER: Diminish plant hydration.")
            decisions.append("SCAN_YIELD: Looking for harvest-ready slots.")

        elif "Volt" in system_prompt:
            reasoning += "Focus: Resource Balancing. "
            if power < 30:
                decisions.append("BROWNOUT: Cutting non-essential systems.")
            if o2 < 90:
                decisions.append("EMERGENCY_O2: Activating reserve tanks.")

        elif "GAIA" in system_prompt:
            reasoning += "Focus: Global Strategy. "
            if is_anomaly:
                decisions.append(f"MITIGATE: {telemetry.get('event')}")
            decisions.append("MAINTAIN_STABILITY: All systems nominal.")

        return reasoning + f"DECISIONS: [{', '.join(decisions)}]"

class BaseAgent:
    def __init__(self, name, system_prompt):
        self.name = name
        self.system_prompt = system_prompt
        self.brain = LLMBrain()

    def decide(self, sol, telemetry):
        user_prompt = f"Sol {sol} Telemetry:\n{json.dumps(telemetry, indent=2)}"
        raw_output = self.brain.reason(self.system_prompt, user_prompt, telemetry=telemetry)
        log_agent_decision(self.name, sol, telemetry, user_prompt, raw_output, "Decision Cycle")
        return raw_output

class MajorTomAgent(BaseAgent):
    def __init__(self):
        super().__init__("Major Tom", 
            "You are Major Tom (The Bio-Sentinel). Responsibility: 4 Humans. "
            "Domain: Medical triage, psychology, and caloric intake. Behavior: Protective, clinical. "
            "Decide human states: ACTIVITY, RESTING, SICK.")

class DemeterAgent(BaseAgent):
    def __init__(self):
        super().__init__("Demeter", 
            "You are Demeter (The Botanical Strategist). Responsibility: 27-Plant Library. "
            "Domain: Soil chemistry, ripeness, genetic rotation. Behavior: Analytical, yield-obsessed.")

class VoltAgent(BaseAgent):
    def __init__(self):
        super().__init__("Volt", 
            "You are Volt (The Resource Governor). Responsibility: O2, H2O, Solar Power, Battery. "
            "Domain: Thermodynamics, utility balancing. Behavior: Strict, math-first.")

class GaiaAgent(BaseAgent):
    def __init__(self):
        super().__init__("GAIA", 
            "You are GAIA (The Mission Director). Responsibility: Interface & Strategy. "
            "Domain: Conflict resolution, Sol-tracking. Behavior: Diplomatic, high-level. "
            "Mediate between agents and ensure 450-day survival.")
