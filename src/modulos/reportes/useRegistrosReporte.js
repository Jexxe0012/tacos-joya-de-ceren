import { useCallback, useMemo } from "react";
import { useColeccion } from "../../hooks/useColeccion.js";

export function useRegistrosReporte() {
  const recetas = useColeccion("recetas");
  const inventario = useColeccion("inventario");
  const ventas = useColeccion("ventas");
  const mermas = useColeccion("mermas");
  const movimientos = useColeccion("movimientos");
  const vinculos = useColeccion("vinculosInsumos");
  const registros = useMemo(() => ({
    recetas: recetas.registros, inventario: inventario.registros, ventas: ventas.registros,
    mermas: mermas.registros, movimientos: movimientos.registros, vinculosInsumos: vinculos.registros
  }), [recetas.registros, inventario.registros, ventas.registros, mermas.registros, movimientos.registros, vinculos.registros]);
  const recargar = useCallback(() => {
    recetas.recargar(); inventario.recargar(); ventas.recargar();
    mermas.recargar(); movimientos.recargar(); vinculos.recargar();
  }, [recetas.recargar, inventario.recargar, ventas.recargar, mermas.recargar, movimientos.recargar, vinculos.recargar]);
  const problemas = [recetas.problema, inventario.problema, ventas.problema, mermas.problema, movimientos.problema, vinculos.problema].filter(Boolean);
  return { registros, recargar, problemas };
}
