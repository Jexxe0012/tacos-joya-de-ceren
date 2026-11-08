import { createRoot } from "react-dom/client";
import { AuthProvider } from "../auth/AuthProvider.jsx";
import ReportesPage from "../modulos/reportes/ReportesPage.jsx";

const destino = document.getElementById("reportes-react");
if (destino) createRoot(destino).render(<AuthProvider><ReportesPage /></AuthProvider>);
