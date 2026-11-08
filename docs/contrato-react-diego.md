> Documento de entrega original de Diego, conservado como referencia de contratos. La migración integrada ya usa `index.html`; consulta el README para el estado actual.

# Base React: lo que queda listo para integrar

Entrega de Diego para Josué. Rama `diego-login-turnos`, actualizada con
`main` (9d76628) antes de empezar.

La aplicación React de una sola página vive en **`app.html`**. `index.html`
y `pages/*.html` siguen compilándose y funcionando mientras quede alguna
pantalla sin migrar; se retiran en la fase final.

```bash
npm ci
npm run dev     # http://localhost:5173/app.html
npm run build   # compila index.html, app.html y pages/*.html
```

## Estructura

```text
app.html                     entrada única de la aplicación React
src/
  main.jsx                   el único createRoot del proyecto
  App.jsx                    HashRouter + AuthProvider
  app/
    Rutas.jsx                composición de rutas y acceso por rol
    modulos.js               solo datos de navegación
    inicializar.js           siembra controlada, antes del primer render
  auth/                      AuthProvider, useAuth, RutaProtegida
  components/
    Modal.jsx                ventana con el diseño de Bootstrap
    CapaModal.jsx            ventana con el diseño de Inventario y Turnos
    layout/                  AppLayout, Sidebar, Header
  hooks/
    useColeccion.js          datos de una colección, siempre al día
    useFormulario.js         estado, errores y envío de un formulario
  services/                  storage, authService, dialogos, insumosService
  utils/                     fechas, validaciones
  compat/                    adaptador temporal de globales
  modulos/
    auth, recetas, inventario, mermas, turnos
```

## Rutas y acceso

| Ruta | Acceso | Estado |
| --- | --- | --- |
| `/login`, `/registro` | Público; con sesión va al inicio del rol | React (Diego) |
| `/dashboard` | Administrador | React (tu componente, montado en la ruta) |
| `/recetas` | Sesión activa | React (Diego) |
| `/inventario` | Sesión activa | React (Diego) |
| `/mermas` | Sesión activa | React (Diego) |
| `/turnos` | Sesión activa | React (Diego) |
| `/reportes` | Administrador | pendiente (tuyo) |
| `/ventas` | Sesión activa | pendiente (tuyo) |
| `/abastecimientos` | Administrador | pendiente (tuyo) |

La raíz y cualquier ruta desconocida llevan al inicio del rol. El
administrador inicia en `/dashboard` y el empleado en `/turnos`, que en su
menú se llama "Mis turnos".

Para conectar una pantalla tuya basta con cambiar una línea en
`src/app/Rutas.jsx`: donde hoy dice `<Pendiente responsable="Josué" />`,
poner tu componente. No hace falta tocar nada más.

## Lo que puedes importar

### `src/services/storage.js`

```js
import { db } from "../services/storage.js";

db.getAll(coleccion)            // lista
db.getById(coleccion, id)       // objeto o undefined
db.create(coleccion, objeto)    // devuelve el objeto con su id
db.update(coleccion, id, cambios)
db.remove(coleccion, id)        // true si existía
db.seed(coleccion, datos)       // solo si está vacía; idempotente
db.suscribir(coleccion, fn)     // devuelve la función que cancela
db.enLote([colecciones], fn)    // deshace todo si algo falla
db.problema(coleccion)          // causa de una lectura inválida, o ""
```

Las claves y la forma de los registros no cambian. Una escritura que falla
lanza un error con causa legible: no informes éxito sin atraparlo.

### `src/hooks/useColeccion.js`

```js
const { registros, problema, recargar, crear, actualizar, eliminar } =
  useColeccion("ventas");
```

Se actualiza con las escrituras de `db` y con el evento `storage` de otras
pestañas. No hace falta llamar a ningún `render()`.

### `src/auth/useAuth.js`

```js
const { sesion, iniciarSesion, registrarUsuario, cerrarSesion, esAdmin, inicio } = useAuth();
```

`sesion` es `null` o `{ id, correo, nombre, rol, loginAt }`.
`iniciarSesion({ correo, contrasena, rol })` lanza `ErrorAcceso` con el campo
que falló. `cerrarSesion()` solo borra la sesión: la confirmación es de la
interfaz.

### `src/services/dialogos.js`

```js
import { exito, error, aviso, confirmar } from "../services/dialogos.js";
await confirmar({ titulo, texto, boton, peligro });  // true o false
```

SweetAlert2 ahora se importa desde npm, no del CDN.

### `src/utils/fechas.js`

`fechaHoyLocal()`, `aTextoLocal(date)`, `aFechaLocal(texto)` (validada,
`null` si no existe el día), `esFechaValida`, `haceDias`, `enDias`,
`diasEntre`, `fechaLegible`, `horaAMinutos`.

### `src/utils/validaciones.js`

`texto`, `numero`, `fecha`, `hora`, `correo`, `nombrePersona`,
`contrasenaNueva`, `confirmacion`, `revisar(valores, reglas)`, `sinErrores`.
Cada regla devuelve el mensaje o `""`.

### `src/hooks/useFormulario.js`

```js
const form = useFormulario({ correo: "" }, { correo: validaciones.correo });
<input {...form.campo("correo")} />
{form.errores.correo && <div className="invalid-feedback d-block">{form.errores.correo}</div>}
<form onSubmit={form.enviar(async valores => { ... })}>
```

Hace lo que hacía `Valida.enVivo`, con los errores en el estado.

### `src/services/insumosService.js` — el que pediste para Reportes

```js
import {
  listarInsumos, obtenerInsumo, normalizarUnidad,
  equivalenciaAutomatica, resolverVinculo
} from "../services/insumosService.js";

resolverVinculo(insumoId, productosMap, vinculos)
// { insumo, producto, factor } o { error: "causa" }
```

Son funciones puras: no leen ni escriben la base de datos. Reemplazan a los
globales `CatalogoInsumos` e `InsumosInventario` con el mismo comportamiento.
El formulario y las escrituras de vínculos siguen siendo tuyos.

### `src/modulos/inventario/inventarioService.js`

`aplicarMovimiento({ productoId, tipo, cantidad, motivo, nota, usuario })` es
la única puerta por la que cambia una existencia. Guarda el producto y su
movimiento en un mismo lote.

### `src/modulos/mermas/mermasService.js`

`registrarMerma({ productoId, cantidad, motivo, responsable, observaciones,
usuario, reportadoPor, fecha })` escribe inventario, movimiento y merma en un
solo lote. La usan la pantalla de Mermas y la merma rápida de Turnos.

## Adaptador temporal

`src/compat/globales.js` publica `DB`, `UI`, `Valida`, `Guard`,
`CatalogoInsumos`, `InsumosInventario`, `Swal` y `Chart` en `window`,
construidos sobre los servicios importados. Existe para que el código que
todavía no se migró siga funcionando dentro de la aplicación React. Tu
`Dashboard.jsx` se monta tal cual gracias a esto.

Su `Guard` no redirige con `window.location`: las rutas protegidas ya deciden
quién pasa. `requireLogin()` y `requireRole(rol)` solo responden `true` o
`false`.

El adaptador se retira cuando el último módulo importe lo que usa.

## Contratos de datos

Las colecciones conservan sus claves: `usuarios`, `recetas`, `inventario`,
`movimientos`, `ventas`, `mermas`, `turnos`, `solicitudes`,
`vinculosInsumos`, `sesion`.

- La sesión guarda `id`, `correo`, `nombre`, `rol` y `loginAt`.
- Los movimientos guardan además la `unidad` y el nombre del producto, para
  que el historial se lea igual aunque el producto se edite o se elimine.
- Las mermas guardan `cantidad` como número y `unidad` aparte, con la fecha
  local del día.
- Las ventas mantienen `recetaId`, `recetaNombre`, `cantidad`,
  `precioUnitario`, `total`, `fecha` y `pedidoId`. Una receta eliminada sigue
  siendo identificable en su historial porque la venta guarda su nombre.

## Comprobaciones hechas

- `npm run build` sin errores.
- 74 comprobaciones de `storage`, `fechas`, `validaciones` y `authService`
  pasando en Node con un `localStorage` simulado.
- Recorrido en el navegador con el almacenamiento vacío: entra el empleado,
  se siembran usuarios, recetas, inventario y turnos, y las nueve rutas
  responden sin errores en consola con los dos roles.
- El empleado no entra a `/dashboard` ni a `/reportes`: vuelve a sus turnos.
- Alta, edición, ficha y baja de recetas; movimientos de inventario con sus
  reglas; merma desde las dos pantallas con el mismo resultado; turnos con
  cruce, recurrencia y solicitudes.

## Dependencias y siguiente paso

- npm: `react`, `react-dom`, `react-router-dom`, `bootstrap`, `chart.js`,
  `sweetalert2`, todas con la versión fijada.
- La compilación de GitHub también revisa los PR dirigidos a
  `integracion-react`. La publicación sigue atada a `main`.
- Falta decidir juntos cuándo `app.html` pasa a ser `index.html`, y retirar
  `pages/` y la copia de scripts clásicos. Conviene hacerlo cuando Reportes,
  Ventas y Abastecimiento estén montados en sus rutas.
