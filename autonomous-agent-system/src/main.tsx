import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgentDashboard } from "./client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AgentDashboard />
  </StrictMode>
);
