import { useMemo } from "react";

function AlertasOperativas() {
  const alertas = useMemo(() => {
    const inventario = DB.getAll("inventario");
    const mermas = DB.getAll("mermas");

    const resultado = [];

    // Revisar productos agotados o por debajo del mínimo.
    inventario.forEach(producto => {
      const cantidad = Number(producto.cantidad);
      const minimo = Number(producto.stockMinimo);

      if (
        !Number.isFinite(cantidad) ||
        !Number.isFinite(minimo) ||
        cantidad < 0 ||
        minimo < 0
      ) {
        return;
      }

      if (cantidad <= 0) {
        resultado.push({
          tipo: "agotado",
          titulo: "Inventario agotado",
          mensaje: `${producto.nombre}: existencias agotadas.`
        });
      } else if (minimo > 0 && cantidad <= minimo) {
        resultado.push({
          tipo: "bajo",
          titulo: "Inventario bajo",
          mensaje: `${producto.nombre}: quedan ${cantidad} ${producto.unidad || "unidades"}. Mínimo: ${minimo}.`
        });
      }
    });

    // Revisar mermas registradas durante los últimos siete días.
    const hoy = new Date();
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() - 6);
    fechaLimite.setHours(0, 0, 0, 0);

    const mermasRecientes = mermas.filter(merma => {
      if (!merma.fecha) return false;

      const fecha = new Date(`${merma.fecha.slice(0, 10)}T00:00:00`);

      const cantidad = Number(merma.cantidad);

      return (
        !Number.isNaN(fecha.getTime()) &&
        fecha >= fechaLimite &&
        fecha <= hoy &&
        Number.isFinite(cantidad) &&
        cantidad > 0
      );
    });

    if (mermasRecientes.length > 0) {
      resultado.push({
        tipo: "merma",
        titulo: "Merma registrada",
        mensaje: `${mermasRecientes.length} registro(s) de desperdicio en los últimos siete días.`
      });
    }

    return resultado;
  }, []);

  return (
    <article className="app-panel dashboard-alertas h-100 p-3 p-md-4">

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">

        <h2 className="h5 fw-semibold mb-0">
          Requiere atención
        </h2>

        <span className="badge rounded-pill app-estado app-estado-atencion">
          {alertas.length} {alertas.length === 1 ? "alerta" : "alertas"}
        </span>

      </div>

      {alertas.length === 0 ? (
        <p className="small text-body-secondary mb-0">
          No hay situaciones que requieran atención actualmente.
        </p>
      ) : (

        <ul className="list-unstyled mb-0">

          {alertas.map((alerta, indice) => (
            <li className="dashboard-alerta" key={`${alerta.tipo}-${indice}`}>

              <strong>{alerta.titulo}</strong>

              <p className="small text-body-secondary mb-0">
                {alerta.mensaje}
              </p>

            </li>
          ))}

        </ul>

      )}

    </article>
  );
}

export default AlertasOperativas;