import { moneda } from "../../modulos/ventas/ventasService.js";
export default function PedidosActivos({ pedidos }) {
  return (
    <article className="app-panel h-100 p-3 p-md-4">
      <h2 className="h5 fw-semibold mb-1">Pedidos de hoy</h2>
      <p className="small text-body-secondary">
        Últimos cinco pedidos registrados, sin incluir ejemplos.
      </p>
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>Productos</th>
              <th>Hora</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length ? (
              pedidos.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.productos.join(", ")}</th>
                  <td>{item.hora}</td>
                  <td>{moneda(item.total)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>Sin pedidos registrados hoy.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
