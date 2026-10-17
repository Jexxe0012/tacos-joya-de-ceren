/**
 * Mermas — registro de desperdicio y descuento de existencias.
 *
 * Trabaja sobre dos colecciones que ya existen en el proyecto:
 *   - "mermas": el mismo registro que crea el modal de js/turnos.js,
 *     asi que el historial de esta pantalla y el de Turnos son uno solo.
 *   - "inventario" / "movimientos": la merma descuenta la existencia del
 *     producto y deja el rastro como una salida, igual que js/inventario.js.
 */

const sesion = Guard.getSesion();

// Mismo motivo que usa el modal de movimientos de inventario para una salida
// por desperdicio. Mantenerlo igual permite filtrar el historial por motivo.
const MOTIVO_SALIDA_MERMA = 'Merma o desperdicio';

// Dias que abarca el indicador "merma semanal" de las tarjetas de arriba.
const DIAS_SEMANA = 7;

const form = document.getElementById('form-merma');
const selectIngrediente = document.getElementById('input-ingrediente');
const inputCantidad = document.getElementById('input-cantidad');
const inputMotivo = document.getElementById('input-motivo');
const inputResponsable = document.getElementById('input-responsable');
const inputObservaciones = document.getElementById('input-observaciones');
const tablaHistorial = document.getElementById('tabla-historial');

const decimales = new Intl.NumberFormat('es-SV', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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

function renderTodo() {
  renderIndicadores();
  renderHistorial();
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

function alGuardarMerma(evento) {
  evento.preventDefault();

  const producto = DB.getById('inventario', selectIngrediente.value);
  const cantidad = Number(inputCantidad.value);
  const motivo = inputMotivo.value.trim();
  const responsable = inputResponsable.value.trim();
  const observaciones = inputObservaciones.value.trim();

  if (!producto) {
    avisar('Elegí el ingrediente que se perdió.');
    return;
  }
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    avisar('Escribí una cantidad mayor que cero.');
    return;
  }
  if (!motivo || !responsable) {
    avisar('El motivo y el responsable son obligatorios.');
    return;
  }

  const existenciaAnterior = Number(producto.cantidad);
  if (cantidad > existenciaAnterior) {
    avisar(`No podés dar de baja ${decimales.format(cantidad)} ${producto.unidad}: solo hay ${decimales.format(existenciaAnterior)}.`);
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
  DB.create('mermas', {
    producto: producto.nombre,
    productoId: producto.id,
    unidad: producto.unidad,
    cantidad,
    fecha: ahora.split('T')[0],
    motivo,
    responsable,
    observaciones,
    reportadoPor: sesion.id
  });

  form.reset();
  poblarSelectIngrediente();
  inputResponsable.value = sesion.nombre || '';
  renderTodo();
}

function avisar(mensaje) {
  // La pantalla no tiene una caja de mensajes propia; se mantiene el aviso
  // del navegador que ya usaba esta pagina.
  alert(mensaje);
}

/* ============================================
   Indicadores
   ============================================ */

/** Mermas de los ultimos DIAS_SEMANA dias, de la mas nueva a la mas vieja. */
function mermasDeLaSemana(mermas) {
  const desde = new Date();
  desde.setDate(desde.getDate() - DIAS_SEMANA);
  const limite = desde.toISOString().split('T')[0];
  return mermas.filter(merma => String(merma.fecha) >= limite);
}

function renderIndicadores() {
  const semana = mermasDeLaSemana(DB.getAll('mermas'));

  const totalKg = semana.reduce((suma, merma) => suma + Number(merma.cantidad || 0), 0);
  document.getElementById('txt-merma-semanal').textContent = `${decimales.format(totalKg)} kg`;

  // El costo sale del costo unitario que el modulo de inventario ya guarda.
  const costo = semana.reduce((suma, merma) => {
    const producto = merma.productoId ? DB.getById('inventario', merma.productoId) : null;
    return suma + Number(merma.cantidad || 0) * Number(producto?.costoUnitario || 0);
  }, 0);
  document.getElementById('txt-costo-estimado').textContent = moneda.format(costo);

  // Insumo critico: el que mas kilos acumula en la semana.
  const porInsumo = new Map();
  semana.forEach(merma => {
    const clave = merma.producto || 'Sin nombre';
    porInsumo.set(clave, (porInsumo.get(clave) || 0) + Number(merma.cantidad || 0));
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

function buildFilaMerma(merma) {
  const fila = document.createElement('tr');

  // textContent y no innerHTML: el motivo y el responsable son texto libre.
  [merma.fecha, merma.producto, `${merma.cantidad} ${merma.unidad || ''}`.trim()]
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
