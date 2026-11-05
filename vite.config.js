import { readdirSync } from "node:fs";
import { cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const ruta = archivo => fileURLToPath(new URL(archivo, import.meta.url));
const paginas = readdirSync(ruta("pages")).filter(archivo => archivo.endsWith(".html"));

export default defineConfig({
  base: "./",
  optimizeDeps: { include: ["react-dom/client"] },
  plugins: [
    react(),
    {
      name: "plantilla-react",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          // Live Server conserva el menú estático. Vite monta el de React en las mismas páginas.
          return html
            .replace('<script src="../js/main.js"></script>', '<script type="module" src="../src/plantilla.jsx"></script>')
            .replace(/<script(\s+src="(?:\.\.\/)?js\/[^"]+\.js")/g, '<script vite-ignore$1');
        }
      },
      async writeBundle({ dir }) {
        // Los scripts clásicos conservan sus rutas y su orden de carga.
        await cp(ruta("js"), `${dir}/js`, { recursive: true });
      }
    }
  ],
  build: {
    rolldownOptions: {
      input: [ruta("index.html"), ...paginas.map(archivo => ruta(`pages/${archivo}`))]
    }
  }
});
