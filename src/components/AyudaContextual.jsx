import { useId, useState } from "react";

export default function AyudaContextual({ tema, encabezado, children, className = "" }) {
  const id = useId();
  const [abierta, setAbierta] = useState(false);

  return (
    <div className={className}>
      <div className="app-ayuda-encabezado">
        {encabezado}
        <button
          type="button"
          className="app-ayuda-boton"
          aria-label={`Ayuda: ${tema}`}
          aria-expanded={abierta}
          aria-controls={id}
          onClick={() => setAbierta(anterior => !anterior)}
        >
          <span aria-hidden="true">?</span>
        </button>
      </div>
      <div className="app-ayuda-contenido" id={id} hidden={!abierta}>
        {children}
      </div>
    </div>
  );
}
