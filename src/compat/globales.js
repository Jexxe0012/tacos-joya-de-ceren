/**
 * globales — adaptador temporal entre la app React y el código aún no migrado.
 *
 * Los módulos clásicos y los componentes que Josué entregó antes de la
 * entrada única esperan encontrar DB, UI, Valida, Guard, Swal y Chart en
 * window. Este archivo los publica una sola vez al arrancar, construidos
 * sobre los servicios importados, para que no haya dos implementaciones
 * de lo mismo ni dos copias de las librerías.
 *
 * Es un adaptador identificado, no la arquitectura final: antes de cerrar
 * la migración cada módulo importará lo que usa y este archivo se retira.
 */

import Chart from "chart.js/auto";
import Swal from "sweetalert2";
import { aviso, confirmar, error, exito } from "../services/dialogos.js";
import { borrarSesion, leerSesion, rutaInicio } from "../services/authService.js";
import { db } from "../services/storage.js";
import {
  equivalenciaAutomatica,
  listarInsumos,
  normalizarUnidad,
  obtenerInsumo,
  resolverVinculo
} from "../services/insumosService.js";
import { fechaHoyLocal } from "../utils/fechas.js";
import { Valida } from "./validacionDom.js";

/**
 * Guard compatible, pero sin redirigir con window.location: en la app de
 * una sola página las rutas protegidas ya deciden quién pasa. Aquí las
 * funciones solo responden la pregunta, y la navegación se hace por el
 * hash para no recargar la aplicación.
 */
const Guard = {
  getSesion: leerSesion,

  requireLogin() {
    return leerSesion() !== null;
  },

  requireRole(rolEsperado) {
    return leerSesion()?.rol === rolEsperado;
  },

  irAlInicio() {
    const sesion = leerSesion();
    window.location.hash = `#${sesion ? rutaInicio(sesion.rol) : "/login"}`;
  },

  logout() {
    borrarSesion();
    window.location.hash = "#/login";
  }
};

/** UI compatible: las mismas funciones del objeto global de la fase 2. */
const UI = { exito, error, aviso, confirmar, fechaHoy: fechaHoyLocal };

/** Los dos globales del catálogo de insumos, ahora sobre insumosService. */
const CatalogoInsumos = { listar: listarInsumos, obtener: obtenerInsumo };
const InsumosInventario = {
  unidad: normalizarUnidad,
  equivalenciaAutomatica,
  resolver: resolverVinculo
};

let instalados = false;

export function instalarGlobales() {
  if (instalados) return;
  instalados = true;

  // Las librerías también se publican: los módulos clásicos las buscan en
  // window, y así se usa la copia de npm en vez de una del CDN.
  window.Swal = Swal;
  window.Chart = Chart;

  window.DB = db;
  window.UI = UI;
  window.Valida = Valida;
  window.Guard = Guard;
  window.CatalogoInsumos = CatalogoInsumos;
  window.InsumosInventario = InsumosInventario;
}

export default instalarGlobales;
