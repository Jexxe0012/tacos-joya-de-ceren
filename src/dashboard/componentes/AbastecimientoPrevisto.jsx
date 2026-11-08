import { useMemo } from "react";

function AbastecimientoPrevisto() {

  const ingredientes = useMemo(() => {

    const inventario = DB.getAll("inventario");

    // Seleccionar productos que necesitan reposición.
    const productosCriticos = inventario.filter(producto => {

      const cantidad = Number(producto.cantidad);
      const minimo = Number(producto.stockMinimo);

      return (
        Number.isFinite(cantidad) &&
        Number.isFinite(minimo) &&
        cantidad >= 0 &&
        minimo >= 0 &&
        (
          cantidad <= 0 ||
          (minimo > 0 && cantidad <= minimo)
        )
      );

    });

    // Mostrar primero los productos agotados.
    productosCriticos.sort((a, b) => {

      const cantidadA = Number(a.cantidad);
      const cantidadB = Number(b.cantidad);

      const agotadoA = cantidadA <= 0;
      const agotadoB = cantidadB <= 0;

      if (agotadoA !== agotadoB) {
        return agotadoA ? -1 : 1;
      }

      const minimoA = Number(a.stockMinimo);
      const minimoB = Number(b.stockMinimo);

      const proporcionA = minimoA > 0
        ? cantidadA / minimoA
        : Infinity;

      const proporcionB = minimoB > 0
        ? cantidadB / minimoB
        : Infinity;

      return proporcionA - proporcionB;

    });

    return productosCriticos;

  }, []);

  return (
    <article className="app-panel h-100 p-3 p-md-4">

      <div className="mb-3">

        <h2 className="h5 fw-semibold mb-1">
          Abastecimiento previsto
        </h2>

        <p className="small text-body-secondary mb-0">
          Productos que necesitan reposición según las existencias actuales.
        </p>

      </div>

      <div className="table-responsive">

        <table className="table align-middle mb-0">

          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Existencia</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>

            {ingredientes.length === 0 ? (

              <tr>
                <td colSpan="3" className="text-center text-body-secondary py-4">
                  No hay productos que necesiten reposición.
                </td>
              </tr>

            ) : (

              ingredientes.map(producto => {

                const cantidad = Number(producto.cantidad);
                const unidad = producto.unidad || "unidades";

                const agotado = cantidad <= 0;

                return (

                  <tr key={producto.id}>

                    <td className="fw-semibold">
                      {producto.nombre}
                    </td>

                    <td>
                      {cantidad} {unidad}
                    </td>

                    <td>
                      {agotado ? "Agotado" : "Reponer"}
                    </td>

                  </tr>

                );

              })

            )}

          </tbody>

        </table>

      </div>

    </article>
  );
}

export default AbastecimientoPrevisto;