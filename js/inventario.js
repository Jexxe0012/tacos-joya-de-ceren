/**
 * inventario.js — Lógica del módulo Inventario.
 * Requiere: storage.js (DB), guard.js (Guard) y main.js cargados antes.
 *
 * Guarda dos colecciones en localStorage:
 *   - "inventario": los productos con su existencia, mínimo y costo.
 *   - "movimientos": el historial de entradas, salidas y ajustes.
 *
 * Muestra una vista según el rol de la sesión:
 *   - admin: gestiona productos, registra movimientos y revisa alertas.
 *   - empleado: solo consulta y busca. No modifica nada.
 */

/* ============================================
   Setup de la plantilla compartida
   ============================================ */

const sesion = Guard.getSesion();

// Guard.requireLogin() en el <head> ya rebotó a quien no tiene sesión,
// pero por defensa cortamos si esto se ejecutara sin ella.
if (!sesion) {
  throw new Error('No hay sesión activa.');
}

// main.js ya creó la navegación, la etiqueta del rol y el cierre de sesión.

/* ============================================
   Catálogos y datos de prueba
   ============================================ */

// Secciones del inventario. Son la única fuente: alimentan el select del
// formulario y los chips de filtrado, así no se desincronizan.
const CATEGORIAS = [
  'Carnes',
  'Verduras y frutas',
  'Lácteos',
  'Abarrotes',
  'Salsas y especias',
  'Bebidas',
  'Desechables'
];

// Unidades de medida típicas de una cocina.
const UNIDADES = ['kg', 'lb', 'g', 'L', 'ml', 'unidad', 'docena', 'caja', 'bolsa'];

// Motivos posibles según el tipo de movimiento.
const MOTIVOS = {
  entrada: ['Compra a proveedor', 'Devolución de cocina', 'Traslado desde otra sucursal'],
  salida: ['Consumo en cocina', 'Merma o desperdicio', 'Cortesía', 'Traslado a otra sucursal'],
  ajuste: ['Conteo físico', 'Corrección de registro']
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Margen sobre el mínimo para avisar "se va a acabar pronto" antes de
// llegar al mínimo real. 1.25 = 25% por encima del mínimo.
const MARGEN_AVISO = 1.25;

// Días de anticipación con los que se avisa una caducidad próxima.
const DIAS_AVISO_CADUCIDAD = 7;

/**
 * Siembra productos de ejemplo la primera vez que se abre el módulo.
 * DB.seed() es idempotente: si ya hay productos, no duplica nada.
 */
function seedInventarioDePrueba() {
  DB.seed('inventario', [
    { nombre: 'Carne de res para asar', categoria: 'Carnes', unidad: 'kg', cantidad: 18, stockMinimo: 10, costoUnitario: 6.75, proveedor: 'Carnicería El Novillo', ubicacion: 'Congelador 1', caducidad: fechaRelativaISO(5) },
    { nombre: 'Carne de cerdo adobada', categoria: 'Carnes', unidad: 'kg', cantidad: 6, stockMinimo: 8, costoUnitario: 5.4, proveedor: 'Carnicería El Novillo', ubicacion: 'Congelador 1', caducidad: fechaRelativaISO(3) },
    { nombre: 'Pollo deshuesado', categoria: 'Carnes', unidad: 'kg', cantidad: 12, stockMinimo: 8, costoUnitario: 4.2, proveedor: 'Avícola San Juan', ubicacion: 'Congelador 2', caducidad: fechaRelativaISO(4) },
    { nombre: 'Tortilla de maíz', categoria: 'Abarrotes', unidad: 'docena', cantidad: 40, stockMinimo: 25, costoUnitario: 0.9, proveedor: 'Tortillería La Esperanza', ubicacion: 'Estante A', caducidad: fechaRelativaISO(2) },
    { nombre: 'Cebolla blanca', categoria: 'Verduras y frutas', unidad: 'lb', cantidad: 22, stockMinimo: 10, costoUnitario: 0.65, proveedor: 'Mercado central', ubicacion: 'Estante B', caducidad: '' },
    { nombre: 'Tomate', categoria: 'Verduras y frutas', unidad: 'lb', cantidad: 9, stockMinimo: 12, costoUnitario: 0.8, proveedor: 'Mercado central', ubicacion: 'Estante B', caducidad: fechaRelativaISO(6) },
    { nombre: 'Cilantro', categoria: 'Verduras y frutas', unidad: 'bolsa', cantidad: 0, stockMinimo: 4, costoUnitario: 1.1, proveedor: 'Mercado central', ubicacion: 'Refrigerador', caducidad: '' },
    { nombre: 'Limón', categoria: 'Verduras y frutas', unidad: 'lb', cantidad: 15, stockMinimo: 6, costoUnitario: 0.7, proveedor: 'Mercado central', ubicacion: 'Estante B', caducidad: '' },
    { nombre: 'Queso duro rallado', categoria: 'Lácteos', unidad: 'kg', cantidad: 4, stockMinimo: 3, costoUnitario: 7.2, proveedor: 'Lácteos La Vaquita', ubicacion: 'Refrigerador', caducidad: fechaRelativaISO(12) },
    { nombre: 'Crema', categoria: 'Lácteos', unidad: 'L', cantidad: 5, stockMinimo: 4, costoUnitario: 3.5, proveedor: 'Lácteos La Vaquita', ubicacion: 'Refrigerador', caducidad: fechaRelativaISO(-1) },
    { nombre: 'Salsa roja casera', categoria: 'Salsas y especias', unidad: 'L', cantidad: 7, stockMinimo: 5, costoUnitario: 2.25, proveedor: 'Preparación propia', ubicacion: 'Refrigerador', caducidad: fechaRelativaISO(8) },
    { nombre: 'Aceite vegetal', categoria: 'Abarrotes', unidad: 'L', cantidad: 14, stockMinimo: 6, costoUnitario: 2.95, proveedor: 'Distribuidora Rivas', ubicacion: 'Estante A', caducidad: '' },
    { nombre: 'Refresco en lata', categoria: 'Bebidas', unidad: 'caja', cantidad: 8, stockMinimo: 5, costoUnitario: 9.5, proveedor: 'Distribuidora Rivas', ubicacion: 'Bodega', caducidad: '' },
    { nombre: 'Vaso desechable 12 oz', categoria: 'Desechables', unidad: 'bolsa', cantidad: 3, stockMinimo: 5, costoUnitario: 2.4, proveedor: 'Distribuidora Rivas', ubicacion: 'Bodega', caducidad: '' }
  ]);
}

/**
 * Devuelve la fecha ISO de hoy desplazada N días.
 * Sirve para que los datos de prueba siempre tengan caducidades
 * coherentes con el día en que se abre la página.
 */
function fechaRelativaISO(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return formatDateISO(d);
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ============================================
   Helpers de formato y de estado
   ============================================ */

/**
 * Muestra la cantidad sin decimales inútiles: 18 en vez de 18.00,
 * pero 2.5 se conserva.
 */
function formatCantidad(n) {
  return String(Number(Number(n).toFixed(2)));
}

function formatDinero(n) {
  return `$${Number(n).toFixed(2)}`;
}

/**
 * Fecha corta legible. Ej: "24 sep".
 */
function formatFechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/**
 * Fecha y hora de un movimiento. Ej: "24 sep · 15:40".
 */
function formatFechaHora(isoCompleto) {
  const d = new Date(isoCompleto);
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${d.getHours()}:${m}`;
}

/**
 * Días que faltan para la caducidad. Negativo si ya venció,
 * null si el producto no maneja fecha de caducidad.
 */
function diasParaVencer(producto) {
  if (!producto.caducidad) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(`${producto.caducidad}T00:00:00`);
  return Math.round((fecha - hoy) / 86400000);
}

/**
 * Estado de existencias del producto:
 *   agotado  — no queda nada
 *   critico  — igual o por debajo del mínimo: hay que comprar ya
 *   bajo     — cerca del mínimo: conviene comprar pronto
 *   ok       — existencia suficiente
 */
function estadoStock(producto) {
  const cantidad = Number(producto.cantidad);
  const minimo = Number(producto.stockMinimo);
  if (cantidad <= 0) return 'agotado';
  if (cantidad <= minimo) return 'critico';
  if (cantidad <= minimo * MARGEN_AVISO) return 'bajo';
  return 'ok';
}

/**
 * Estado de caducidad: vencido, porVencer o null (sin fecha o lejana).
 */
function estadoCaducidad(producto) {
  const dias = diasParaVencer(producto);
  if (dias === null) return null;
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_AVISO_CADUCIDAD) return 'porVencer';
  return null;
}

const ETIQUETAS_ESTADO = {
  agotado: 'Agotado',
  critico: 'Bajo el mínimo',
  bajo: 'Por reponer',
  ok: 'Suficiente'
};

/**
 * Número de urgencia para ordenar: mientras más bajo, más urgente.
 * Combina existencias y caducidad para que lo vencido no quede al final.
 */
function prioridad(producto) {
  const stock = { agotado: 0, critico: 1, bajo: 2, ok: 4 }[estadoStock(producto)];
  const caducidad = { vencido: 0, porVencer: 3 }[estadoCaducidad(producto)] ?? 5;
  return Math.min(stock, caducidad);
}

/** Valor en dinero de lo que hay de ese producto en bodega. */
function valorProducto(producto) {
  return Number(producto.cantidad) * Number(producto.costoUnitario);
}

/* ============================================
   Estado de la interfaz (filtros del admin)
   ============================================ */

const filtros = {
  texto: '',
  categoria: 'todas',
  estado: 'todos',
  orden: 'alerta'
};

/* ============================================
   Resumen, alertas, filtros y tabla
   ============================================ */

/** Redibuja toda la pantalla. Se llama después de cada cambio en los datos. */
function renderTodo() {
  renderResumen();
  renderAlertas();
  renderChips();
  renderTabla();
  renderMovimientos();
}

function renderResumen() {
  const productos = DB.getAll('inventario');

  const valorTotal = productos.reduce((suma, p) => suma + valorProducto(p), 0);
  const criticos = productos.filter(p => ['agotado', 'critico'].includes(estadoStock(p)));
  const porVencer = productos.filter(p => estadoCaducidad(p) !== null);
  const categoriasUsadas = new Set(productos.map(p => p.categoria)).size;

  document.getElementById('stat-productos').textContent = productos.length;
  document.getElementById('stat-productos-sub').textContent =
    `en ${categoriasUsadas} ${categoriasUsadas === 1 ? 'categoría' : 'categorías'}`;
  document.getElementById('stat-valor').textContent = formatDinero(valorTotal);
  document.getElementById('stat-criticos').textContent = criticos.length;
  document.getElementById('stat-vencer').textContent = porVencer.length;
}

/**
 * Tarjetas de aviso con lo que hay que atender: agotados, bajo mínimo,
 * vencidos y por vencer. Cada una ofrece registrar la entrada de una vez.
 */
function renderAlertas() {
  const lista = document.getElementById('alertas-lista');
  const contador = document.getElementById('alertas-contador');
  lista.innerHTML = '';

  const conAlerta = DB.getAll('inventario')
    .filter(p => estadoStock(p) !== 'ok' || estadoCaducidad(p) !== null)
    .sort((a, b) => prioridad(a) - prioridad(b));

  contador.textContent = conAlerta.length === 0
    ? 'todo en orden'
    : `${conAlerta.length} ${conAlerta.length === 1 ? 'producto' : 'productos'}`;

  if (conAlerta.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'inv-vacio';
    vacio.textContent = 'No hay alertas: todos los productos están por encima de su mínimo y ninguno está por vencer.';
    lista.appendChild(vacio);
    return;
  }

  conAlerta.forEach(producto => lista.appendChild(buildAlertaCard(producto)));
}

function buildAlertaCard(producto) {
  const stock = estadoStock(producto);
  const caducidad = estadoCaducidad(producto);
  // El color de la tarjeta lo manda lo más urgente entre stock y caducidad.
  const nivel = (stock === 'agotado' || stock === 'critico' || caducidad === 'vencido') ? 'urgente' : 'aviso';

  const card = document.createElement('article');
  card.className = `alerta-card ${nivel}`;

  const info = document.createElement('div');
  info.className = 'alerta-info';

  const nombre = document.createElement('p');
  nombre.className = 'alerta-nombre';
  nombre.textContent = producto.nombre;
  info.appendChild(nombre);

  const motivos = document.createElement('p');
  motivos.className = 'alerta-motivo';
  motivos.textContent = textoAlerta(producto, stock, caducidad);
  info.appendChild(motivos);

  card.appendChild(info);

  const acciones = document.createElement('div');
  acciones.className = 'alerta-acciones';

  const btnEntrada = document.createElement('button');
  btnEntrada.type = 'button';
  btnEntrada.className = 'btn-mini btn-mini-entrada';
  btnEntrada.textContent = 'Reabastecer';
  btnEntrada.addEventListener('click', () => abrirModalMovimiento(producto.id, 'entrada'));
  acciones.appendChild(btnEntrada);

  card.appendChild(acciones);
  return card;
}

/** Arma la frase de la alerta: "Quedan 6 kg, el mínimo es 8 · Vence en 3 días". */
function textoAlerta(producto, stock, caducidad) {
  const partes = [];

  if (stock === 'agotado') {
    partes.push(`Sin existencias. El mínimo es ${formatCantidad(producto.stockMinimo)} ${producto.unidad}`);
  } else if (stock === 'critico' || stock === 'bajo') {
    partes.push(`Quedan ${formatCantidad(producto.cantidad)} ${producto.unidad}, el mínimo es ${formatCantidad(producto.stockMinimo)}`);
  }

  const dias = diasParaVencer(producto);
  if (caducidad === 'vencido') {
    partes.push(`Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`);
  } else if (caducidad === 'porVencer') {
    partes.push(dias === 0 ? 'Vence hoy' : `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`);
  }

  return partes.join(' · ');
}

/** Chips de categoría: funcionan como las secciones del inventario. */
function renderChips() {
  const contenedor = document.getElementById('inv-chips');
  contenedor.innerHTML = '';

  const productos = DB.getAll('inventario');
  const opciones = [{ valor: 'todas', nombre: 'Todas' }]
    .concat(CATEGORIAS.map(c => ({ valor: c, nombre: c })));

  opciones.forEach(opcion => {
    const cuantos = opcion.valor === 'todas'
      ? productos.length
      : productos.filter(p => p.categoria === opcion.valor).length;

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'inv-chip';
    if (filtros.categoria === opcion.valor) {
      chip.classList.add('activo');
      chip.setAttribute('aria-pressed', 'true');
    } else {
      chip.setAttribute('aria-pressed', 'false');
    }

    const texto = document.createElement('span');
    texto.textContent = opcion.nombre;
    chip.appendChild(texto);

    const numero = document.createElement('span');
    numero.className = 'inv-chip-num';
    numero.textContent = cuantos;
    chip.appendChild(numero);

    chip.addEventListener('click', () => {
      filtros.categoria = opcion.valor;
      renderChips();
      renderTabla();
    });

    contenedor.appendChild(chip);
  });
}

/** Aplica buscador, categoría, estado y orden sobre los productos. */
function productosFiltrados() {
  const texto = filtros.texto.trim().toLowerCase();

  let lista = DB.getAll('inventario').filter(producto => {
    if (filtros.categoria !== 'todas' && producto.categoria !== filtros.categoria) return false;

    if (filtros.estado === 'caducidad') {
      if (estadoCaducidad(producto) === null) return false;
    } else if (filtros.estado !== 'todos') {
      if (estadoStock(producto) !== filtros.estado) return false;
    }

    if (texto) {
      const campos = [producto.nombre, producto.proveedor, producto.ubicacion, producto.categoria]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!campos.includes(texto)) return false;
    }

    return true;
  });

  const ordenes = {
    alerta: (a, b) => prioridad(a) - prioridad(b) || a.nombre.localeCompare(b.nombre),
    nombre: (a, b) => a.nombre.localeCompare(b.nombre),
    categoria: (a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre),
    valor: (a, b) => valorProducto(b) - valorProducto(a),
    // Los productos sin caducidad se van al final: se les da una fecha lejana.
    caducidad: (a, b) => (a.caducidad || '9999-12-31').localeCompare(b.caducidad || '9999-12-31')
  };

  return lista.sort(ordenes[filtros.orden]);
}

function renderTabla() {
  const cuerpo = document.getElementById('inv-tabla-body');
  const contador = document.getElementById('tabla-contador');
  cuerpo.innerHTML = '';

  const productos = productosFiltrados();
  const total = DB.getAll('inventario').length;
  contador.textContent = productos.length === total
    ? `${total} ${total === 1 ? 'producto' : 'productos'}`
    : `${productos.length} de ${total}`;

  if (productos.length === 0) {
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    celda.colSpan = 9;
    celda.className = 'inv-vacio';
    celda.textContent = total === 0
      ? 'Todavía no hay productos. Agregá el primero con "+ Nuevo producto".'
      : 'Ningún producto coincide con la búsqueda o los filtros aplicados.';
    fila.appendChild(celda);
    cuerpo.appendChild(fila);
    return;
  }

  productos.forEach(producto => cuerpo.appendChild(buildFilaProducto(producto)));
}

function buildFilaProducto(producto) {
  const stock = estadoStock(producto);
  const caducidad = estadoCaducidad(producto);

  const fila = document.createElement('tr');
  fila.className = `fila-${stock}`;

  // Producto (con proveedor y ubicación como detalle secundario)
  const tdNombre = document.createElement('td');
  const nombre = document.createElement('div');
  nombre.className = 'celda-nombre';
  nombre.textContent = producto.nombre;
  tdNombre.appendChild(nombre);
  const detalle = [producto.proveedor, producto.ubicacion].filter(Boolean).join(' · ');
  if (detalle) {
    const sub = document.createElement('div');
    sub.className = 'celda-sub';
    sub.textContent = detalle;
    tdNombre.appendChild(sub);
  }
  fila.appendChild(tdNombre);

  // Categoría
  const tdCategoria = document.createElement('td');
  tdCategoria.textContent = producto.categoria;
  fila.appendChild(tdCategoria);

  // Existencia
  const tdCantidad = document.createElement('td');
  tdCantidad.className = 'col-num celda-cantidad';
  tdCantidad.textContent = `${formatCantidad(producto.cantidad)} ${producto.unidad}`;
  fila.appendChild(tdCantidad);

  // Mínimo
  const tdMinimo = document.createElement('td');
  tdMinimo.className = 'col-num celda-suave';
  tdMinimo.textContent = formatCantidad(producto.stockMinimo);
  fila.appendChild(tdMinimo);

  // Estado
  const tdEstado = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `inv-badge inv-badge-${stock}`;
  badge.textContent = ETIQUETAS_ESTADO[stock];
  tdEstado.appendChild(badge);
  fila.appendChild(tdEstado);

  // Costo unitario
  const tdCosto = document.createElement('td');
  tdCosto.className = 'col-num celda-suave';
  tdCosto.textContent = formatDinero(producto.costoUnitario);
  fila.appendChild(tdCosto);

  // Valor de la existencia
  const tdValor = document.createElement('td');
  tdValor.className = 'col-num';
  tdValor.textContent = formatDinero(valorProducto(producto));
  fila.appendChild(tdValor);

  // Caducidad
  const tdCaducidad = document.createElement('td');
  if (!producto.caducidad) {
    tdCaducidad.className = 'celda-suave';
    tdCaducidad.textContent = '—';
  } else {
    const fecha = document.createElement('span');
    fecha.className = caducidad ? `inv-caducidad inv-caducidad-${caducidad}` : 'inv-caducidad';
    fecha.textContent = formatFechaCorta(producto.caducidad);
    const dias = diasParaVencer(producto);
    fecha.title = dias < 0 ? `Venció hace ${Math.abs(dias)} días` : `Faltan ${dias} días`;
    tdCaducidad.appendChild(fecha);
  }
  fila.appendChild(tdCaducidad);

  // Acciones rápidas
  const tdAcciones = document.createElement('td');
  tdAcciones.className = 'col-acciones';
  const acciones = document.createElement('div');
  acciones.className = 'celda-acciones';

  acciones.appendChild(botonAccion('+', 'Registrar entrada', 'btn-mini-entrada',
    () => abrirModalMovimiento(producto.id, 'entrada')));
  acciones.appendChild(botonAccion('−', 'Registrar salida', 'btn-mini-salida',
    () => abrirModalMovimiento(producto.id, 'salida')));
  acciones.appendChild(botonAccion('Editar', 'Editar producto', 'btn-mini-editar',
    () => abrirModalProducto(producto)));
  acciones.appendChild(botonAccion('Eliminar', 'Eliminar producto', 'btn-mini-eliminar',
    () => abrirModalEliminar(producto)));

  tdAcciones.appendChild(acciones);
  fila.appendChild(tdAcciones);

  return fila;
}

function botonAccion(texto, titulo, clase, alHacerClick) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = `btn-mini ${clase}`;
  boton.textContent = texto;
  boton.title = titulo;
  boton.setAttribute('aria-label', titulo);
  boton.addEventListener('click', alHacerClick);
  return boton;
}

/* ============================================
   Alta, edición y baja de productos
   ============================================ */

/** Llena los select de categoría y unidad desde los catálogos. */
function poblarSelectsProducto() {
  const selectCategoria = document.getElementById('producto-categoria');
  CATEGORIAS.forEach(categoria => {
    const opcion = document.createElement('option');
    opcion.value = categoria;
    opcion.textContent = categoria;
    selectCategoria.appendChild(opcion);
  });

  const selectUnidad = document.getElementById('producto-unidad');
  UNIDADES.forEach(unidad => {
    const opcion = document.createElement('option');
    opcion.value = unidad;
    opcion.textContent = unidad;
    selectUnidad.appendChild(opcion);
  });
}

/**
 * Abre el modal de producto. Sin argumento crea uno nuevo;
 * con un producto, lo abre en modo edición.
 */
function abrirModalProducto(producto = null) {
  const modal = document.getElementById('modal-producto');
  const titulo = document.getElementById('modal-producto-title');
  const btnEliminar = document.getElementById('btn-producto-delete');
  const mensaje = document.getElementById('producto-msg');

  mensaje.textContent = '';
  mensaje.className = 'modal-msg';

  if (producto) {
    titulo.textContent = 'Editar producto';
    btnEliminar.hidden = false;
    document.getElementById('producto-id').value = producto.id;
    document.getElementById('producto-nombre').value = producto.nombre;
    document.getElementById('producto-categoria').value = producto.categoria;
    document.getElementById('producto-unidad').value = producto.unidad;
    document.getElementById('producto-cantidad').value = producto.cantidad;
    document.getElementById('producto-minimo').value = producto.stockMinimo;
    document.getElementById('producto-costo').value = producto.costoUnitario;
    document.getElementById('producto-caducidad').value = producto.caducidad || '';
    document.getElementById('producto-proveedor').value = producto.proveedor || '';
    document.getElementById('producto-ubicacion').value = producto.ubicacion || '';
  } else {
    titulo.textContent = 'Nuevo producto';
    btnEliminar.hidden = true;
    document.getElementById('form-producto').reset();
    document.getElementById('producto-id').value = '';
  }

  modal.hidden = false;
  document.getElementById('producto-nombre').focus();
}

function setupModalProducto() {
  const modal = document.getElementById('modal-producto');
  const form = document.getElementById('form-producto');
  const mensaje = document.getElementById('producto-msg');

  document.getElementById('btn-producto-cancel').addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', evento => {
    if (evento.target === modal) modal.hidden = true;
  });

  document.getElementById('btn-producto-delete').addEventListener('click', () => {
    const producto = DB.getById('inventario', document.getElementById('producto-id').value);
    if (producto) {
      modal.hidden = true;
      abrirModalEliminar(producto);
    }
  });

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    mensaje.textContent = '';
    mensaje.className = 'modal-msg';

    const id = document.getElementById('producto-id').value;
    const nombre = document.getElementById('producto-nombre').value.trim();
    const categoria = document.getElementById('producto-categoria').value;
    const unidad = document.getElementById('producto-unidad').value;
    const cantidad = Number(document.getElementById('producto-cantidad').value);
    const stockMinimo = Number(document.getElementById('producto-minimo').value);
    const costoUnitario = Number(document.getElementById('producto-costo').value);
    const caducidad = document.getElementById('producto-caducidad').value;
    const proveedor = document.getElementById('producto-proveedor').value.trim();
    const ubicacion = document.getElementById('producto-ubicacion').value.trim();

    const error = validarProducto({ id, nombre, categoria, unidad, cantidad, stockMinimo, costoUnitario });
    if (error) {
      mensaje.textContent = error;
      mensaje.className = 'modal-msg error';
      return;
    }

    const datos = { nombre, categoria, unidad, cantidad, stockMinimo, costoUnitario, caducidad, proveedor, ubicacion };

    if (id) {
      const anterior = DB.getById('inventario', id);
      DB.update('inventario', id, { ...datos, actualizadoEn: new Date().toISOString() });
      // Si la edición cambió la existencia, queda constancia en el historial.
      if (anterior && Number(anterior.cantidad) !== cantidad) {
        registrarMovimiento({
          productoId: id,
          producto: nombre,
          tipo: 'ajuste',
          cantidad: Math.abs(cantidad - Number(anterior.cantidad)),
          existenciaAnterior: Number(anterior.cantidad),
          existenciaNueva: cantidad,
          motivo: 'Corrección de registro',
          nota: 'Existencia modificada al editar el producto'
        });
      }
    } else {
      const creado = DB.create('inventario', {
        ...datos,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString()
      });
      // El alta inicial se registra como entrada para que el historial cuadre.
      if (cantidad > 0) {
        registrarMovimiento({
          productoId: creado.id,
          producto: nombre,
          tipo: 'entrada',
          cantidad,
          existenciaAnterior: 0,
          existenciaNueva: cantidad,
          motivo: 'Compra a proveedor',
          nota: 'Existencia inicial al crear el producto'
        });
      }
    }

    modal.hidden = true;
    renderTodo();
  });
}

/** Devuelve el mensaje de error, o null si el producto es válido. */
function validarProducto({ id, nombre, categoria, unidad, cantidad, stockMinimo, costoUnitario }) {
  if (!nombre) return 'Escribí el nombre del producto.';
  if (nombre.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (!categoria) return 'Elegí la categoría del producto.';
  if (!unidad) return 'Elegí la unidad de medida.';
  if (!Number.isFinite(cantidad) || cantidad < 0) return 'La existencia debe ser un número de 0 o más.';
  if (!Number.isFinite(stockMinimo) || stockMinimo < 0) return 'El mínimo debe ser un número de 0 o más.';
  if (!Number.isFinite(costoUnitario) || costoUnitario < 0) return 'El costo por unidad debe ser un número de 0 o más.';

  // Nombres repetidos dentro de la misma categoría confunden al buscar.
  const repetido = DB.getAll('inventario').some(p =>
    String(p.id) !== String(id) &&
    p.nombre.toLowerCase() === nombre.toLowerCase() &&
    p.categoria === categoria
  );
  if (repetido) return 'Ya existe un producto con ese nombre en esa categoría.';

  return null;
}

/* ---------- Eliminar producto ---------- */

// Producto pendiente de confirmación de borrado.
let productoAEliminar = null;

function abrirModalEliminar(producto) {
  productoAEliminar = producto;
  document.getElementById('eliminar-detalle').textContent =
    `Vas a eliminar "${producto.nombre}" con ${formatCantidad(producto.cantidad)} ${producto.unidad} en existencia.`;
  document.getElementById('modal-eliminar').hidden = false;
}

function setupModalEliminar() {
  const modal = document.getElementById('modal-eliminar');

  const cerrar = () => {
    modal.hidden = true;
    productoAEliminar = null;
  };

  document.getElementById('btn-eliminar-cancel').addEventListener('click', cerrar);
  modal.addEventListener('click', evento => {
    if (evento.target === modal) cerrar();
  });

  document.getElementById('btn-eliminar-confirmar').addEventListener('click', () => {
    if (!productoAEliminar) return;
    const id = productoAEliminar.id;

    DB.remove('inventario', id);
    // Los movimientos del producto se van con él para no dejar historial huérfano.
    DB.getAll('movimientos')
      .filter(m => String(m.productoId) === String(id))
      .forEach(m => DB.remove('movimientos', m.id));

    cerrar();
    renderTodo();
  });
}

/* ============================================
   Movimientos e historial
   ============================================ */

/** Guarda el movimiento con la fecha y el usuario que lo hizo. */
function registrarMovimiento(datos) {
  DB.create('movimientos', {
    ...datos,
    usuario: sesion.nombre,
    fecha: new Date().toISOString()
  });
}

function poblarSelectMovimiento(idSeleccionado = '') {
  const select = document.getElementById('movimiento-producto');
  select.innerHTML = '<option value="">— Seleccioná —</option>';

  DB.getAll('inventario')
    .slice()
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre))
    .forEach(producto => {
      const opcion = document.createElement('option');
      opcion.value = producto.id;
      opcion.textContent = `${producto.categoria} · ${producto.nombre}`;
      select.appendChild(opcion);
    });

  select.value = idSeleccionado;
}

/** Los motivos y la etiqueta de cantidad cambian según el tipo elegido. */
function actualizarFormularioMovimiento() {
  const tipo = document.querySelector('input[name="movimiento-tipo"]:checked').value;

  const etiquetas = {
    entrada: 'Cantidad que ingresa',
    salida: 'Cantidad que sale',
    ajuste: 'Existencia real contada'
  };
  document.getElementById('movimiento-cantidad-label').textContent = etiquetas[tipo];

  const selectMotivo = document.getElementById('movimiento-motivo');
  selectMotivo.innerHTML = '';
  MOTIVOS[tipo].forEach(motivo => {
    const opcion = document.createElement('option');
    opcion.value = motivo;
    opcion.textContent = motivo;
    selectMotivo.appendChild(opcion);
  });

  mostrarExistenciaActual();
}

/** Recuerda al administrador cuánto hay antes de registrar el movimiento. */
function mostrarExistenciaActual() {
  const aviso = document.getElementById('movimiento-existencia');
  const producto = DB.getById('inventario', document.getElementById('movimiento-producto').value);

  if (!producto) {
    aviso.textContent = '';
    return;
  }
  aviso.textContent = `Existencia actual: ${formatCantidad(producto.cantidad)} ${producto.unidad} · mínimo ${formatCantidad(producto.stockMinimo)} ${producto.unidad}`;
}

function abrirModalMovimiento(productoId = '', tipo = 'entrada') {
  const modal = document.getElementById('modal-movimiento');
  const form = document.getElementById('form-movimiento');
  const mensaje = document.getElementById('movimiento-msg');

  form.reset();
  mensaje.textContent = '';
  mensaje.className = 'modal-msg';

  poblarSelectMovimiento(productoId);
  document.querySelector(`input[name="movimiento-tipo"][value="${tipo}"]`).checked = true;
  actualizarFormularioMovimiento();

  modal.hidden = false;
  document.getElementById(productoId ? 'movimiento-cantidad' : 'movimiento-producto').focus();
}

function setupModalMovimiento() {
  const modal = document.getElementById('modal-movimiento');
  const form = document.getElementById('form-movimiento');
  const mensaje = document.getElementById('movimiento-msg');

  document.getElementById('btn-movimiento-cancel').addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', evento => {
    if (evento.target === modal) modal.hidden = true;
  });

  document.getElementById('movimiento-producto').addEventListener('change', mostrarExistenciaActual);
  document.querySelectorAll('input[name="movimiento-tipo"]').forEach(radio => {
    radio.addEventListener('change', actualizarFormularioMovimiento);
  });

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    mensaje.textContent = '';
    mensaje.className = 'modal-msg';

    const producto = DB.getById('inventario', document.getElementById('movimiento-producto').value);
    const tipo = document.querySelector('input[name="movimiento-tipo"]:checked').value;
    const cantidad = Number(document.getElementById('movimiento-cantidad').value);
    const motivo = document.getElementById('movimiento-motivo').value;
    const nota = document.getElementById('movimiento-nota').value.trim();

    if (!producto) {
      mensaje.textContent = 'Elegí el producto del movimiento.';
      mensaje.className = 'modal-msg error';
      return;
    }
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      mensaje.textContent = 'Escribí una cantidad válida.';
      mensaje.className = 'modal-msg error';
      return;
    }
    if (tipo !== 'ajuste' && cantidad <= 0) {
      mensaje.textContent = 'La cantidad debe ser mayor que cero.';
      mensaje.className = 'modal-msg error';
      return;
    }

    const existenciaAnterior = Number(producto.cantidad);
    let existenciaNueva;

    if (tipo === 'entrada') {
      existenciaNueva = existenciaAnterior + cantidad;
    } else if (tipo === 'salida') {
      if (cantidad > existenciaAnterior) {
        mensaje.textContent = `No podés sacar ${formatCantidad(cantidad)} ${producto.unidad}: solo hay ${formatCantidad(existenciaAnterior)}.`;
        mensaje.className = 'modal-msg error';
        return;
      }
      existenciaNueva = existenciaAnterior - cantidad;
    } else {
      // En un ajuste la cantidad escrita es la existencia real contada.
      existenciaNueva = cantidad;
    }

    // Se redondea a 2 decimales para que las sumas no arrastren colas binarias.
    existenciaNueva = Number(existenciaNueva.toFixed(2));

    DB.update('inventario', producto.id, {
      cantidad: existenciaNueva,
      actualizadoEn: new Date().toISOString()
    });

    registrarMovimiento({
      productoId: producto.id,
      producto: producto.nombre,
      tipo,
      cantidad: tipo === 'ajuste' ? Math.abs(existenciaNueva - existenciaAnterior) : cantidad,
      existenciaAnterior,
      existenciaNueva,
      motivo,
      nota
    });

    modal.hidden = true;
    renderTodo();
  });
}

/* ---------- Historial ---------- */

const ETIQUETAS_MOVIMIENTO = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' };
const SIGNOS_MOVIMIENTO = { entrada: '+', salida: '−', ajuste: '=' };

function renderMovimientos() {
  const lista = document.getElementById('mov-lista');
  const filtro = document.getElementById('mov-filtro').value;
  lista.innerHTML = '';

  const movimientos = DB.getAll('movimientos')
    .filter(m => filtro === 'todos' || m.tipo === filtro)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 25); // El historial completo crecería demasiado en pantalla.

  if (movimientos.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'inv-vacio';
    vacio.textContent = 'Todavía no hay movimientos registrados con ese filtro.';
    lista.appendChild(vacio);
    return;
  }

  movimientos.forEach(movimiento => lista.appendChild(buildMovimientoFila(movimiento)));
}

function buildMovimientoFila(movimiento) {
  const fila = document.createElement('article');
  fila.className = `mov-fila mov-${movimiento.tipo}`;

  const marca = document.createElement('span');
  marca.className = `mov-marca mov-marca-${movimiento.tipo}`;
  marca.textContent = SIGNOS_MOVIMIENTO[movimiento.tipo];
  marca.title = ETIQUETAS_MOVIMIENTO[movimiento.tipo];
  fila.appendChild(marca);

  const info = document.createElement('div');
  info.className = 'mov-info';

  const titulo = document.createElement('p');
  titulo.className = 'mov-titulo';
  // El producto puede haber sido eliminado: se usa el nombre guardado.
  const producto = DB.getById('inventario', movimiento.productoId);
  titulo.textContent = producto ? producto.nombre : movimiento.producto;
  info.appendChild(titulo);

  const detalle = document.createElement('p');
  detalle.className = 'mov-detalle';
  const unidad = producto ? ` ${producto.unidad}` : '';
  detalle.textContent = `${ETIQUETAS_MOVIMIENTO[movimiento.tipo]} de ${formatCantidad(movimiento.cantidad)}${unidad} · ${movimiento.motivo}` +
    (movimiento.nota ? ` · ${movimiento.nota}` : '');
  info.appendChild(detalle);

  fila.appendChild(info);

  const meta = document.createElement('div');
  meta.className = 'mov-meta';

  const saldo = document.createElement('p');
  saldo.className = 'mov-saldo';
  saldo.textContent = `${formatCantidad(movimiento.existenciaAnterior)} → ${formatCantidad(movimiento.existenciaNueva)}`;
  meta.appendChild(saldo);

  const fecha = document.createElement('p');
  fecha.className = 'mov-fecha';
  fecha.textContent = `${formatFechaHora(movimiento.fecha)} · ${movimiento.usuario}`;
  meta.appendChild(fecha);

  fila.appendChild(meta);
  return fila;
}

/* ============================================
   Vista del empleado — solo consultar
   ============================================ */

// El empleado ve el inventario agrupado por sección y en un lenguaje simple:
// lo único que necesita saber es si hay, si queda poco o si ya se acabó.
const ETIQUETAS_EMPLEADO = {
  ok: 'Disponible',
  bajo: 'Queda poco',
  critico: 'Queda poco',
  agotado: 'Agotado'
};

// Los cuatro estados internos se reducen a tres para el empleado.
const RESUMEN_EMPLEADO = [
  { id: 'todos', nombre: 'Todo' },
  { id: 'ok', nombre: 'Disponible' },
  { id: 'poco', nombre: 'Queda poco' },
  { id: 'agotado', nombre: 'Agotado' }
];

const filtrosEmpleado = {
  texto: '',
  categoria: 'todas',
  estado: 'todos'
};

function setupVistaEmpleado() {
  document.getElementById('emp-buscar').addEventListener('input', evento => {
    filtrosEmpleado.texto = evento.target.value;
    renderEmpleado();
  });

  renderEmpleado();
}

/** Agrupa el estado real en las tres categorías que ve el empleado. */
function estadoEmpleado(producto) {
  const estado = estadoStock(producto);
  if (estado === 'agotado') return 'agotado';
  if (estado === 'ok') return 'ok';
  return 'poco';
}

function productosParaEmpleado() {
  const texto = filtrosEmpleado.texto.trim().toLowerCase();

  return DB.getAll('inventario').filter(producto => {
    if (filtrosEmpleado.categoria !== 'todas' && producto.categoria !== filtrosEmpleado.categoria) return false;
    if (filtrosEmpleado.estado !== 'todos' && estadoEmpleado(producto) !== filtrosEmpleado.estado) return false;

    if (texto) {
      const campos = [producto.nombre, producto.categoria, producto.ubicacion]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!campos.includes(texto)) return false;
    }

    return true;
  });
}

function renderEmpleado() {
  renderResumenEmpleado();
  renderChipsEmpleado();
  renderSeccionesEmpleado();
}

/** Contadores por disponibilidad, que además funcionan como filtro. */
function renderResumenEmpleado() {
  const contenedor = document.getElementById('emp-resumen');
  contenedor.innerHTML = '';

  const productos = DB.getAll('inventario');

  RESUMEN_EMPLEADO.forEach(opcion => {
    const cuantos = opcion.id === 'todos'
      ? productos.length
      : productos.filter(p => estadoEmpleado(p) === opcion.id).length;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = `emp-resumen-card emp-resumen-${opcion.id}`;
    const activo = filtrosEmpleado.estado === opcion.id;
    if (activo) boton.classList.add('activo');
    boton.setAttribute('aria-pressed', activo ? 'true' : 'false');

    const numero = document.createElement('span');
    numero.className = 'emp-resumen-num';
    numero.textContent = cuantos;
    boton.appendChild(numero);

    const nombre = document.createElement('span');
    nombre.className = 'emp-resumen-nombre';
    nombre.textContent = opcion.nombre;
    boton.appendChild(nombre);

    boton.addEventListener('click', () => {
      // Tocar el filtro activo lo apaga y vuelve a mostrar todo.
      filtrosEmpleado.estado = activo ? 'todos' : opcion.id;
      renderEmpleado();
    });

    contenedor.appendChild(boton);
  });
}

function renderChipsEmpleado() {
  const contenedor = document.getElementById('emp-chips');
  contenedor.innerHTML = '';

  const productos = DB.getAll('inventario');
  const opciones = [{ valor: 'todas', nombre: 'Todas las secciones' }]
    .concat(CATEGORIAS.map(categoria => ({ valor: categoria, nombre: categoria })));

  opciones.forEach(opcion => {
    const cuantos = opcion.valor === 'todas'
      ? productos.length
      : productos.filter(p => p.categoria === opcion.valor).length;

    // Una sección sin productos no le sirve de nada al empleado.
    if (cuantos === 0 && opcion.valor !== filtrosEmpleado.categoria) return;

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'inv-chip';
    const activo = filtrosEmpleado.categoria === opcion.valor;
    if (activo) chip.classList.add('activo');
    chip.setAttribute('aria-pressed', activo ? 'true' : 'false');

    const texto = document.createElement('span');
    texto.textContent = opcion.nombre;
    chip.appendChild(texto);

    const numero = document.createElement('span');
    numero.className = 'inv-chip-num';
    numero.textContent = cuantos;
    chip.appendChild(numero);

    chip.addEventListener('click', () => {
      filtrosEmpleado.categoria = opcion.valor;
      renderEmpleado();
    });

    contenedor.appendChild(chip);
  });
}

function renderSeccionesEmpleado() {
  const contenedor = document.getElementById('emp-secciones');
  const contador = document.getElementById('emp-contador');
  contenedor.innerHTML = '';

  const productos = productosParaEmpleado();
  contador.textContent = productos.length === 0
    ? 'Sin resultados'
    : `${productos.length} ${productos.length === 1 ? 'producto' : 'productos'}`;

  if (productos.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'emp-vacio';
    vacio.textContent = filtrosEmpleado.texto
      ? `No encontramos "${filtrosEmpleado.texto.trim()}" en el inventario. Probá con otro nombre o preguntale al administrador.`
      : 'No hay productos que coincidan con lo que elegiste.';
    contenedor.appendChild(vacio);
    return;
  }

  // Se recorre el catálogo para que las secciones salgan siempre en el mismo orden.
  CATEGORIAS.forEach(categoria => {
    const deLaSeccion = productos
      .filter(producto => producto.categoria === categoria)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    if (deLaSeccion.length === 0) return;

    const seccion = document.createElement('section');
    seccion.className = 'emp-seccion';

    const titulo = document.createElement('h2');
    titulo.className = 'emp-seccion-titulo';
    titulo.textContent = categoria;

    const cuantos = document.createElement('span');
    cuantos.className = 'emp-seccion-num';
    cuantos.textContent = deLaSeccion.length;
    titulo.appendChild(cuantos);

    seccion.appendChild(titulo);

    const grilla = document.createElement('div');
    grilla.className = 'emp-grilla';
    deLaSeccion.forEach(producto => grilla.appendChild(buildTarjetaEmpleado(producto)));
    seccion.appendChild(grilla);

    contenedor.appendChild(seccion);
  });
}

function buildTarjetaEmpleado(producto) {
  const estado = estadoEmpleado(producto);
  const tarjeta = document.createElement('article');
  tarjeta.className = `emp-card emp-card-${estado}`;

  const nombre = document.createElement('p');
  nombre.className = 'emp-card-nombre';
  nombre.textContent = producto.nombre;
  tarjeta.appendChild(nombre);

  const cantidad = document.createElement('p');
  cantidad.className = 'emp-card-cantidad';
  if (estado === 'agotado') {
    cantidad.textContent = 'No hay';
    cantidad.classList.add('emp-card-sin');
  } else {
    cantidad.textContent = formatCantidad(producto.cantidad);
    const unidad = document.createElement('span');
    unidad.className = 'emp-card-unidad';
    unidad.textContent = ` ${producto.unidad}`;
    cantidad.appendChild(unidad);
  }
  tarjeta.appendChild(cantidad);

  const etiqueta = document.createElement('p');
  etiqueta.className = `emp-card-estado emp-estado-${estado}`;
  etiqueta.textContent = ETIQUETAS_EMPLEADO[estadoStock(producto)];
  tarjeta.appendChild(etiqueta);

  if (producto.ubicacion) {
    const lugar = document.createElement('p');
    lugar.className = 'emp-card-lugar';
    lugar.textContent = producto.ubicacion;
    tarjeta.appendChild(lugar);
  }

  return tarjeta;
}

/* ============================================
   Arranque del módulo
   ============================================ */

seedInventarioDePrueba();

if (sesion.rol === 'admin') {
  document.getElementById('admin-view').hidden = false;
  setupVistaAdmin();
} else {
  document.getElementById('empleado-view').hidden = false;
  // El empleado solo consulta: la sección de gestión y sus modales ni siquiera
  // quedan en la página, así no hay botón que tocar ni formulario que enviar.
  ['admin-view', 'modal-producto', 'modal-movimiento', 'modal-eliminar'].forEach(id => {
    document.getElementById(id).remove();
  });
  setupVistaEmpleado();
}

function setupVistaAdmin() {
  poblarSelectsProducto();
  setupModalProducto();
  setupModalMovimiento();
  setupModalEliminar();

  document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirModalProducto());
  document.getElementById('btn-nuevo-movimiento').addEventListener('click', () => abrirModalMovimiento());

  document.getElementById('inv-buscar').addEventListener('input', evento => {
    filtros.texto = evento.target.value;
    renderTabla();
  });

  document.getElementById('inv-estado').addEventListener('change', evento => {
    filtros.estado = evento.target.value;
    renderTabla();
  });

  document.getElementById('inv-orden').addEventListener('change', evento => {
    filtros.orden = evento.target.value;
    renderTabla();
  });

  document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
    filtros.texto = '';
    filtros.categoria = 'todas';
    filtros.estado = 'todos';
    filtros.orden = 'alerta';
    document.getElementById('inv-buscar').value = '';
    document.getElementById('inv-estado').value = 'todos';
    document.getElementById('inv-orden').value = 'alerta';
    renderChips();
    renderTabla();
  });

  document.getElementById('mov-filtro').addEventListener('change', renderMovimientos);

  // Escape cierra cualquier modal abierto.
  document.addEventListener('keydown', evento => {
    if (evento.key !== 'Escape') return;
    ['modal-producto', 'modal-movimiento', 'modal-eliminar'].forEach(id => {
      document.getElementById(id).hidden = true;
    });
    productoAEliminar = null;
  });

  renderTodo();
}
