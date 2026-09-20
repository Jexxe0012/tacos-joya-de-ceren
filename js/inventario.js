/**
 * inventario.js — Lógica del módulo Inventario (vista de administrador).
 * Requiere: storage.js (DB), guard.js (Guard) y main.js cargados antes.
 *
 * Guarda el inventario en la colección "inventario" de localStorage.
 *
 * La vista de empleado (solo consultar y buscar) se agrega más adelante:
 * reutilizará esta misma colección sin tocar el modelo de datos.
 */

/* ============================================
   Setup de la plantilla compartida
   ============================================ */

const sesion = Guard.getSesion();

// Guard.requireRole('admin') en el <head> ya rebotó a quien no sea admin,
// pero por defensa cortamos si esto se ejecutara sin sesión.
if (!sesion) {
  throw new Error('No hay sesión activa.');
}

// main.js ya creó la navegación y el cierre de sesión comunes.
document.getElementById('rol-menu').textContent = `${sesion.nombre} · Dueño / Admin`;

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
   Resumen, filtros y tabla
   ============================================ */

/** Redibuja toda la pantalla. Se llama después de cada cambio en los datos. */
function renderTodo() {
  renderResumen();
  renderChips();
  renderTabla();
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
      DB.update('inventario', id, { ...datos, actualizadoEn: new Date().toISOString() });
    } else {
      DB.create('inventario', {
        ...datos,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString()
      });
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
    DB.remove('inventario', productoAEliminar.id);

    cerrar();
    renderTodo();
  });
}

/* ============================================
   Arranque del módulo
   ============================================ */

seedInventarioDePrueba();
poblarSelectsProducto();
setupModalProducto();
setupModalEliminar();

document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirModalProducto());

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

// Escape cierra cualquier modal abierto.
document.addEventListener('keydown', evento => {
  if (evento.key !== 'Escape') return;
  ['modal-producto', 'modal-eliminar'].forEach(id => {
    document.getElementById(id).hidden = true;
  });
  productoAEliminar = null;
});

renderTodo();
