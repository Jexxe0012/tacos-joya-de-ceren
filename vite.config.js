import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const ruta = (archivo) => fileURLToPath(new URL(archivo, import.meta.url));
const paginas = readdirSync(ruta("pages")).filter((archivo) =>
  archivo.endsWith(".html")
);

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rolldownOptions: {
      // Solo index carga React; los demás HTML preservan los enlaces anteriores.
      input: [
        ruta("index.html"),
        ruta("app.html"),
        ...paginas.map((archivo) => ruta(`pages/${archivo}`))
      ]
    }
  }
});
