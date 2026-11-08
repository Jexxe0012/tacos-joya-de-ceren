import { useMemo } from "react";

function PedidosActivos() {
  const pedidos = useMemo(() => {
    const ventas = DB.getAll("ventas").filter(venta =>
      venta.ejemplo !== true &&
      venta.pedidoId &&
      venta.fecha
    );

    const agrupados = new Map();

    ventas.forEach(venta => {
      const id = venta.pedidoId;

      if (!agrupados.has(id)) {
        agrupados.set(id, {
          id,
          hora: venta.hora || "—",
          fecha: venta.fecha,
          total: 0,
          productos: []
        });
      }

      const pedido = agrupados.get(id);

      pedido.total += Number(venta.total) || 0;

      pedido.productos.push(
        `${Number(venta.cantidad) || 0} × ${venta.recetaNombre || "Producto"}`
      );
    });

    return [...agrupados.values()]
      .sort((a, b) => {
        const fechaA = `${a.fecha} ${a.hora}`;
        const fechaB = `${b.fecha} ${b.hora}`;

        return fechaB.localeCompare(fechaA);
      })
      .slice(0, 5);

  }, []);

  const moneda = new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD"
  });

  return (
    <article className="app-panel h-100 p-3 p-md-4">

      <div className="mb-3">
        <h2 className="h5 fw-semibold mb-1">
          Pedidos activos
        </h2>

        <p className="small text-body-secondary mb-0">
          Últimos pedidos registrados en el sistema.
        </p>
      </div>

      <div className="table-responsive">
        <table className="table align-middle mb-0">

          <thead>
            <tr>
              <th>Pedido</th>
              <th>Productos</th>
              <th>Hora</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>

            {pedidos.length === 0 ? (

              <tr>
                <td colSpan="4" className="text-center text-body-secondary py-4">
                  No hay pedidos registrados.
                </td>
              </tr>

            ) : (

              pedidos.map((pedido, indice) => (
                <tr key={pedido.id}>
                  <td className="fw-semibold">
                    #{indice + 1}
                  </td>

                  <td>
                    {pedido.productos.join(", ")}
                  </td>

                  <td>
                    {pedido.hora}
                  </td>

                  <td className="fw-semibold">
                    {moneda.format(pedido.total)}
                  </td>
                </tr>
              ))

            )}

          </tbody>

        </table>
      </div>

    </article>
  );
}

export default PedidosActivos;