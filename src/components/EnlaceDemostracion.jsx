import { enlaceModoDatos, esModoDemostracion } from "../services/modoDatos.js";

export default function EnlaceDemostracion({ className }) {
  const demostracion = esModoDemostracion();
  return (
    <a
      className={className}
      href={enlaceModoDatos(!demostracion)}
      target={demostracion ? undefined : "_blank"}
      rel={demostracion ? undefined : "noopener"}
    >
      {demostracion ? "Volver a mis datos" : "Abrir demostración"}
    </a>
  );
}
