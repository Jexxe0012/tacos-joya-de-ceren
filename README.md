# Tacos Joya de Cerén

## Integrantes

| Nombre completo | Carné |
| --- | --- |
| Alexander Josué Menjívar | MG202784 |
| Carlos Alexander Rosales Ascencio | RA262936 |
| Diego Armando Henríquez Fuentes | HF261938 |
| José Ricardo Sandoval Hernández | SH262272 |
| Josué Israel Sandoval Alfaro | SA260082 |
| Nicolas Alejandro Trigueros Molina | TM253158 |

## Descripción técnica del proyecto

Aplicación web de gestión interna para Tacos Joya de Cerén, un restaurante mexicano de origen familiar. El proyecto busca apoyar la organización del trabajo, la estandarización de recetas y el seguimiento de ventas, consumo de ingredientes y desperdicios para tomar decisiones sobre la operación del negocio.

Su identidad visual parte de la historia y los valores del restaurante: familia, tradición y responsabilidad. La interfaz utiliza una paleta de crema, azul, rojo, amarillo maíz y verde, compartida entre los módulos.

## Contexto del proyecto

Este repositorio corresponde a un proyecto universitario. La fase 2 estableció la estructura con HTML5, CSS3, JavaScript vanilla, Bootstrap y autenticación simulada. En el primer avance de la etapa 3 se incorporan gráficas funcionales, diálogos y validaciones compartidos, reportes desde registros guardados y exportación a PDF mediante librerías JavaScript.

## Cómo funciona

1. El usuario abre la pantalla de inicio de sesión e ingresa su correo, contraseña y perfil. También puede registrar una cuenta; el registro de administrador solicita una clave adicional de demostración.
2. La aplicación valida los datos y guarda la sesión en el navegador. El administrador ingresa al Dashboard y el empleado a Mis turnos. Abrir `index.html` también dirige a la pantalla correspondiente o al login si no hay sesión.
3. Desde el menú lateral se accede a los módulos. Dashboard, Reportes y Abastecimiento requieren el rol de administrador; Recetas, Inventario, Mermas y Turnos requieren una sesión activa, con funciones diferenciadas según el perfil.
4. Las recetas, turnos, solicitudes, productos, movimientos de inventario, ventas y mermas se almacenan localmente. Registrar una merma desde el módulo Mermas descuenta la existencia del producto y genera un movimiento de salida. Reportes consulta las ventas y mermas guardadas, y utiliza los catálogos de Recetas e Inventario. Dashboard utiliza las recetas para estimar el consumo; sus demás indicadores todavía incluyen datos de demostración.
5. El botón **Cerrar sesión** pide confirmación con SweetAlert2. Cancelar mantiene la sesión; confirmar elimina únicamente la sesión activa y vuelve al login, conservando los datos de los módulos. Si no se puede mostrar la confirmación, la sesión se conserva.

## Roles de usuario

| Perfil | Funciones implementadas |
| --- | --- |
| Administrador | Consultar Dashboard, Reportes y Abastecimiento; gestionar recetas, turnos y productos de inventario; registrar movimientos y mermas; revisar costos y alertas; aceptar o rechazar solicitudes de días libres. |
| Empleado | Consultar recetas, existencias y estados de inventario; ver sus turnos; enviar solicitudes de días libres y registrar mermas. |

El administrador ve el menú completo. El empleado ve **Mis turnos, Recetas, Inventario y Mermas**, en ese orden. Inventario ya dispone de una vista de consulta para empleados, sin las acciones administrativas de productos y movimientos. La plantilla obtiene el rol desde la sesión y las páginas protegidas comprueban también el acceso por URL.

## Módulos

### Autenticación

Incluye inicio de sesión, registro, validación de campos y diferenciación entre administrador y empleado. La sesión se guarda en `localStorage` y se consulta mediante `js/guard.js`. Si se intenta acceder a una página protegida sin sesión, la aplicación redirige al login; si un empleado intenta entrar a Dashboard o Reportes, vuelve a Mis turnos.

### Dashboard

Presenta un resumen de operación: ventas previstas, consumo esperado, merma semanal, cobertura de insumos, gráfica de ventas, alertas, abastecimiento previsto y pedidos de clientes. El consumo esperado se calcula desde las recetas de tacos activas guardadas en el navegador: distribuye 162 ventas previstas entre ellas y estima las cantidades de res, pastor, pollo y queso según su rendimiento. Incluye un detalle por insumo y un estado sin datos cuando no hay recetas activas. Las 162 ventas previstas y los demás indicadores continúan siendo datos de demostración.

### Recetas y fichas técnicas

Permite buscar recetas por nombre o ingrediente, filtrar por categoría y estado, y consultar ingredientes, cantidades, rendimiento y preparación. El administrador puede crear, editar y eliminar recetas, además de consultar costos totales, costos por porción y margen por porción cuando corresponde. Los empleados tienen una vista de consulta sin las acciones administrativas ni los costos.

Las recetas se guardan en el navegador. El catálogo de insumos y sus costos de referencia están definidos en el código para este avance.

### Turnos y días libres

El administrador dispone de un calendario semanal para crear, editar y eliminar turnos, asignar empleados y estaciones de trabajo, y configurar recurrencia semanal. También puede aceptar o rechazar solicitudes de días libres.

El empleado consulta su calendario, envía solicitudes y revisa su estado. Turnos conserva un formulario rápido de merma con producto, cantidad, fecha y motivo, guardado en la colección compartida de mermas. Ese formulario todavía no descuenta existencias; para registrar una pérdida vinculada al inventario se utiliza el módulo Mermas.

### Reportes de operación

Disponible para administradores. Consulta las colecciones guardadas mediante `DB` y no genera ventas ni mermas de demostración. Incluye:

- Filtros de últimos 7 o 30 días, o rango personalizado de hasta 90 días inclusive. Valida fechas existentes, orden correcto y ausencia de fechas futuras.
- Filtro de receta vendida obtenido del catálogo de Recetas: tacos, bebidas y complementos. También permite consultar recetas inactivas y ventas históricas de recetas eliminadas. Crear una receta no registra ventas.
- Filtro independiente de producto de merma, obtenido de Inventario y de los registros históricos.
- Unidades vendidas e ingresos registrados, gráfica diaria de líneas e ingresos por receta en barras horizontales. Los períodos largos conservan cada día con desplazamiento interno.
- Mermas por producto, con alternancia entre kg y USD y tablas de cantidades en su unidad original. Convierte kg, g y lb; no convierte litros, unidades o empaques a peso sin una equivalencia conocida. El costo se estima con el costo unitario actual de Inventario, convirtiendo unidades compatibles.
- Demanda para los 7 días posteriores al período, calculada con el promedio de ventas registradas de cada día de la semana. La ausencia de registros se muestra como «Sin datos», sin inventar ventas de cero.
- Hallazgo operativo que identifica el producto con mayor merma conocida en kg y contempla empates, registros ausentes y unidades sin conversión.
- Descarga PDF con marca, período, fecha local, usuario, filtros aplicados, indicadores, tablas y gráficas. Exporta el reporte aplicado, aunque los campos se hayan editado después; divide las series extensas en partes legibles. El nombre es `reporte-tjc-AAAA-MM-DD.pdf`.

La receta seleccionada filtra ventas, ingresos y demanda. El producto seleccionado filtra las mermas y el hallazgo de forma independiente: las mermas todavía no se pueden atribuir a una receta. Los registros inválidos se omiten con aviso; los pesos o costos incompletos se indican como parciales y las ventas marcadas con `ejemplo: true` se identifican en pantalla y PDF.

La eficiencia de porción muestra «Sin datos» hasta que el equipo defina la relación entre los insumos de Recetas y los productos de Inventario, y cómo distinguir el consumo real de cocina en Movimientos. No se infiere una relación por nombres ni se muestra un porcentaje ficticio.

Si Chart.js no carga, las tablas permiten consultar los valores. Si jsPDF no carga, se desactiva la descarga y se muestra un aviso. El lector de ventas ya sigue el contrato acordado a continuación; falta comprobarlo con el módulo de Ventas de Carlos cuando se integre.

### Inventario

Mantiene productos con categoría, unidad, existencia, mínimo, costo y datos de ubicación o caducidad. El administrador puede buscar y filtrar productos, crearlos, editarlos y eliminarlos, registrar entradas, salidas y ajustes, y consultar movimientos y alertas de existencias o vencimiento.

El empleado dispone de una vista de consulta con búsqueda, filtros, cantidades disponibles y estados de los productos. Las acciones administrativas no se muestran en ese perfil. Los productos y su historial se guardan en las colecciones `inventario` y `movimientos` de localStorage.

### Mermas

Permite seleccionar un producto del inventario y registrar la cantidad perdida, el motivo, el responsable y observaciones. Valida los campos obligatorios, que la cantidad sea positiva y que no exceda las existencias disponibles.

Al guardar, actualiza la cantidad del producto, crea un movimiento de salida con motivo «Merma o desperdicio» y conserva el registro en la colección `mermas`. La pantalla muestra indicadores semanales y un historial reciente. Comparte la colección con el registro rápido de Turnos, aunque solo el formulario de Mermas realiza el descuento de inventario.

### Abastecimiento

Disponible para administradores. Permite elegir un insumo, fecha de compra, cantidad comprada y consumo estándar por taco. Con esos valores calcula el consumo diario estimado, los días de cobertura, la fecha prevista de agotamiento y una fecha sugerida de recompra. Incluye una gráfica de demanda, alertas y una tabla de cobertura por insumo.

La proyección utiliza una serie de ventas y un catálogo de insumos definidos como ejemplos en el código. Todavía no consulta automáticamente las existencias de Inventario ni los datos de Reportes, y no guarda pedidos de compra.

## Arquitectura y almacenamiento

La aplicación se ejecuta en el navegador. Cada página HTML carga los estilos compartidos y la lógica JavaScript de su módulo. `main.js` construye la navegación según el rol y `guard.js` comprueba la sesión antes de acceder a las páginas protegidas.

`storage.js` expone el objeto `DB`, que permite consultar, crear, actualizar, eliminar y cargar datos iniciales en colecciones JSON dentro de localStorage. La información se organiza en `usuarios`, `recetas`, `turnos`, `solicitudes`, `inventario`, `movimientos`, `ventas` y `mermas`; la sesión activa utiliza la clave `sesion`.

Las integraciones actuales son Recetas → consumo esperado del Dashboard; Inventario → registro de Mermas → actualización de existencias y movimientos; y Ventas + Mermas + catálogos de Recetas e Inventario → Reportes. Abastecimiento y parte del Dashboard mantienen fuentes de demostración. El módulo de Ventas y su enlace en el menú se incorporarán cuando el responsable lo entregue y solicite la integración.

### Contrato de ventas para la integración

Cada registro de la colección `ventas` representa una receta vendida. El módulo de Ventas debe guardar el ID de la receta, una copia de su nombre y el precio al momento de la venta; Reportes suma el `total` guardado, sin recalcularlo con precios posteriores.

```js
DB.create("ventas", {
  fecha: UI.fechaHoy(),             // Día local: AAAA-MM-DD.
  recetaId: receta.id,              // ID del catálogo de Recetas.
  recetaNombre: receta.nombre,      // Nombre al momento de la venta.
  cantidad: 24,                    // Entero entre 1 y 500.
  precioUnitario: 1.25,             // Precio por porción al vender.
  total: 30.00,                    // Cantidad × precio, redondeado a 2 decimales.
  registradoPor: Guard.getSesion().id,
  creadoEn: new Date().toISOString(), // Marca de tiempo; no es el día del reporte.
  ejemplo: false                   // true solo para datos de demostración.
});
```

`DB.create` genera el `id`. Usa `UI.fechaHoy()` para el día local: `toISOString().slice(0, 10)` trabaja en UTC y puede devolver el día siguiente después de las 6 p. m. en El Salvador. Reportes vuelve a consultar el almacenamiento al abrir la pantalla o aplicar filtros; no requiere copiar datos desde Recetas ni introducir cifras en las gráficas.

## Tecnologías

- **HTML5 y CSS3:** estructura y estilos de las pantallas.
- **Bootstrap 5.3.8:** distribución responsive, navegación móvil y componentes de interfaz.
- **JavaScript vanilla:** validaciones, cálculos y comportamiento de los módulos.
- **Chart.js 4.5.1:** gráficas de Dashboard y Reportes.
- **SweetAlert2 11.26.25:** diálogos y avisos mediante `UI.exito`, `UI.error`, `UI.aviso` y `await UI.confirmar`.
- **jsPDF 4.2.1:** generación y descarga del reporte PDF en el navegador.
- **localStorage:** persistencia local de datos y sesión simulada.
- **Git y GitHub:** control de versiones y colaboración mediante ramas y pull requests.

`js/ui.js` centraliza los mensajes y la fecha local. SweetAlert2 muestra un diálogo a la vez: las acciones encadenadas esperan su resultado con `await`. Los mensajes utilizan tuteo. `js/validacion.js` comparte reglas, errores junto a cada campo y bloqueo de botones; `Valida.enVivo(form, reglas)` devuelve `validarTodo()` para comprobar el formulario en el envío. Las páginas cargan ambos archivos antes de la lógica de su módulo.

## Ejecutar en local

1. Clona el repositorio y abre la carpeta en Visual Studio Code:

   ```bash
   git clone https://github.com/Jexxe0012/tacos-joya-de-ceren.git
   cd tacos-joya-de-ceren
   ```

2. Inicia un servidor local, por ejemplo con la extensión **Live Server**.
3. Abre `index.html` para entrar según tu sesión, o `pages/login.html` para iniciar sesión. Si utiliza el puerto 5500, la dirección será `http://127.0.0.1:5500/pages/login.html`.
4. Inicia sesión con una cuenta de prueba o registra una cuenta.

No requiere instalar paquetes con npm ni ejecutar un proceso de compilación. Se necesita JavaScript habilitado y conexión a internet para cargar Bootstrap, SweetAlert2, Chart.js y jsPDF desde sus CDN.

### Cuentas de demostración

| Perfil | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@joyadeceren.sv` | `admin123` |
| Empleado | `empleado@joyadeceren.sv` | `empleado123` |

Estas cuentas se crean al cargar el login si la colección de usuarios está vacía. Son cuentas de prueba para la presentación del proyecto.

## Organización del repositorio

| Ruta | Contenido |
| --- | --- |
| `pages/` | Pantallas de login, dashboard, recetas, turnos, inventario, mermas, reportes y abastecimiento. |
| `css/main.css` | Paleta de colores y estilos compartidos. |
| `css/` | Estilos específicos de cada módulo. |
| `js/main.js` | Menú lateral, barra superior y cierre de sesión compartidos. |
| `js/storage.js` | Operaciones de lectura, creación, actualización y eliminación de colecciones en localStorage. |
| `js/guard.js` | Comprobaciones de sesión y rol. |
| `js/ui.js`, `js/validacion.js` | Diálogos, avisos, fecha local y validaciones compartidas. |
| `js/login.js`, `js/recetas.js`, `js/turnos.js` | Lógica de autenticación, recetas, horarios y solicitudes. |
| `js/inventario.js`, `js/mermas.js` | Productos, movimientos, consulta de existencias y registro de pérdidas. |
| `js/abastecimientos.js` | Cálculos de cobertura y proyección de recompra. |
| `js/dashboard.js`, `js/reportes.js`, `js/reportes-graficas.js` | Indicadores, filtros, lectura de registros, cálculos y gráficas. |
| `js/reportes-pdf.js` | Exportación del reporte aplicado a PDF. |

## Estado y próximos pasos

El avance incluye autenticación simulada, navegación por roles, gestión local de recetas, turnos e inventario, registro de mermas con descuento de existencias y consultas de indicadores, reportes y abastecimiento. Queda pendiente comprobar Reportes con el módulo de Ventas integrado, definir la relación Recetas–Inventario y el consumo real de cocina para calcular eficiencia, unificar la merma rápida de Turnos con Inventario y conectar Abastecimiento y los indicadores del Dashboard que aún utilizan ejemplos.

Los datos pertenecen al navegador y al origen utilizado: cambiar de navegador, equipo, dominio o puerto no comparte automáticamente la información. Cerrar sesión conserva los registros; borrar el almacenamiento del sitio los elimina.

La aplicación todavía no cuenta con servidor ni base de datos remota. La autenticación con localStorage corresponde al prototipo académico; la validación de permisos y el almacenamiento de credenciales deberán trasladarse al servidor antes de un uso real.
