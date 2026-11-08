import { createRoot } from "react-dom/client";
import Dashboard from "./Dashboard.jsx";

const destino = document.getElementById("dashboard-react");

if (destino && Guard.requireRole("admin")) {
  createRoot(destino).render(<Dashboard />);
}
