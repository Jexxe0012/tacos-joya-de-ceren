/**
 * ModuloPendiente — aviso de una ruta que todavía no vive en React.
 *
 * Mientras avanza la migración, la app de una sola página ya tiene todas
 * sus rutas, pero no todas sus pantallas. En vez de dejar un hueco, la
 * ruta explica qué falta y ofrece la pantalla anterior, que sigue
 * funcionando con sus datos.
 *
 * Este componente desaparece cuando el último módulo quede migrado.
 */

function ModuloPendiente({ modulo, responsable = "" }) {
  const nombre = modulo?.nombre ?? "Este módulo";
  const paginaAnterior = modulo ? `pages/${modulo.id}.html` : null;

  return (
    <>
      <section className="mb-4">
        <h1 className="h3 fw-bold mb-2">{nombre}</h1>
        <p className="text-body-secondary mb-0">
          La ruta ya existe en la aplicación React. La pantalla está en migración.
        </p>
      </section>

      <div className="app-panel p-3 p-md-4" role="status">
        <p className="mb-2">
          {responsable
            ? `${nombre} se integra en esta etapa (${responsable}).`
            : `${nombre} se integra en esta etapa.`}
        </p>
        <p className="small text-body-secondary mb-3">
          Los datos guardados no se tocan: la versión anterior y la nueva leen las mismas
          colecciones del navegador.
        </p>
        {paginaAnterior && (
          <a className="btn btn-app-secondary" href={paginaAnterior}>
            Abrir la pantalla anterior
          </a>
        )}
      </div>
    </>
  );
}

export default ModuloPendiente;
