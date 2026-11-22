import { useId, useRef } from "react";

export default function DialogoConsulta({
  titulo,
  textoBoton,
  etiquetaBoton,
  claseBoton = "btn btn-app-secondary btn-sm mt-3",
  id,
  ancho = false,
  children
}) {
  const idTitulo = useId();
  const dialogo = useRef(null);

  return (
    <>
      <button
        type="button"
        className={claseBoton}
        aria-label={etiquetaBoton}
        aria-haspopup="dialog"
        onClick={() => dialogo.current.showModal()}
      >
        {textoBoton}
      </button>
      <dialog
        ref={dialogo}
        id={id}
        className={`app-consulta${ancho ? " app-consulta-ancha" : ""}`}
        aria-labelledby={idTitulo}
        onClick={evento => {
          if (evento.target === evento.currentTarget) dialogo.current.close();
        }}
        onKeyDown={evento => {
          // Escape conserva el cierre nativo del diálogo y evita cerrar un formulario detrás.
          if (evento.key === "Escape") evento.stopPropagation();
        }}
      >
        <header className="app-consulta-encabezado">
          <h2 className="h5 fw-semibold mb-0" id={idTitulo}>{titulo}</h2>
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar ventana"
            onClick={() => dialogo.current.close()}
          />
        </header>
        <div className="app-consulta-cuerpo" tabIndex={ancho ? 0 : undefined}>
          {children}
        </div>
      </dialog>
    </>
  );
}
