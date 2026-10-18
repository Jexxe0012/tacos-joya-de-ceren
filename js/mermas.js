/**
 * Mermas — registro de desperdicio y descuento de existencias.
 *
 * Trabaja sobre dos colecciones que ya existen en el proyecto:
 *   - "mermas": el mismo registro que crea el modal de js/turnos.js,
 *     asi que el historial de esta pantalla y el de Turnos son uno solo.
 *   - "inventario" / "movimientos": la merma descuenta la existencia del
 *     producto y deja el rastro como una salida, igual que js/inventario.js.
 *
 * Mensajes: todo pasa por UI.* (js/ui.js). Validacion: Valida.* (js/validacion.js).
 */

const sesion = Guard.getSesion();

// Mismo motivo que usa el modal de movimientos de inventario para una salida
// por desperdicio. Mantenerlo igual permite filtrar el historial por motivo.
const MOTIVO_SALIDA_MERMA = 'Merma o desperdicio';

// Dias que abarca el indicador "merma semanal" de las tarjetas de arriba.
const DIAS_SEMANA = 7;

// Reglas del formulario.
const MOTIVO_OTRO = 'Otro';
const MAX_OBSERVACIONES = 200;
const MIN_RESPONSABLE = 3;
const MAX_RESPONSABLE = 60;
const PATRON_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/;
// Mismas unidades que en Inventario solo aceptan enteros.
const UNIDADES_ENTERAS = ['unidad', 'docena', 'caja', 'bolsa'];

const form = document.getElementById('form-merma');
const botonGuardar = form.querySelector('button[type="submit"]');
const selectIngrediente = document.getElementById('input-ingrediente');
const inputCantidad = document.getElementById('input-cantidad');
const selectMotivo = document.getElementById('input-motivo');
const inputResponsable = document.getElementById('input-responsable');
const inputObservaciones = document.getElementById('input-observaciones');
const tablaHistorial = document.getElementById('tabla-historial');

const decimales = new Intl.NumberFormat('es-SV', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const numeroLegible = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 2 });
const moneda = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });

/* ============================================
   Arranque
   ============================================ */

poblarSelectIngrediente();
// El responsable se propone con el nombre de quien tiene la sesion abierta,
// pero queda editable por si registra la merma de un companero.
inputResponsable.value = sesion.nombre || '';
renderTodo();

form.addEventListener('submit', alGuardarMerma);
activarValidacionPorCampo();

function renderTodo() {
  renderIndicadores();
  renderHistorial();
}

/* ============================================
   Utilidades
   ============================================ */

/** Quita tildes y mayusculas para comparar textos. */
function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Fecha local AAAA-MM-DD de cualquier Date (nunca UTC). */
function fechaLocal(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Convierte una cantidad guardada a numero. Los registros viejos pueden traer
 * "5 kg" como texto: se toma el 5. Si no hay ningun numero, vale 0 y asi el
 * indicador nunca muestra NaN.
 */
function numeroSeguro(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const coincidencia = String(valor ?? '').replace(',', '.').match(/\d+(\.\d+)?/);
  const numero = coincidencia ? Number(coincidencia[0]) : NaN;
  return Number.isFinite(numero) ? numero : 0;
}

function unidadEsEntera(producto) {
  return Boolean(producto) && UNIDADES_ENTERAS.includes(normalizar(producto.unidad));
}

/* ============================================
   Validacion por campo
   Cada funcion marca o limpia el campo y devuelve true si esta bien.
   ============================================ */

function resolver(campo, mensaje) {
  if (mensaje) {
    Valida.marcar(campo, mensaje);
    return false;
  }
  Valida.limpiar(campo);
  return true;
}

function validarIngrediente() {
  return resolver(selectIngrediente, selectIngrediente.value ? '' : 'Elegí el ingrediente que se perdió.');
}

function validarCantidad() {
  const producto = DB.getById('inventario', selectIngrediente.value);
  const texto = inputCantidad.value.trim();

  let mensaje = '';
  if (texto === '') {
    mensaje = 'Escribí la cantidad perdida.';
  } else {
    mensaje = Valida.numero(texto, { min: 0.1, entero: unidadEsEntera(producto) });
  }

  // Regla de negocio que cruza datos: no se puede dar de baja mas de lo que hay.
  if (!mensaje && producto) {
    const existencia = Number(producto.cantidad);
    if (Number(texto) > existencia) {
      mensaje = `Solo hay ${numeroLegible.format(existencia)} ${producto.unidad} de ${producto.nombre}.`;
    }
  }
  return resolver(inputCantidad, mensaje);
}

function validarMotivo() {
  return resolver(selectMotivo, selectMotivo.value ? '' : 'Elegí un motivo de la lista.');
}

function validarResponsable() {
  const mensaje = Valida.texto(inputResponsable.value.trim(), {
    min: MIN_RESPONSABLE,
    max: MAX_RESPONSABLE,
    patron: PATRON_NOMBRE,
    mensaje: `Solo letras y espacios, de ${MIN_RESPONSABLE} a ${MAX_RESPONSABLE} caracteres.`
  });
  return resolver(inputResponsable, mensaje);
}

function validarObservaciones() {
  const texto = inputObservaciones.value.trim();
  let mensaje = '';
  if (texto.length > MAX_OBSERVACIONES) {
    mensaje = `Máximo ${MAX_OBSERVACIONES} caracteres (llevás ${texto.length}).`;
  } else if (selectMotivo.value === MOTIVO_OTRO && texto === '') {
    mensaje = 'Si el motivo es "Otro", explicalo en las observaciones.';
  }
  return resolver(inputObservaciones, mensaje);
}

/** Campos en el orden en que aparecen en pantalla. */
const CAMPOS = [
  [selectIngrediente, validarIngrediente],
  [inputCantidad, validarCantidad],
  [selectMotivo, validarMotivo],
  [inputResponsable, validarResponsable],
  [inputObservaciones, validarObservaciones]
];

function activarValidacionPorCampo() {
  CAMPOS.forEach(([campo, validar]) => {
    // Al salir del campo: limpia espacios sobrantes y valida.
    campo.addEventListener('blur', () => {
      if (campo.tagName === 'INPUT') {
        campo.value = campo.value.trim().replace(/\s{2,}/g, ' ');
      }
      validar();
    });
    // Mientras escribe: solo revalida si el campo ya tenia error.
    const revalidarSiTieneError = () => {
      if (campo.classList.contains('is-invalid')) validar();
    };
    campo.addEventListener('input', revalidarSiTieneError);
    campo.addEventListener('change', revalidarSiTieneError);
  });

  // Dependencias entre campos.
  selectIngrediente.addEventListener('change', () => {
    if (inputCantidad.value.trim() !== '' || inputCantidad.classList.contains('is-invalid')) validarCantidad();
  });
  selectMotivo.addEventListener('change', () => {
    if (inputObservaciones.value.trim() !== '' || inputObservaciones.classList.contains('is-invalid')) validarObservaciones();
  });
}

/* ============================================
   Formulario
   ============================================ */

function poblarSelectIngrediente() {
  selectIngrediente.innerHTML = '<option value="">— Seleccioná —</option>';

  DB.getAll('inventario')
    .slice()
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre))
    .forEach(producto => {
      const opcion = document.createElement('option');
      opcion.value = producto.id;
      opcion.textContent = `${producto.categoria} · ${producto.nombre}`;
      selectIngrediente.appendChild(opcion);
    });
}

async function alGuardarMerma(evento) {
  evento.preventDefault();

  // Se validan todos los campos (sin cortar en el primero) para marcar cada error.
  const resultados = CAMPOS.map(([campo, validar]) => [campo, validar()]);
  const primerError = resultados.find(([, ok]) => !ok);
  if (primerError) {
    primerError[0].focus();
    return;
  }

  const producto = DB.getById('inventario', selectIngrediente.value);
  const cantidad = Number(inputCantidad.value);
  const motivo = selectMotivo.value;
  const responsable = inputResponsable.value.trim();
  const observaciones = inputObservaciones.value.trim();
  const existenciaAnterior = Number(producto.cantidad);

  // Bloquea el boton mientras dura el dialogo y el guardado (evita doble envio).
  const reactivar = Valida.bloquearEnvio(botonGuardar);
  try {
    // La merma modifica el inventario, asi que se pide confirmacion.
    const confirmado = await UI.confirmar({
      titulo: '¿Registrar la merma?',
      texto: `Se descontarán ${numeroLegible.format(cantidad)} ${producto.unidad} de ${producto.nombre} del inventario. ¿Registrar la merma?`,
      boton: 'Sí, registrar',
      peligro: false
    });
    if (!confirmado) return;

    // Se vuelve a leer por si la existencia cambio mientras estaba el dialogo.
    const actual = DB.getById('inventario', producto.id);
    if (!actual || cantidad > Number(actual.cantidad)) {
      Valida.marcar(inputCantidad, 'La existencia cambió. Revisá la cantidad.');
      UI.error('No se pudo registrar', 'La existencia del producto cambió mientras confirmabas.');
      return;
    }

    // Se redondea a 2 decimales para que las restas no arrastren colas binarias.
    const existenciaNueva = Number((existenciaAnterior - cantidad).toFixed(2));
    const ahora = new Date().toISOString();

    DB.update('inventario', producto.id, {
      cantidad: existenciaNueva,
      actualizadoEn: ahora
    });

    DB.create('movimientos', {
      productoId: producto.id,
      producto: producto.nombre,
      tipo: 'salida',
      cantidad,
      existenciaAnterior,
      existenciaNueva,
      motivo: MOTIVO_SALIDA_MERMA,
      nota: observaciones,
      usuario: sesion.nombre,
      fecha: ahora
    });

    // Mismos campos que crea el modal de Turnos, mas los propios de esta pantalla.
    // La fecha es la local del dia (UI.fechaHoy), no la UTC.
    DB.create('mermas', {
      producto: producto.nombre,
      productoId: producto.id,
      unidad: producto.unidad,
      cantidad,
      fecha: UI.fechaHoy(),
      motivo,
      responsable,
      observaciones,
      reportadoPor: sesion.id
    });

    form.reset();
    CAMPOS.forEach(([campo]) => Valida.limpiar(campo));
    poblarSelectIngrediente();
    inputResponsable.value = sesion.nombre || '';
    renderTodo();

    UI.exito('Merma registrada', `Se descontaron ${numeroLegible.format(cantidad)} ${producto.unidad} de ${producto.nombre}.`);
  } catch (error) {
    console.error('Error al registrar la merma:', error);
    UI.error('No se pudo registrar', 'Ocurrió un problema al guardar. Intentá de nuevo.');
  } finally {
    reactivar();
  }
}

/* ============================================
   Indicadores
   ============================================ */

/** Mermas de los ultimos DIAS_SEMANA dias (fecha local), de la mas nueva a la mas vieja. */
function mermasDeLaSemana(mermas) {
  const desde = new Date();
  desde.setDate(desde.getDate() - DIAS_SEMANA);
  const limite = fechaLocal(desde);
  return mermas.filter(merma => String(merma.fecha) >= limite);
}

function renderIndicadores() {
  const semana = mermasDeLaSemana(DB.getAll('mermas'));

  // numeroSeguro evita NaN con datos viejos como "5 kg".
  const totalKg = semana.reduce((suma, merma) => suma + numeroSeguro(merma.cantidad), 0);
  document.getElementById('txt-merma-semanal').textContent = `${decimales.format(totalKg)} kg`;

  // El costo sale del costo unitario que el modulo de inventario ya guarda.
  const costo = semana.reduce((suma, merma) => {
    const producto = merma.productoId ? DB.getById('inventario', merma.productoId) : null;
    return suma + numeroSeguro(merma.cantidad) * numeroSeguro(producto?.costoUnitario);
  }, 0);
  document.getElementById('txt-costo-estimado').textContent = moneda.format(costo);

  // Insumo critico: el que mas kilos acumula en la semana.
  const porInsumo = new Map();
  semana.forEach(merma => {
    const clave = merma.producto || 'Sin nombre';
    porInsumo.set(clave, (porInsumo.get(clave) || 0) + numeroSeguro(merma.cantidad));
  });
  const critico = Array.from(porInsumo).sort((a, b) => b[1] - a[1])[0];

  const txtCritico = document.getElementById('txt-insumo-critico');
  const txtRango = document.getElementById('txt-rango-insumo');
  const txtPorcentaje = document.getElementById('txt-porcentaje-limite');

  if (!critico) {
    txtCritico.textContent = 'Ninguno';
    txtRango.textContent = 'Sin mermas en los últimos 7 días.';
    txtPorcentaje.textContent = 'Sin registros esta semana.';
    return;
  }

  txtCritico.textContent = critico[0];
  txtRango.textContent = `${decimales.format(critico[1])} kg en los últimos 7 días.`;

  const porcentaje = totalKg > 0 ? Math.round(critico[1] / totalKg * 100) : 0;
  txtPorcentaje.textContent = `${porcentaje}% del total corresponde a ${critico[0]}.`;
}

/* ============================================
   Historial
   ============================================ */

function renderHistorial() {
  tablaHistorial.innerHTML = '';

  // Comparten coleccion con el modal de Turnos, asi que se ordena por fecha
  // para que los dos origenes queden intercalados correctamente.
  const mermas = DB.getAll('mermas')
    .slice()
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  if (mermas.length === 0) {
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    celda.colSpan = 4;
    celda.className = 'text-muted';
    celda.textContent = 'Todavía no hay mermas registradas.';
    fila.appendChild(celda);
    tablaHistorial.appendChild(fila);
    return;
  }

  mermas.forEach(merma => tablaHistorial.appendChild(buildFilaMerma(merma)));
}

/** Texto de la cantidad: si un registro viejo ya trae la unidad ("5 kg"), no se repite. */
function textoCantidad(merma) {
  if (typeof merma.cantidad === 'number') {
    return `${numeroLegible.format(merma.cantidad)} ${merma.unidad || ''}`.trim();
  }
  const texto = String(merma.cantidad ?? '').trim();
  if (/^[\d.,]+$/.test(texto)) return `${texto} ${merma.unidad || ''}`.trim();
  return texto || '—';
}

function buildFilaMerma(merma) {
  const fila = document.createElement('tr');

  // textContent y no innerHTML: el motivo y el responsable son texto libre.
  [merma.fecha, merma.producto, textoCantidad(merma)]
    .forEach(valor => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

  const celdaEstado = document.createElement('td');
  const etiqueta = document.createElement('span');
  etiqueta.className = 'badge bg-warning text-dark';
  etiqueta.textContent = 'Registrado';
  etiqueta.title = merma.motivo || '';
  celdaEstado.appendChild(etiqueta);
  fila.appendChild(celdaEstado);

  return fila;
}
