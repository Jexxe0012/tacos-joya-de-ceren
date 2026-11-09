import GraficaBarras from "../../../components/GraficaBarras.jsx";
export default function GraficaVentas({ dias }) {
  return (
    <article className="app-panel h-100 p-3 p-md-4">
      <h2 className="h5 fw-semibold mb-1">Ventas por día</h2>
      <p className="small text-body-secondary">
        Unidades registradas en los últimos 7 días. Se excluyen los ejemplos.
      </p>
      <GraficaBarras
        titulo="Ventas diarias de los últimos siete días"
        etiquetas={dias.map((dia) => dia.etiqueta)}
        valores={dias.map((dia) => dia.cantidad)}
      />
    </article>
  );
}
