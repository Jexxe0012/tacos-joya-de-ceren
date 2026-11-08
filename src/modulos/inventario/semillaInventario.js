/**
 * semillaInventario — los productos de ejemplo del inventario.
 *
 * Son los mismos del prototipo. Las caducidades se calculan desde el día
 * en que se abre la aplicación, para que los avisos de "por vencer" y
 * "vencido" tengan sentido en la demostración.
 */

import { db } from "../../services/storage.js";
import { COLECCION, fechaRelativa } from "./inventarioService.js";

export function sembrarInventario() {
  return db.seed(COLECCION, [
    { nombre: "Carne de res para asar", categoria: "Carnes", unidad: "kg", cantidad: 18, stockMinimo: 10, costoUnitario: 6.75, proveedor: "Carnicería El Novillo", ubicacion: "Congelador 1", caducidad: fechaRelativa(5) },
    { nombre: "Carne de cerdo adobada", categoria: "Carnes", unidad: "kg", cantidad: 6, stockMinimo: 8, costoUnitario: 5.4, proveedor: "Carnicería El Novillo", ubicacion: "Congelador 1", caducidad: fechaRelativa(3) },
    { nombre: "Pollo deshuesado", categoria: "Carnes", unidad: "kg", cantidad: 12, stockMinimo: 8, costoUnitario: 4.2, proveedor: "Avícola San Juan", ubicacion: "Congelador 2", caducidad: fechaRelativa(4) },
    { nombre: "Tortilla de maíz", categoria: "Abarrotes", unidad: "docena", cantidad: 40, stockMinimo: 25, costoUnitario: 0.9, proveedor: "Tortillería La Esperanza", ubicacion: "Estante A", caducidad: fechaRelativa(2) },
    { nombre: "Cebolla blanca", categoria: "Verduras y frutas", unidad: "lb", cantidad: 22, stockMinimo: 10, costoUnitario: 0.65, proveedor: "Mercado central", ubicacion: "Estante B", caducidad: "" },
    { nombre: "Tomate", categoria: "Verduras y frutas", unidad: "lb", cantidad: 9, stockMinimo: 12, costoUnitario: 0.8, proveedor: "Mercado central", ubicacion: "Estante B", caducidad: fechaRelativa(6) },
    { nombre: "Cilantro", categoria: "Verduras y frutas", unidad: "bolsa", cantidad: 0, stockMinimo: 4, costoUnitario: 1.1, proveedor: "Mercado central", ubicacion: "Refrigerador", caducidad: "" },
    { nombre: "Limón", categoria: "Verduras y frutas", unidad: "lb", cantidad: 15, stockMinimo: 6, costoUnitario: 0.7, proveedor: "Mercado central", ubicacion: "Estante B", caducidad: "" },
    { nombre: "Queso duro rallado", categoria: "Lácteos", unidad: "kg", cantidad: 4, stockMinimo: 3, costoUnitario: 7.2, proveedor: "Lácteos La Vaquita", ubicacion: "Refrigerador", caducidad: fechaRelativa(12) },
    { nombre: "Crema", categoria: "Lácteos", unidad: "L", cantidad: 5, stockMinimo: 4, costoUnitario: 3.5, proveedor: "Lácteos La Vaquita", ubicacion: "Refrigerador", caducidad: fechaRelativa(-1) },
    { nombre: "Salsa roja casera", categoria: "Salsas y especias", unidad: "L", cantidad: 7, stockMinimo: 5, costoUnitario: 2.25, proveedor: "Preparación propia", ubicacion: "Refrigerador", caducidad: fechaRelativa(8) },
    { nombre: "Aceite vegetal", categoria: "Abarrotes", unidad: "L", cantidad: 14, stockMinimo: 6, costoUnitario: 2.95, proveedor: "Distribuidora Rivas", ubicacion: "Estante A", caducidad: "" },
    { nombre: "Refresco en lata", categoria: "Bebidas", unidad: "caja", cantidad: 8, stockMinimo: 5, costoUnitario: 9.5, proveedor: "Distribuidora Rivas", ubicacion: "Bodega", caducidad: "" },
    { nombre: "Vaso desechable 12 oz", categoria: "Desechables", unidad: "bolsa", cantidad: 3, stockMinimo: 5, costoUnitario: 2.4, proveedor: "Distribuidora Rivas", ubicacion: "Bodega", caducidad: "" }
  ]);
}

export default sembrarInventario;
