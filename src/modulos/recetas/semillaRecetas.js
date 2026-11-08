/**
 * semillaRecetas — las recetas de ejemplo con las que arranca la demostración.
 *
 * Son las mismas del prototipo, con las mismas cantidades y pasos. Se
 * siembran solo si el catálogo está vacío: sembrar dos veces no duplica
 * nada ni toca lo que el usuario haya creado.
 */

import { db } from "../../services/storage.js";
import { COLECCION } from "./recetasService.js";

const RECETAS = [
  {
    nombre: "Taco al pastor",
    categoria: "taco",
    porciones: 10,
    precioVenta: 1.25,
    tiempoMinutos: 20,
    estado: "activa",
    ingredientes: [
      { insumoId: "tortilla", cantidad: 10 },
      { insumoId: "pastor", cantidad: 0.5 },
      { insumoId: "pina", cantidad: 0.15 },
      { insumoId: "cebolla", cantidad: 0.1 },
      { insumoId: "cilantro", cantidad: 0.03 },
      { insumoId: "salsa-roja", cantidad: 0.12 }
    ],
    preparacion: "1. Marinar la carne al pastor desde la noche anterior.\n2. Asar en la plancha hasta que dore por fuera.\n3. Picar la piña y la cebolla en cubos pequeños.\n4. Calentar las tortillas y armar cada taco con carne, piña, cebolla y cilantro.\n5. Servir con salsa roja aparte."
  },
  {
    nombre: "Taco de res asada",
    categoria: "taco",
    porciones: 10,
    precioVenta: 1.40,
    tiempoMinutos: 18,
    estado: "activa",
    ingredientes: [
      { insumoId: "tortilla", cantidad: 10 },
      { insumoId: "res", cantidad: 0.55 },
      { insumoId: "cebolla", cantidad: 0.1 },
      { insumoId: "cilantro", cantidad: 0.03 },
      { insumoId: "limon", cantidad: 3 },
      { insumoId: "aceite", cantidad: 0.02 }
    ],
    preparacion: "1. Cortar la res en tiras delgadas y salpimentar.\n2. Asar en la plancha con un poco de aceite.\n3. Picar cebolla y cilantro.\n4. Armar los tacos y servir con limón."
  },
  {
    nombre: "Taco de pollo con queso",
    categoria: "taco",
    porciones: 10,
    precioVenta: 1.20,
    tiempoMinutos: 15,
    estado: "activa",
    ingredientes: [
      { insumoId: "tortilla", cantidad: 10 },
      { insumoId: "pollo", cantidad: 0.5 },
      { insumoId: "queso", cantidad: 0.12 },
      { insumoId: "crema", cantidad: 0.08 },
      { insumoId: "cebolla", cantidad: 0.08 }
    ],
    preparacion: "1. Cocer y deshebrar el pollo.\n2. Sofreír con cebolla hasta que tome color.\n3. Calentar las tortillas y rellenar.\n4. Terminar con queso rallado y un hilo de crema."
  },
  {
    nombre: "Quesadilla de queso duro",
    categoria: "complemento",
    porciones: 6,
    precioVenta: 1.75,
    tiempoMinutos: 12,
    estado: "activa",
    ingredientes: [
      { insumoId: "tortilla", cantidad: 12 },
      { insumoId: "queso", cantidad: 0.36 },
      { insumoId: "frijol", cantidad: 0.18 },
      { insumoId: "aceite", cantidad: 0.03 }
    ],
    preparacion: "1. Untar frijol en una tortilla.\n2. Agregar queso y tapar con otra tortilla.\n3. Dorar por ambos lados en la plancha.\n4. Cortar por la mitad antes de servir."
  },
  {
    nombre: "Horchata de 12 onzas",
    categoria: "bebida",
    porciones: 8,
    precioVenta: 1.00,
    tiempoMinutos: 10,
    estado: "activa",
    ingredientes: [
      { insumoId: "horchata", cantidad: 0.2 },
      { insumoId: "azucar", cantidad: 0.18 },
      { insumoId: "vaso", cantidad: 8 }
    ],
    preparacion: "1. Disolver la horchata en agua fría.\n2. Endulzar y probar antes de servir.\n3. Mantener en refrigeración y servir con hielo."
  },
  {
    nombre: "Salsa roja de la casa",
    categoria: "base",
    porciones: 20,
    precioVenta: 0,
    tiempoMinutos: 25,
    estado: "activa",
    ingredientes: [
      { insumoId: "tomate", cantidad: 1.2 },
      { insumoId: "chile", cantidad: 0.08 },
      { insumoId: "cebolla", cantidad: 0.2 },
      { insumoId: "aceite", cantidad: 0.05 }
    ],
    preparacion: "1. Asar el tomate, el chile y la cebolla.\n2. Licuar con un poco de agua.\n3. Sofreír la mezcla en aceite y dejar reducir.\n4. Guardar en frasco cerrado y rotular con la fecha."
  }
];

export function sembrarRecetas() {
  const ahora = Date.now();
  return db.seed(COLECCION, RECETAS.map(receta => ({
    ...receta,
    creadaPor: "Datos de ejemplo",
    creadaEn: ahora,
    actualizadaEn: ahora
  })));
}

export default sembrarRecetas;
