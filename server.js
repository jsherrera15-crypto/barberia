/* Servidor local de Barbería El Corte (Node + Express).
   Por ahora solo sirve el frontend de la carpeta public/.
   Los datos siguen en localStorage (js/core/data.js); cuando exista la base de datos,
   las rutas de la API se agregan en el bloque marcado más abajo. */
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const PUBLIC = path.join(__dirname, "public");

/* Reemplaza <!-- @include partials/archivo.html --> por el contenido de ese archivo.
   Así la barra superior, el modal de acceso, etc. se escriben una sola vez. */
function armarHtml(html) {
  return html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_, ref) => {
    const archivo = path.join(PUBLIC, ref);
    if (!archivo.startsWith(PUBLIC + path.sep)) return "";
    try {
      return fs.readFileSync(archivo, "utf8");
    } catch {
      return `<!-- No se encontró ${ref} -->`;
    }
  });
}

/* Páginas HTML: se leen, se les insertan los fragmentos y se envían */
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  let ruta;
  try {
    ruta = decodeURIComponent(req.path);
  } catch {
    return next();
  }
  if (ruta === "/") ruta = "/index.html";
  if (!ruta.endsWith(".html")) return next();
  const archivo = path.join(PUBLIC, ruta);
  if (!archivo.startsWith(PUBLIC + path.sep)) return next();
  fs.readFile(archivo, "utf8", (err, html) => {
    if (err) return next();
    res.type("html").send(armarHtml(html));
  });
});

/* Archivos estáticos: css, js, imágenes */
app.use(express.static(PUBLIC));
app.get("/favicon.ico", (req, res) => res.sendStatus(204));

/* ───── Aquí irán las rutas de la API cuando exista la base de datos ─────
   app.use(express.json());
   app.use("/api/citas", require("./routes/citas"));
*/

const server = app.listen(PORT);
server.on("listening", () =>
  console.log(`Barbería El Corte lista en http://localhost:${PORT}`),
);
server.on("error", (e) => {
  if (e.code === "EADDRINUSE")
    console.error(
      `El puerto ${PORT} ya está en uso. Cierra el otro servidor o cambia el puerto (variable PORT).`,
    );
  else console.error(e);
  process.exit(1);
});
