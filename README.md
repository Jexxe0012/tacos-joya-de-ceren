# tacos-joya-de-ceren
Proyecto universitario sobre análisis de datos, control de mermas y inventario para una taquería local.

## Diseño compartido

`index.html` es una plantilla de la estructura común, con el área de contenido vacía. No agrega una opción Inicio al menú. Los módulos reutilizan:

- `css/main.css`: paleta, menú lateral, barra superior, botones, paneles y formularios.
- `js/main.js`: genera el menú y la barra superior, y marca la página activa.
- Bootstrap 5.3.8: distribución responsive y apertura/cierre del menú móvil.

### Conectar una pantalla

1. Toma la estructura de `index.html` como plantilla para tu archivo dentro de `pages/`.
2. Cambia las rutas de los archivos comunes a `../css/main.css` y `../js/main.js`. Conserva los enlaces de Bootstrap.
3. En el `body`, conserva `class="app-page"` e indica tu módulo:

   ```html
   <body class="app-page" data-pagina="recetas" data-seccion="Gestión" data-rol="Dueño">
   ```

4. Conserva los contenedores `menu-lateral` y `barra-superior`, sus clases y los envoltorios `app-layout` y `app-area`. `main.js` genera su contenido; no copies el menú por separado.
5. Agrega el contenido de tu módulo dentro de `<main id="contenido-principal">`, incluyendo su `<h1>`. Actualiza también el `<title>`.
6. Si necesitas estilos o lógica propios, carga tu CSS después de `main.css` y tu JS después de `main.js`.

Los valores de `data-pagina` son `dashboard`, `recetas`, `mermas`, `turnos`, `reportes` y `abastecimientos`.
En la plantilla, `data-pagina=""` deja el menú sin una sección seleccionada.
`data-seccion` cambia la segunda parte de la ubicación mostrada en la barra superior.
`data-rol` es una etiqueta visual; todavía no implementa autenticación ni permisos.

Los enlaces generados por `main.js` funcionan desde la raíz, desde `pages/` y cuando se publica bajo una subcarpeta, como en GitHub Pages. No requiere `fetch`, npm ni un framework JavaScript.

### Clases reutilizables

| Elemento | Clases |
| --- | --- |
| Acción principal roja | `btn btn-app-primary` |
| Acción secundaria con borde azul | `btn btn-app-secondary` |
| Acción de confirmación verde | `btn btn-app-success` |
| Panel blanco con borde y esquinas redondeadas | `app-panel p-3 p-md-4` |
| Etiqueta de estado favorable | `badge rounded-pill app-estado app-estado-ok` |
| Etiqueta de atención | `badge rounded-pill app-estado app-estado-atencion` |
| Campos y listas | `form-control` y `form-select` de Bootstrap |

Por ejemplo:

```html
<section class="app-panel p-3 p-md-4">
  <h2 class="h5">Título de la sección</h2>
  <button class="btn btn-app-primary" type="submit">Guardar</button>
  <button class="btn btn-app-secondary" type="button">Cancelar</button>
</section>
```

Reportes ya utiliza esta estructura como ejemplo funcional. Cada compañero debe conectar su propia pantalla; las otras vistas aún pueden estar vacías. Bootstrap se carga desde CDN, por lo que se necesita internet.
