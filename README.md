# Tacos Joya de Cerén

Aplicación web de gestión interna para Tacos Joya de Cerén, un restaurante mexicano de origen familiar. El proyecto busca apoyar la organización del trabajo, la estandarización de recetas y el seguimiento de ventas, consumo de ingredientes y desperdicios para tomar decisiones sobre la operación del negocio.

Su identidad visual parte de la historia y los valores del restaurante: familia, tradición y responsabilidad. La interfaz utiliza una paleta de crema, azul, rojo, amarillo maíz y verde, compartida entre los módulos.

## Contexto del proyecto

Este repositorio corresponde a un proyecto universitario. En la fase 2 se desarrolla un primer avance funcional con HTML5, CSS3 y JavaScript vanilla, diseño responsive y autenticación simulada. Esta base servirá para continuar el sistema con un framework JavaScript en la fase 3.

## Cómo funciona

1. El usuario abre la pantalla de inicio de sesión e ingresa su correo, contraseña y perfil. También puede registrar una cuenta; el registro de administrador solicita una clave adicional de demostración.
2. La aplicación valida los datos y guarda la sesión en el navegador. El administrador ingresa al Dashboard y el empleado a Mis turnos. Abrir `index.html` también dirige a la pantalla correspondiente o al login si no hay sesión.
3. Desde el menú lateral se accede a los módulos. Dashboard, Reportes y Abastecimiento requieren el rol de administrador; Recetas, Mermas y Turnos requieren una sesión activa.
4. Las operaciones implementadas de recetas, turnos, solicitudes y registro de mermas se almacenan localmente. Los indicadores de Dashboard y Reportes todavía utilizan ejemplos independientes de esos registros.
5. El botón **Cerrar sesión** elimina la sesión activa y vuelve al login, conservando los datos guardados de los módulos.

## Roles de usuario

| Perfil | Funciones implementadas |
| --- | --- |
| Administrador | Consultar Dashboard y Reportes; crear, consultar, editar y eliminar recetas y turnos; revisar costos de recetas; aceptar o rechazar solicitudes de días libres. |
| Empleado | Consultar recetas e instrucciones de preparación, ver sus turnos, enviar solicitudes de días libres y registrar mermas desde Turnos. |

El administrador ve el menú completo. El empleado ve **Mis turnos, Recetas, Inventario y Mermas**, en ese orden. Inventario aparece deshabilitado mientras se desarrolla su vista para empleados; la vista actual sigue siendo exclusiva del administrador. La plantilla obtiene el rol desde la sesión y las páginas protegidas comprueban también el acceso por URL.

## Módulos

### Autenticación

Incluye inicio de sesión, registro, validación de campos y diferenciación entre administrador y empleado. La sesión se guarda en `localStorage` y se consulta mediante `js/guard.js`. Si se intenta acceder a una página protegida sin sesión, la aplicación redirige al login; si un empleado intenta entrar a Dashboard o Reportes, vuelve a Mis turnos.

### Dashboard

Presenta un resumen de operación: ventas previstas, consumo esperado, merma semanal, cobertura de insumos, gráfica de ventas, alertas, abastecimiento previsto y pedidos de clientes. Actualmente sus valores son datos de demostración.

### Recetas y fichas técnicas

Permite buscar recetas por nombre o ingrediente, filtrar por categoría y estado, y consultar ingredientes, cantidades, rendimiento y preparación. El administrador puede crear, editar y eliminar recetas, además de consultar costos totales, costos por porción y margen por porción cuando corresponde. Los empleados tienen una vista de consulta sin las acciones administrativas ni los costos.

Las recetas se guardan en el navegador. El catálogo de insumos y sus costos de referencia están definidos en el código para este avance.

### Turnos y días libres

El administrador dispone de un calendario semanal para crear, editar y eliminar turnos, asignar empleados y estaciones de trabajo, y configurar recurrencia semanal. También puede aceptar o rechazar solicitudes de días libres.

El empleado consulta su calendario, envía solicitudes y revisa su estado. Desde esta pantalla puede registrar una merma indicando producto, cantidad, fecha y motivo. Los registros se guardan localmente.

### Reportes de operación

Disponible para administradores. Incluye:

- Filtros de últimos 7 o 30 días y selección de insumo.
- Indicadores de tacos vendidos, kilos y costo estimado de merma, y eficiencia de porción.
- Gráfica de ventas diarias, con desplazamiento horizontal interno para los 30 días.
- Gráfica de merma acumulada por ingrediente y tablas desplegables con los valores.
- Demanda prevista para los próximos 7 días, calculada con el promedio histórico de cada día de la semana dentro del período seleccionado.
- Hallazgo operativo que identifica el ingrediente con mayor merma y presenta una sugerencia de revisión; contempla registros ausentes, merma cero y empates.

El período afecta los indicadores y las gráficas. El filtro de insumo se aplica a mermas, eficiencia y hallazgo; las ventas y la demanda mantienen el total del negocio. La eficiencia se calcula como **consumo estándar ÷ consumo real × 100**; cuando no hay consumo real, se muestra «Sin datos».

Reportes utiliza datos de demostración. Todavía no toma automáticamente las recetas ni las mermas registradas en los demás módulos.

### Mermas y Abastecimiento

Sus páginas independientes muestran la plantilla y un aviso de funcionalidad pendiente; Abastecimiento es exclusivo del administrador. Por ahora, el registro de mermas está disponible en la vista del empleado en Turnos y el Dashboard muestra un ejemplo de abastecimiento previsto.

## Tecnologías

- **HTML5 y CSS3:** estructura y estilos de las pantallas.
- **Bootstrap 5.3.8:** distribución responsive, navegación móvil y componentes de interfaz.
- **JavaScript vanilla:** validaciones, cálculos y comportamiento de los módulos.
- **Chart.js 4.5.1:** gráficas de Dashboard y Reportes.
- **localStorage:** persistencia local de datos y sesión simulada.
- **Git y GitHub:** control de versiones y colaboración mediante ramas y pull requests.

## Ejecutar en local

1. Clona el repositorio y abre la carpeta en Visual Studio Code:

   ```bash
   git clone https://github.com/Jexxe0012/tacos-joya-de-ceren.git
   cd tacos-joya-de-ceren
   ```

2. Inicia un servidor local, por ejemplo con la extensión **Live Server**.
3. Abre `index.html` para entrar según tu sesión, o `pages/login.html` para iniciar sesión. Si utiliza el puerto 5500, la dirección será `http://127.0.0.1:5500/pages/login.html`.
4. Inicia sesión con una cuenta de prueba o registra una cuenta.

No requiere instalar paquetes con npm ni ejecutar un proceso de compilación. Se necesita JavaScript habilitado y conexión a internet para cargar Bootstrap y Chart.js desde sus CDN.

### Cuentas de demostración

| Perfil | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@joyadeceren.sv` | `admin123` |
| Empleado | `empleado@joyadeceren.sv` | `empleado123` |

Estas cuentas se crean al cargar el login si la colección de usuarios está vacía. Son cuentas de prueba para la presentación del proyecto.

## Organización del repositorio

| Ruta | Contenido |
| --- | --- |
| `pages/` | Pantallas de login, dashboard, recetas, turnos, reportes y módulos pendientes. |
| `css/main.css` | Paleta de colores y estilos compartidos. |
| `css/` | Estilos específicos de cada módulo. |
| `js/main.js` | Menú lateral, barra superior y cierre de sesión compartidos. |
| `js/storage.js` | Operaciones de lectura, creación, actualización y eliminación de colecciones en localStorage. |
| `js/guard.js` | Comprobaciones de sesión y rol. |
| `js/login.js`, `js/recetas.js`, `js/turnos.js` | Lógica de autenticación y gestión. |
| `js/dashboard.js`, `js/reportes.js`, `js/reportes-graficas.js` | Indicadores, cálculos y gráficas. |

## Estado y próximos pasos

El avance incluye autenticación simulada, vistas por rol, gestión local de recetas y turnos, y visualización de indicadores y reportes. Queda pendiente completar Mermas y Abastecimiento e integrar los datos entre módulos para sustituir los ejemplos de Dashboard y Reportes.

Los datos pertenecen al navegador y al origen utilizado: cambiar de navegador, equipo, dominio o puerto no comparte automáticamente la información. Cerrar sesión conserva los registros; borrar el almacenamiento del sitio los elimina.

La aplicación todavía no cuenta con servidor ni base de datos remota. La autenticación con localStorage corresponde al prototipo académico; la validación de permisos y el almacenamiento de credenciales deberán trasladarse al servidor antes de un uso real.
