const ventasPrevistas = 162;

function consumoEsperado() {
  const formato = new Intl.NumberFormat("es-SV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });

  const catalogo = CatalogoInsumos.listar();
  const insumosPorId = new Map(catalogo.map(insumo => [insumo.id, insumo]));
  const recetas = DB.getAll("recetas").filter(receta =>
    receta.estado === "activa" &&
    receta.categoria === "taco" &&
    Number.isFinite(Number(receta.porciones)) &&
    Number(receta.porciones) > 0
  );

  if (recetas.length === 0) {
    return {
      valor: "Sin datos",
      descripcion: "Registra recetas de tacos activas.",
      nota: "No hay recetas disponibles para calcular el consumo.",
      insumos: []
    };
  }

  const basePorReceta = Math.floor(ventasPrevistas / recetas.length);
  const sobrantes = ventasPrevistas % recetas.length;
  const cantidades = new Map();

  recetas.forEach((receta, indice) => {
    const tacosAsignados = basePorReceta + (indice < sobrantes ? 1 : 0);
    const factor = tacosAsignados / Number(receta.porciones);

    (receta.ingredientes || []).forEach(ingrediente => {
      const insumo = insumosPorId.get(ingrediente.insumoId);
      const cantidad = Number(ingrediente.cantidad);

      if (!insumo || !Number.isFinite(cantidad) || cantidad <= 0) return;

      if (!cantidades.has(insumo.id)) {
        cantidades.set(insumo.id, {
          id: insumo.id,
          nombre: insumo.nombre,
          unidad: insumo.unidad,
          cantidad: 0
        });
      }

      cantidades.get(insumo.id).cantidad += cantidad * factor;
    });
  });

  const insumos = [...cantidades.values()];
  const totalKg = insumos
    .filter(insumo => insumo.unidad === "kg")
    .reduce((suma, insumo) => suma + insumo.cantidad, 0);

  return {
    valor: `${formato.format(totalKg)} kg`,
    descripcion: `Ingredientes medidos en kg para ${ventasPrevistas} tacos previstos.`,
    nota: `Estimación distribuida entre ${recetas.length} recetas activas. Las demás unidades se muestran por separado.`,
    insumos: insumos.map(insumo => ({
      ...insumo,
      valor: `${formato.format(insumo.cantidad)} ${insumo.unidad}`
    })),
    sinIngredientes: insumos.length === 0
  };
}

function mermaSemanal() {
  const formato = new Intl.NumberFormat("es-SV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const hoy = new Date();
  const fechaLimite = new Date(hoy);
  fechaLimite.setDate(fechaLimite.getDate() - 6);
  fechaLimite.setHours(0, 0, 0, 0);

  const mermas = DB.getAll("mermas").filter(merma => {
    if (!merma.fecha) return false;
    const fecha = new Date(`${merma.fecha.slice(0, 10)}T00:00:00`);
    return !Number.isNaN(fecha.getTime()) && fecha >= fechaLimite && fecha <= hoy;
  });

  const total = mermas.reduce((suma, merma) => {
    const cantidad = Number(merma.cantidad);
    return Number.isFinite(cantidad) && cantidad > 0 ? suma + cantidad : suma;
  }, 0);

  return {
    valor: `${formato.format(total)} kg`,
    descripcion: mermas.length === 0
      ? "No hay mermas registradas en los últimos siete días."
      : `${mermas.length} registro${mermas.length === 1 ? "" : "s"} en los últimos siete días.`
  };
}

function inventarioCritico() {
  const formato = new Intl.NumberFormat("es-SV", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const inventario = DB.getAll("inventario").filter(producto => {
    const cantidad = Number(producto.cantidad);
    const minimo = Number(producto.stockMinimo);
    return Number.isFinite(cantidad) && cantidad >= 0 && Number.isFinite(minimo) && minimo >= 0;
  });

  if (inventario.length === 0) {
    return { valor: "Sin datos", descripcion: "No hay productos registrados en el inventario." };
  }

  inventario.sort((a, b) => {
    const cantidadA = Number(a.cantidad);
    const cantidadB = Number(b.cantidad);
    const minimoA = Number(a.stockMinimo);
    const minimoB = Number(b.stockMinimo);
    const agotadoA = cantidadA <= 0;
    const agotadoB = cantidadB <= 0;

    if (agotadoA !== agotadoB) return agotadoA ? -1 : 1;

    const proporcionA = minimoA > 0 ? cantidadA / minimoA : cantidadA === 0 ? 0 : Infinity;
    const proporcionB = minimoB > 0 ? cantidadB / minimoB : cantidadB === 0 ? 0 : Infinity;
    return proporcionA - proporcionB;
  });

  const producto = inventario[0];
  const cantidad = Number(producto.cantidad);
  const minimo = Number(producto.stockMinimo);
  const unidad = producto.unidad || "unidades";
  let descripcion;

  if (cantidad <= 0) {
    descripcion = "Existencias agotadas. Revisa el abastecimiento.";
  } else if (minimo > 0 && cantidad <= minimo) {
    descripcion = `Stock crítico: ${formato.format(cantidad)} ${unidad}. Mínimo: ${formato.format(minimo)} ${unidad}.`;
  } else {
    descripcion = `Menor nivel de existencias: ${formato.format(cantidad)} ${unidad}.`;
  }

  return { valor: producto.nombre || "Producto sin nombre", descripcion };
}

export function obtenerIndicadoresDashboard() {
  return {
    ventas: {
      valor: String(ventasPrevistas),
      descripcion: "Tacos para hoy"
    },
    consumo: consumoEsperado(),
    merma: mermaSemanal(),
    inventario: inventarioCritico()
  };
}
