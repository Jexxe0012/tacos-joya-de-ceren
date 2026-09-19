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
  document.getElementById('week-label').textContent =
    `${monday.getDate()}–${sunday.getDate()} ${MESES[sunday.getMonth()]}`;

  const container = document.getElementById('emp-week');
  container.innerHTML = '';

  const misTurnos = DB.getAll('turnos').filter(t => t.empleadoId === sesion.id);
  const hoy = new Date();

  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    const iso = formatDateISO(day);
    const turnosDelDia = misTurnos.filter(t => t.fecha === iso);

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
