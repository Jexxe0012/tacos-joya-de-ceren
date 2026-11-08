/**
 * App — la aplicación completa: enrutador, sesión y rutas.
 *
 * HashRouter y no BrowserRouter porque la entrega se publica en GitHub
 * Pages, que sirve archivos estáticos: con rutas normales, recargar en
 * /recetas daría un 404 porque ese archivo no existe. Con el hash, el
 * servidor siempre entrega la misma página y el enrutador lee la ruta
 * después del #.
 *
 * AuthProvider envuelve a las rutas, no al contrario: las rutas
 * protegidas necesitan saber si hay sesión para decidir qué mostrar.
 */

import { HashRouter } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider.jsx";
import Rutas from "./app/Rutas.jsx";

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Rutas />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
