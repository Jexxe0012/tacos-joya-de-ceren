"use strict";

// Un solo catálogo para las fichas de Recetas y sus conexiones con Inventario.
const CatalogoInsumos = (() => {
  const insumos = [
    { id: "tortilla", nombre: "Tortilla de maíz", unidad: "unidad", costoUnitario: 0.06, grupoReporte: "otros" },
    { id: "res", nombre: "Carne de res", unidad: "kg", costoUnitario: 8.00, grupoReporte: "res" },
    { id: "pastor", nombre: "Carne al pastor", unidad: "kg", costoUnitario: 7.00, grupoReporte: "pastor" },
    { id: "pollo", nombre: "Pollo deshebrado", unidad: "kg", costoUnitario: 6.00, grupoReporte: "pollo" },
    { id: "chorizo", nombre: "Chorizo", unidad: "kg", costoUnitario: 6.50, grupoReporte: "otros" },
    { id: "queso", nombre: "Queso duro", unidad: "kg", costoUnitario: 11.00, grupoReporte: "queso" },
    { id: "crema", nombre: "Crema", unidad: "litro", costoUnitario: 3.80, grupoReporte: "otros" },
    { id: "frijol", nombre: "Frijol molido", unidad: "kg", costoUnitario: 2.40, grupoReporte: "otros" },
    { id: "cebolla", nombre: "Cebolla", unidad: "kg", costoUnitario: 1.20, grupoReporte: "otros" },
    { id: "cilantro", nombre: "Cilantro", unidad: "kg", costoUnitario: 2.00, grupoReporte: "otros" },
    { id: "tomate", nombre: "Tomate", unidad: "kg", costoUnitario: 1.50, grupoReporte: "otros" },
    { id: "pina", nombre: "Piña", unidad: "kg", costoUnitario: 1.80, grupoReporte: "otros" },
    { id: "aguacate", nombre: "Aguacate", unidad: "unidad", costoUnitario: 0.55, grupoReporte: "otros" },
    { id: "limon", nombre: "Limón", unidad: "unidad", costoUnitario: 0.08, grupoReporte: "otros" },
    { id: "chile", nombre: "Chile seco", unidad: "kg", costoUnitario: 7.50, grupoReporte: "otros" },
    { id: "salsa-roja", nombre: "Salsa roja de la casa", unidad: "litro", costoUnitario: 2.60, grupoReporte: "otros" },
    { id: "aceite", nombre: "Aceite", unidad: "litro", costoUnitario: 2.90, grupoReporte: "otros" },
    { id: "horchata", nombre: "Horchata en polvo", unidad: "kg", costoUnitario: 4.50, grupoReporte: "otros" },
    { id: "azucar", nombre: "Azúcar", unidad: "kg", costoUnitario: 1.10, grupoReporte: "otros" },
    { id: "vaso", nombre: "Vaso desechable", unidad: "unidad", costoUnitario: 0.07, grupoReporte: "otros" }
  ];
  return {
    listar: () => insumos.map(insumo => ({ ...insumo })),
    obtener: id => {
      const insumo = insumos.find(item => item.id === id);
      return insumo ? { ...insumo } : null;
    }
  };
})();
