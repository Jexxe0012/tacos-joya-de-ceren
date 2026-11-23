/**
 * Modal — ventana sobre la pantalla, con el diseño de Bootstrap.
 *
 * Se dibuja desde el estado: existe mientras "abierto" sea verdadero y
 * desaparece cuando deja de serlo. No usa el objeto bootstrap.Modal,
 * que abre y cierra por su cuenta y obliga a mantener dos verdades: la
 * del componente y la de la librería.
 *
 * Hace lo mismo que hacía aquella: cierra con Escape y con el fondo,
 * bloquea el desplazamiento de la página, pone el foco dentro al abrir
 * y lo devuelve al cerrar.
 *
 * Importante: "children" tiene que ser el .modal-body y nada más, y los
 * botones van en "pie". El diálogo es scrollable, y Bootstrap solo hace
 * scroll del cuerpo cuando este es hijo directo de .modal-content: si se
 * envuelve el cuerpo y el pie en otro elemento, el pie queda recortado
 * fuera del modal y no se puede pulsar. Un formulario largo pone la
 * clase modal-body en el propio <form> y su botón de envío usa el
 * atributo form="<id>" desde el pie.
 */

import { useEffect, useRef } from "react";

function Modal({
  abierto,
  titulo,
  alCerrar,
  children,
  pie,
  tamano = "modal-lg",
  idTitulo = "titulo-modal",
  enfocarAlAbrir
}) {
  const dialogo = useRef(null);
  const focoAnterior = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;

    // De dónde venía el foco, para devolverlo al cerrar.
    focoAnterior.current = document.activeElement;
    document.body.classList.add("modal-open");

    const alTeclear = evento => {
      if (evento.key === "Escape") alCerrar?.();
    };
    document.addEventListener("keydown", alTeclear);

    // El foco entra en el campo indicado o, si no, en el propio diálogo.
    const destino = enfocarAlAbrir?.current ?? dialogo.current;
    destino?.focus();

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.classList.remove("modal-open");
      focoAnterior.current?.focus?.();
    };
  }, [abierto, alCerrar, enfocarAlAbrir]);

  if (!abierto) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog"
        aria-modal="true" aria-labelledby={idTitulo}
        onMouseDown={evento => { if (evento.target === evento.currentTarget) alCerrar?.(); }}>
        <div className={`modal-dialog ${tamano} modal-dialog-scrollable modal-dialog-centered`}>
          <div className="modal-content" ref={dialogo} tabIndex={-1}>
            <div className="modal-header">
              <h2 className="modal-title h5" id={idTitulo}>{titulo}</h2>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={alCerrar} />
            </div>
            {children}
            {pie && <div className="modal-footer">{pie}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}

export default Modal;
