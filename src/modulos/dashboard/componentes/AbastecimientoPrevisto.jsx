export default function AbastecimientoPrevisto({
  ingredientes,
  hayInventario
}) {
  return (
    <article className="app-panel h-100 p-3 p-md-4">
      <h2 className="h5 fw-semibold mb-1">Abastecimiento previsto</h2>
      <p className="small text-body-secondary">
        Productos que necesitan reposición según las existencias actuales.
      </p>
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
            {ingredientes.length ? (
              ingredientes.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.nombre}</th>
                  <td>
                    {item.cantidad} {item.unidad}
                  </td>
                  <td>{Number(item.cantidad) === 0 ? "Agotado" : "Reponer"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>
                  {hayInventario
                    ? "No hay productos que necesiten reposición."
                    : "No hay existencias registradas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
