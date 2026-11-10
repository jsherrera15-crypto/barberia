# Barbería El Corte

Frontend de reservas servido por un servidor **Node.js + Express** local.
Por ahora no hay base de datos: los datos de prueba viven en el `localStorage` del navegador.

## Cómo correrlo

Necesitas [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install      # solo la primera vez
npm start        # abre http://localhost:3000
```

Mientras trabajas puedes usar `npm run dev`: el servidor se reinicia solo cuando cambias `server.js`.
(Los cambios en `public/` solo requieren recargar el navegador.)

Si el puerto 3000 está ocupado, cambia `PORT` en `server.js` o define la variable de entorno `PORT`.

## Estructura

```
barberia-front/
├─ server.js                       Servidor Express (sirve public/ e inserta los partials)
├─ package.json
└─ public/                         Todo lo que ve el navegador
   ├─ index.html                   Portada + servicios
   ├─ pages/
   │  ├─ reservar.html             Barbero → día → hora → agendar
   │  ├─ mis-citas.html            Citas del cliente (cancelar y calificar)
   │  └─ panel/
   │     ├─ citas.html             Admin: todas · Barbero: las suyas
   │     ├─ barberos.html          Admin: crear y eliminar barberos
   │     └─ calificaciones.html    Admin: promedio y comentarios
   ├─ partials/                    HTML compartido (se escribe una sola vez)
   │  ├─ navbar.html               Barra superior y sus 3 variantes
   │  ├─ auth-modal.html           Modal de ingresar / crear cuenta / equipo
   │  ├─ panel-head.html           Título y pestañas del panel
   │  ├─ panel-sin-acceso.html     Aviso "Acceso solo para el equipo"
   │  └─ rate.html                 Estrella + promedio
   ├─ css/    base.css · cliente.css · panel.css
   └─ js/
      ├─ core/    utils.js · data.js · auth.js · layout.js
      └─ pages/   un archivo por página
```

## Cómo está dividido el trabajo

- **HTML = estructura (lo visual).** Cada página trae su maquetación completa. Los elementos que se repiten
  (una tarjeta de servicio, una fila de la tabla, una hora) están como `<template>` dentro del mismo HTML.
- **JavaScript = lógica (la interacción).** Los scripts copian esas plantillas con `plantilla("id")`, llenan los
  datos con `textContent` y conectan los clics con `addEventListener`. No hay HTML escrito dentro del JS.
- Los marcadores `data-ref="nombre"` dentro de una plantilla indican qué elemento se llena:
  `refs(nodo).nombre.textContent = "..."`.
- **Partials:** `<!-- @include partials/navbar.html -->` lo reemplaza `server.js` por el contenido del archivo
  antes de enviar la página. Por eso las páginas deben abrirse desde el servidor (no con doble clic al `.html`).

## Datos de prueba

`admin@barberia.com` y `carlos@barberia.com`, clave `123456`.
Clientes: cualquier teléfono nuevo se registra en "Crear cuenta"; el de ejemplo es `3000000000`.

`js/core/data.js` es el único lugar que habla con los datos: al conectar la base de datos se cambia ahí
(y se agregan las rutas `/api` en `server.js`).
