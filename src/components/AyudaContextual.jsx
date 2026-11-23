import DialogoConsulta from "./DialogoConsulta.jsx";

export default function AyudaContextual({ tema, encabezado, children, className = "" }) {
  return (
    <div className={className}>
      <div className="app-ayuda-encabezado">
        {encabezado}
        <DialogoConsulta
          titulo={tema}
          textoBoton="?"
          etiquetaBoton={`Ayuda: ${tema}`}
          claseBoton="app-ayuda-boton"
        >
          {children}
        </DialogoConsulta>
      </div>
    </div>
  );
}
