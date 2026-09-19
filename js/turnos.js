/**
 * turnos.js — Lógica del módulo Turnos.
 * Requiere: storage.js (DB), guard.js (Guard) cargados antes.
 *
 * Fase 1: setup del sidebar (usuario, avatar, logout) y
 * decisión de qué vista mostrar según el rol de la sesión.
 */

/* ============================================
   Setup inicial del sidebar y de la vista
   ============================================ */

const sesion = Guard.getSesion();

// Guard.requireLogin() en el <head> ya rebotó al login si no hay sesión,
// pero por defensa devolvemos si esto se ejecutara sin sesión.
if (!sesion) {
  throw new Error('No hay sesión activa.');
}

// Nombre y rol en el sidebar
document.getElementById('sidebar-user-name').textContent = sesion.nombre;
document.getElementById('sidebar-user-role').textContent =
  sesion.rol === 'admin' ? 'Dueño / Admin' : 'Empleado';

// Iniciales para el avatar (máximo 2 letras)
const iniciales = sesion.nombre
  .split(' ')
  .filter(Boolean)
  .map(palabra => palabra[0])
  .slice(0, 2)
  .join('')
  .toUpperCase();
document.getElementById('sidebar-user-avatar').textContent = iniciales;

// Mostrar la vista que corresponde al rol
if (sesion.rol === 'admin') {
  document.getElementById('admin-view').hidden = false;
} else {
  document.getElementById('empleado-view').hidden = false;
}

// Botón de logout
document.getElementById('btn-logout').addEventListener('click', () => {
  Guard.logout();
});

/* ============================================
   VISTA EMPLEADO — Saludo, calendario, acciones
   ============================================ */

// Constantes declaradas antes de la llamada a setupVistaEmpleado():
// con const, usarlas antes de su línea da ReferenceError (TDZ).
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* ---------- Helpers compartidos empleado/admin ---------- */

/**
 * Devuelve los turnos aplicables a una fecha para un empleado.
 * Considera:
 *  - Match directo por fecha exacta.
 *  - Recurrencia semanal: mismo día de la semana, con fecha original <= la buscada.
 */
function turnosForDate(date, empleadoId = null) {
  const iso = formatDateISO(date);
  const dow = date.getDay();
  return DB.getAll('turnos').filter(t => {
    if (empleadoId && t.empleadoId !== empleadoId) return false;
    if (t.fecha === iso) return true;
    if (t.esRecurrenteSemanal) {
      const tDate = new Date(t.fecha + 'T00:00:00');
      if (tDate.getDay() === dow && tDate <= date) return true;
    }
    return false;
  });
}

/**
 * Etiqueta de rango de semana. Ej: "14–20 sep" o "28 sep – 4 oct".
 */
function formatWeekLabel(monday, sunday) {
  const mMonth = MESES[monday.getMonth()];
  const sMonth = MESES[sunday.getMonth()];
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${sMonth}`;
  }
  return `${monday.getDate()} ${mMonth} – ${sunday.getDate()} ${sMonth}`;
}

if (sesion.rol === 'empleado') {
  setupVistaEmpleado();
}

function setupVistaEmpleado() {
  // Saludo según hora del día
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const primerNombre = sesion.nombre.split(' ')[0];
  document.getElementById('emp-greeting').textContent = `${saludo}, ${primerNombre}`;

  // Sembrar datos de prueba si no hay turnos
  seedTurnosDePrueba();

  // Estado: lunes de la semana actualmente mostrada
  let mondayShown = getMondayOf(new Date());
  renderEmpleadoWeek(mondayShown);

  // Navegación de semanas
  document.getElementById('btn-week-prev').addEventListener('click', () => {
    mondayShown = addDays(mondayShown, -7);
    renderEmpleadoWeek(mondayShown);
  });
  document.getElementById('btn-week-next').addEventListener('click', () => {
    mondayShown = addDays(mondayShown, 7);
    renderEmpleadoWeek(mondayShown);
  });

  // Modal para registrar merma
  setupModalMerma();

  setupSolicitudesEmpleado();
}

/* ---------- Helpers de fecha ---------- */

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatHora(hora24) {
  // "14:00" → "2 p.m."
  const [h, m] = hora24.split(':').map(Number);
  if (h === 0) return m === 0 ? '12 a.m.' : `12:${String(m).padStart(2, '0')} a.m.`;
  if (h === 12) return m === 0 ? '12 p.m.' : `12:${String(m).padStart(2, '0')} p.m.`;
  const suf = h < 12 ? 'a.m.' : 'p.m.';
  const h12 = h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${suf}` : `${h12}:${String(m).padStart(2, '0')} ${suf}`;
}

/* ---------- Seed de turnos de prueba ---------- */

function seedTurnosDePrueba() {
  if (DB.getAll('turnos').length > 0) return;

  const empleado = DB.getAll('usuarios').find(u => u.rol === 'empleado');
  if (!empleado) return;

  // Turnos de lunes a viernes de esta semana, con estaciones variadas
  const monday = getMondayOf(new Date());
  const estaciones = ['Cocina', 'Plancha', 'Caja', 'Cocina', 'Plancha'];
  const turnos = [];
  for (let i = 0; i < 5; i++) {
    turnos.push({
      empleadoId: empleado.id,
      fecha: formatDateISO(addDays(monday, i)),
      horaInicio: '14:00',
      horaFin: '21:00',
      estacion: estaciones[i],
      esRecurrenteSemanal: false
    });
  }
  DB.seed('turnos', turnos);
}

/* ---------- Render del calendario del empleado ---------- */

function renderEmpleadoWeek(monday) {
  const sunday = addDays(monday, 6);
  document.getElementById('week-label').textContent = formatWeekLabel(monday, sunday);

  const container = document.getElementById('emp-week');
  container.innerHTML = '';

  // (Usaremos el helper turnosForDate() por cada día, respetando recurrencia)
  const hoy = new Date();

  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    const iso = formatDateISO(day);
    const turnosDelDia = turnosForDate(day, sesion.id);

    const card = document.createElement('div');
    card.className = 'day-card' + (isSameDate(day, hoy) ? ' day-today' : '');

    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = DIAS_SEMANA[i];
    card.appendChild(header);

    const number = document.createElement('div');
    number.className = 'day-number';
    number.textContent = day.getDate();
    card.appendChild(number);

    if (turnosDelDia.length === 0) {
      const libre = document.createElement('div');
      libre.className = 'day-libre';
      libre.textContent = 'Libre';
      card.appendChild(libre);
    } else {
      turnosDelDia.forEach(t => {
        const bloque = document.createElement('div');
        bloque.className = 'day-turno';

        const horas = document.createElement('div');
        horas.className = 'turno-hours';
        horas.textContent = `${formatHora(t.horaInicio)}–${formatHora(t.horaFin)}`;
        bloque.appendChild(horas);

        const est = document.createElement('div');
        est.className = 'turno-station';
        est.textContent = t.estacion;
        bloque.appendChild(est);

        card.appendChild(bloque);
      });
    }

    container.appendChild(card);
  }
}

/* ---------- Modal: Registrar merma ---------- */

function setupModalMerma() {
  const btnOpen = document.getElementById('btn-registrar-merma');
  const modal = document.getElementById('modal-merma');
  const btnCancel = document.getElementById('btn-merma-cancel');
  const form = document.getElementById('form-merma');
  const msgBox = document.getElementById('merma-msg');
  const fechaInput = document.getElementById('merma-fecha');

  btnOpen.addEventListener('click', () => {
    form.reset();
    msgBox.textContent = '';
    msgBox.className = 'modal-msg';
    fechaInput.value = formatDateISO(new Date());
    modal.hidden = false;
  });

  btnCancel.addEventListener('click', () => {
    modal.hidden = true;
  });

  // Cerrar al hacer click en el overlay (fuera de la tarjeta)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msgBox.textContent = '';
    msgBox.className = 'modal-msg';

    const producto = document.getElementById('merma-producto').value.trim();
    const cantidad = document.getElementById('merma-cantidad').value.trim();
    const fecha = fechaInput.value;
    const motivo = document.getElementById('merma-motivo').value.trim();

    if (!producto || !cantidad || !fecha || !motivo) {
      msgBox.textContent = 'Todos los campos son obligatorios.';
      msgBox.className = 'modal-msg error';
      return;
    }

    DB.create('mermas', {
      producto,
      cantidad,
      fecha,
      motivo,
      reportadoPor: sesion.id
    });

    msgBox.textContent = 'Merma registrada correctamente.';
    msgBox.className = 'modal-msg success';
    setTimeout(() => { modal.hidden = true; }, 1200);
  });
}

/* ============================================
   VISTA ADMIN — Stats, calendario, CRUD de turnos
   ============================================ */

if (sesion.rol === 'admin') {
  setupVistaAdmin();
}

function setupVistaAdmin() {
  let mondayShown = getMondayOf(new Date());

  populateEmpleadoSelect();
  renderAdminWeek(mondayShown);

  document.getElementById('btn-admin-week-prev').addEventListener('click', () => {
    mondayShown = addDays(mondayShown, -7);
    renderAdminWeek(mondayShown);
  });
  document.getElementById('btn-admin-week-next').addEventListener('click', () => {
    mondayShown = addDays(mondayShown, 7);
    renderAdminWeek(mondayShown);
  });

  document.getElementById('btn-crear-turno').addEventListener('click', () => {
    openTurnoModal(null);
  });

  setupModalTurno(() => renderAdminWeek(mondayShown));

  renderSolicitudesAdmin();
}

function populateEmpleadoSelect() {
  const select = document.getElementById('turno-empleado');
  const empleados = DB.getAll('usuarios').filter(u => u.rol === 'empleado');
  select.innerHTML = '<option value="">— Seleccioná —</option>';
  empleados.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = emp.nombre;
    select.appendChild(opt);
  });
}

function renderAdminWeek(monday) {
  const sunday = addDays(monday, 6);
  document.getElementById('admin-week-label').textContent = formatWeekLabel(monday, sunday);

  const empleados = DB.getAll('usuarios').filter(u => u.rol === 'empleado');
  const table = document.getElementById('admin-calendar');
  table.innerHTML = '';

  if (empleados.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.className = 'no-empleados';
    cell.textContent = 'No hay empleados registrados aún.';
    row.appendChild(cell);
    table.appendChild(row);
    updateAdminStats(monday, empleados);
    return;
  }

  // Header
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  const thEmp = document.createElement('th');
  thEmp.className = 'col-employee';
  thEmp.textContent = 'Empleado';
  trHead.appendChild(thEmp);
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    const th = document.createElement('th');
    th.textContent = `${DIAS_SEMANA[i]} ${day.getDate()}`;
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const hoy = new Date();

  empleados.forEach(emp => {
    const row = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.className = 'col-employee';
    tdName.textContent = emp.nombre;
    row.appendChild(tdName);

    for (let i = 0; i < 7; i++) {
      const day = addDays(monday, i);
      const iso = formatDateISO(day);
      const turnos = turnosForDate(day, emp.id);

      const td = document.createElement('td');
      td.className = 'cell';
      if (isSameDate(day, hoy)) td.classList.add('today');
      td.dataset.empleadoId = emp.id;
      td.dataset.fecha = iso;

      if (turnos.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'cell-empty';
        empty.textContent = 'Libre';
        td.appendChild(empty);
      } else {
        td.classList.add('has-turno');
        const t = turnos[0];
        td.dataset.turnoId = t.id;

        const horas = document.createElement('div');
        horas.className = 'cell-hours';
        horas.textContent = `${formatHora(t.horaInicio)}–${formatHora(t.horaFin)}`;
        if (t.esRecurrenteSemanal) {
          const mark = document.createElement('span');
          mark.className = 'cell-recurrent-mark';
          mark.textContent = ' ↻';
          mark.title = 'Se repite cada semana';
          horas.appendChild(mark);
        }
        td.appendChild(horas);

        const est = document.createElement('div');
        est.className = 'cell-station';
        est.textContent = t.estacion;
        td.appendChild(est);
      }

      td.addEventListener('click', () => {
        if (turnos.length === 0) {
          openTurnoModal(null, { empleadoId: emp.id, fecha: iso });
        } else {
          openTurnoModal(turnos[0]);
        }
      });

      row.appendChild(td);
    }
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  updateAdminStats(monday, empleados);
}

function updateAdminStats(monday, empleados) {
  const hoy = new Date();
  const turnosHoy = empleados.filter(e => turnosForDate(hoy, e.id).length > 0).length;
  const libreHoy = Math.max(0, empleados.length - turnosHoy);

  let totalHoras = 0;
  let totalTurnos = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    empleados.forEach(e => {
      const turnos = turnosForDate(day, e.id);
      turnos.forEach(t => {
        totalTurnos++;
        totalHoras += horasEntre(t.horaInicio, t.horaFin);
      });
    });
  }

  document.getElementById('stat-en-turno').textContent = turnosHoy;
  document.getElementById('stat-dia-libre').textContent = libreHoy;
  document.getElementById('stat-horas').textContent = `${Math.round(totalHoras)} h`;
  document.getElementById('stat-turnos-total').textContent = totalTurnos;
}

function horasEntre(inicio, fin) {
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  return (h2 + m2 / 60) - (h1 + m1 / 60);
}

/* ---------- Modal: Crear / Editar / Borrar turno ---------- */

function setupModalTurno(onSave) {
  const modal = document.getElementById('modal-turno');
  const form = document.getElementById('form-turno');
  const btnCancel = document.getElementById('btn-turno-cancel');
  const btnDelete = document.getElementById('btn-turno-delete');
  const msgBox = document.getElementById('turno-msg');

  btnCancel.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  btnDelete.addEventListener('click', () => {
    const id = document.getElementById('turno-id').value;
    if (!id) return;
    if (!confirm('¿Borrar este turno?')) return;
    DB.remove('turnos', id);
    modal.hidden = true;
    onSave();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msgBox.textContent = '';
    msgBox.className = 'modal-msg';

    const id = document.getElementById('turno-id').value;
    const empleadoId = document.getElementById('turno-empleado').value;
    const fecha = document.getElementById('turno-fecha').value;
    const horaInicio = document.getElementById('turno-hora-inicio').value;
    const horaFin = document.getElementById('turno-hora-fin').value;
    const estacion = document.getElementById('turno-estacion').value;
    const notas = document.getElementById('turno-notas').value.trim();
    const esRecurrenteSemanal = document.getElementById('turno-recurrente').checked;

    if (!empleadoId || !fecha || !horaInicio || !horaFin || !estacion) {
      msgBox.textContent = 'Empleado, fecha, horas y estación son obligatorios.';
      msgBox.className = 'modal-msg error';
      return;
    }
    if (horaFin <= horaInicio) {
      msgBox.textContent = 'La hora de fin debe ser después de la hora de inicio.';
      msgBox.className = 'modal-msg error';
      return;
    }

    const data = { empleadoId, fecha, horaInicio, horaFin, estacion, notas, esRecurrenteSemanal };

    if (id) {
      DB.update('turnos', id, data);
    } else {
      DB.create('turnos', data);
    }

    modal.hidden = true;
    onSave();
  });
}

function openTurnoModal(turno, prefill = {}) {
  const modal = document.getElementById('modal-turno');
  const title = document.getElementById('modal-turno-title');
  const btnDelete = document.getElementById('btn-turno-delete');
  const btnSave = document.getElementById('btn-turno-save');
  const msgBox = document.getElementById('turno-msg');

  msgBox.textContent = '';
  msgBox.className = 'modal-msg';

  if (turno) {
    title.textContent = 'Editar turno';
    btnSave.textContent = 'Guardar';
    btnDelete.hidden = false;
    document.getElementById('turno-id').value = turno.id;
    document.getElementById('turno-empleado').value = turno.empleadoId;
    document.getElementById('turno-fecha').value = turno.fecha;
    document.getElementById('turno-hora-inicio').value = turno.horaInicio;
    document.getElementById('turno-hora-fin').value = turno.horaFin;
    document.getElementById('turno-estacion').value = turno.estacion;
    document.getElementById('turno-notas').value = turno.notas || '';
    document.getElementById('turno-recurrente').checked = !!turno.esRecurrenteSemanal;
  } else {
    title.textContent = 'Crear turno';
    btnSave.textContent = 'Crear';
    btnDelete.hidden = true;
    document.getElementById('turno-id').value = '';
    document.getElementById('turno-empleado').value = prefill.empleadoId || '';
    document.getElementById('turno-fecha').value = prefill.fecha || formatDateISO(new Date());
    document.getElementById('turno-hora-inicio').value = '14:00';
    document.getElementById('turno-hora-fin').value = '21:00';
    document.getElementById('turno-estacion').value = '';
    document.getElementById('turno-notas').value = '';
    document.getElementById('turno-recurrente').checked = false;
  }

  modal.hidden = false;
}

/* ============================================
   SOLICITUDES — Compartido, Empleado y Admin
   ============================================ */

function formatFechaHumana(fechaIso) {
  const d = new Date(fechaIso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${h}:${m}`;
}

function buildSolicitudCard(solicitud, showActions, onAction) {
  const card = document.createElement('div');
  card.className = `solicitud-card ${solicitud.estado}`;

  const info = document.createElement('div');
  info.className = 'solicitud-info';

  const header = document.createElement('div');
  header.className = 'solicitud-header';

  const empleado = DB.getById('usuarios', solicitud.empleadoId);
  const nombre = empleado ? empleado.nombre : 'Empleado desconocido';

  const nombreSpan = document.createElement('span');
  nombreSpan.className = 'solicitud-nombre';
  nombreSpan.textContent = nombre;
  header.appendChild(nombreSpan);

  const fechaSpan = document.createElement('span');
  fechaSpan.className = 'solicitud-fecha';
  fechaSpan.textContent = formatFechaHumana(solicitud.fecha);
  header.appendChild(fechaSpan);

  const estadoSpan = document.createElement('span');
  estadoSpan.className = `solicitud-estado ${solicitud.estado}`;
  estadoSpan.textContent = solicitud.estado;
  header.appendChild(estadoSpan);

  info.appendChild(header);

  const mensaje = document.createElement('div');
  mensaje.className = 'solicitud-mensaje';
  mensaje.textContent = solicitud.mensaje;
  info.appendChild(mensaje);

  card.appendChild(info);

  if (showActions && solicitud.estado === 'pendiente') {
    const actions = document.createElement('div');
    actions.className = 'solicitud-actions';

    const btnAccept = document.createElement('button');
    btnAccept.type = 'button';
    btnAccept.className = 'btn-accept';
    btnAccept.textContent = 'Aceptar';
    btnAccept.addEventListener('click', () => {
      DB.update('solicitudes', solicitud.id, { estado: 'aceptada' });
      if (onAction) onAction();
    });

    const btnReject = document.createElement('button');
    btnReject.type = 'button';
    btnReject.className = 'btn-reject';
    btnReject.textContent = 'Rechazar';
    btnReject.addEventListener('click', () => {
      DB.update('solicitudes', solicitud.id, { estado: 'rechazada' });
      if (onAction) onAction();
    });

    actions.appendChild(btnAccept);
    actions.appendChild(btnReject);
    card.appendChild(actions);
  }

  return card;
}

/* ---------- Empleado: crear + ver propias ---------- */

function setupSolicitudesEmpleado() {
  renderMisSolicitudes();

  document.getElementById('btn-crear-solicitud').addEventListener('click', () => {
    openSolicitudModal();
  });

  setupModalSolicitud(() => renderMisSolicitudes());
}

function renderMisSolicitudes() {
  const list = document.getElementById('emp-solicitudes-list');
  list.innerHTML = '';

  const mias = DB.getAll('solicitudes')
    .filter(s => s.empleadoId === sesion.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (mias.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'solicitudes-empty';
    empty.textContent = 'No has enviado solicitudes todavía.';
    list.appendChild(empty);
    return;
  }

  mias.forEach(s => list.appendChild(buildSolicitudCard(s, false)));
}

function setupModalSolicitud(onSubmit) {
  const modal = document.getElementById('modal-solicitud');
  const form = document.getElementById('form-solicitud');
  const btnCancel = document.getElementById('btn-solicitud-cancel');
  const msgBox = document.getElementById('solicitud-msg');

  btnCancel.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msgBox.textContent = '';
    msgBox.className = 'modal-msg';

    const mensaje = document.getElementById('solicitud-mensaje').value.trim();

    if (!mensaje) {
      msgBox.textContent = 'Escribí el mensaje de tu solicitud.';
      msgBox.className = 'modal-msg error';
      return;
    }
    if (mensaje.length < 5) {
      msgBox.textContent = 'El mensaje debe tener al menos 5 caracteres.';
      msgBox.className = 'modal-msg error';
      return;
    }

    DB.create('solicitudes', {
      empleadoId: sesion.id,
      mensaje,
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    });

    msgBox.textContent = 'Solicitud enviada correctamente.';
    msgBox.className = 'modal-msg success';
    setTimeout(() => {
      modal.hidden = true;
      onSubmit();
    }, 1000);
  });
}

function openSolicitudModal() {
  const modal = document.getElementById('modal-solicitud');
  const form = document.getElementById('form-solicitud');
  const msgBox = document.getElementById('solicitud-msg');
  form.reset();
  msgBox.textContent = '';
  msgBox.className = 'modal-msg';
  modal.hidden = false;
}

/* ---------- Admin: revisar pendientes ---------- */

function renderSolicitudesAdmin() {
  const list = document.getElementById('admin-solicitudes-list');
  list.innerHTML = '';

  const pendientes = DB.getAll('solicitudes')
    .filter(s => s.estado === 'pendiente')
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (pendientes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'solicitudes-empty';
    empty.textContent = 'No hay solicitudes pendientes.';
    list.appendChild(empty);
    return;
  }

  pendientes.forEach(s => {
    list.appendChild(buildSolicitudCard(s, true, () => renderSolicitudesAdmin()));
  });
}
