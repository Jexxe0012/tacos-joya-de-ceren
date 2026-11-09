# Contratos de la base React

Referencia de los servicios, hooks y contratos de datos compartidos de la
aplicación. Nació como la entrega de Diego para Josué y está actualizada al
estado integrado del 8 de noviembre de 2026.

Para la descripción general del proyecto y de cada módulo, el README.

## Cómo se ejecuta

```bash
npm ci
npm test        # pruebas con el runner de Node
npm run dev     # http://localhost:5173/
npm run build
```

La entrada es **`index.html`**, con el único `createRoot` del proyecto en
`src/main.jsx`. `app.html` y cada `pages/*.html` quedaron como redirecciones
de una línea a la ruta correspondiente, para que los enlaces publicados antes
de la migración sigan funcionando.

## Estructura

```text
index.html                   entrada única de la aplicación React
app.html                     redirección a la raíz (enlace antiguo)
pages/*.html                 redirecciones a #/<modulo> (enlaces antiguos)
css/                         estilos compartidos y por módulo
src/
  main.jsx                   estilos, siembra y el único createRoot
  App.jsx                    HashRouter + AuthProvider
  app/
    Rutas.jsx                composición de rutas y acceso por rol
    modulos.js               solo datos de navegación
    inicializar.js           siembra controlada, antes del primer render
  auth/
    AuthProvider.jsx  useAuth.js  RutaProtegida.jsx
  components/
    Modal.jsx                ventana con el diseño de Bootstrap
    CapaModal.jsx            ventana con el diseño de Inventario y Turnos
    ClimaOperativo.jsx       pronóstico de Open-Meteo
    GraficaBarras.jsx
    layout/
      AppLayout.jsx  Sidebar.jsx  Header.jsx
  hooks/
    useColeccion.js          datos de una colección, siempre al día
    useFormulario.js         estado, errores y envío de un formulario
  services/
    storage.js  authService.js  dialogos.js
    insumosService.js  climaService.js
  utils/
    fechas.js  validaciones.js
  dashboard/                 Dashboard y sus componentes
  modulos/
    auth/  recetas/  inventario/  mermas/  turnos/
    reportes/  ventas/  abastecimientos/
```

Cada carpeta de `src/modulos/` guarda sus propias pantallas, sus reglas de
formulario (`reglas*.js`), su servicio de datos (`*Service.js`) y su semilla
(`semilla*.js`) cuando la necesita.

Dos diferencias respecto al boceto del plan, las dos deliberadas:

- **Dashboard vive en `src/dashboard/`**, no en `src/modulos/dashboard/`. Ya
  estaba ahí desde antes de la migración y moverlo no aportaba nada.
- **Las redirecciones están en `pages/`**, no en `public/pages/`. Conservan
  la ruta exacta de los enlaces antiguos, que es justo lo que se buscaba.

## Rutas y acceso

| Ruta | Acceso |
| --- | --- |
| `/login`, `/registro` | Público; con sesión va al inicio del rol |
| `/dashboard`, `/reportes`, `/abastecimientos` | Solo administrador |
| `/recetas`, `/inventario`, `/mermas`, `/turnos`, `/ventas` | Sesión activa |

La raíz y cualquier ruta desconocida llevan al inicio del rol: `/dashboard`
para el administrador, `/turnos` para el empleado, que en su menú se llama
"Mis turnos". Reportes, Ventas y Abastecimiento se cargan de forma diferida.

## Lo que se puede importar

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

Una escritura que falla lanza un error con causa legible: hay que atraparlo
antes de informar éxito.

### `src/hooks/useColeccion.js`

```js
const { registros, problema, recargar, crear, actualizar, eliminar } =
  useColeccion("ventas");
```

Se actualiza con las escrituras de `db` y con el evento `storage` de otras
pestañas.

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

### `src/utils/fechas.js`

`fechaHoyLocal()`, `aTextoLocal(date)`, `aFechaLocal(texto)` (validada,
`null` si no existe el día), `esFechaValida`, `haceDias`, `enDias`,
`diasEntre`, `fechaLegible`, `horaAMinutos`. Nunca pasan por UTC.

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

Revisa al salir del campo si el usuario escribió algo, mientras escribe solo
si ese campo ya estaba marcado, y todo al enviar.

### `src/services/insumosService.js`

```js
listarInsumos()  obtenerInsumo(id)  normalizarUnidad(valor)
equivalenciaAutomatica(origen, destino)
resolverVinculo(insumoId, productosMap, vinculos)
// { insumo, producto, factor } o { error: "causa" }
```

Funciones puras: no leen ni escriben la base de datos.

### `src/modulos/inventario/inventarioService.js`

`aplicarMovimiento({ productoId, tipo, cantidad, motivo, nota, usuario })` es
la única puerta por la que cambia una existencia. Guarda el producto y su
movimiento en un mismo lote.

### `src/modulos/mermas/mermasService.js`

`registrarMerma({ productoId, cantidad, motivo, responsable, observaciones,
usuario, reportadoPor, fecha })` escribe inventario, movimiento y merma en un
solo lote. La usan la pantalla de Mermas y la merma rápida de Turnos.

## Contratos de datos

Las colecciones conservan las claves del prototipo: `usuarios`, `recetas`,
`inventario`, `movimientos`, `ventas`, `mermas`, `turnos`, `solicitudes`,
`vinculosInsumos`, `sesion`.

- La sesión guarda `id`, `correo`, `nombre`, `rol` y `loginAt`.
- Los movimientos guardan además la `unidad` y el nombre del producto, para
  que el historial se lea igual aunque el producto se edite o se elimine.
- Las mermas guardan `cantidad` como número y `unidad` aparte, con la fecha
  local del día.
- Las ventas mantienen `recetaId`, `recetaNombre`, `cantidad`,
  `precioUnitario`, `total`, `fecha` y `pedidoId`. Una receta eliminada sigue
  siendo identificable en su historial porque la venta guarda su nombre.

## Siembra

`src/app/inicializar.js` siembra una sola vez, antes del primer render:
cuentas de prueba, recetas, inventario y turnos. Solo actúa cuando la
colección no existe todavía, así una lista que el usuario dejó vacía también
es un estado válido y no se rellena sola.

## Lo que se retiró

- `js/` completo: ya no queda JavaScript clásico.
- `src/compat/`: el adaptador que publicaba `DB`, `UI`, `Valida`, `Guard`,
  `CatalogoInsumos` e `InsumosInventario` en `window`. Existió solo mientras
  hubo módulos sin migrar; ahora cada archivo importa lo que usa.
- Las pantallas de `pages/`, sustituidas por redirecciones.
