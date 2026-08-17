import { AutonomousOrchestrator } from "./orchestrator";

export default {
  async fetch(request: Request, env: any) {
    return routeAgentRequest(request, env);
  }
};
