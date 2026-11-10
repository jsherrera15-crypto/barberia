/* Módulo del panel: calificaciones de los clientes (solo administrador).
   La estructura está en pages/panel/calificaciones.html */
function render() {
  if (!panelHead("calificaciones", true)) return;

  /* Promedio por barbero */
  const resumen = $("#resumen");
  resumen.replaceChildren();
  db.barberos
    .filter((b) => b.activo)
    .forEach((b) => {
      const tarjeta = plantilla("tpl-resumen-barbero");
      const t = refs(tarjeta);
      t.nombre.textContent = b.nombre;
      pintarRate(t.rate, avg(b.id));
      resumen.append(tarjeta);
    });

  /* Lista de calificaciones, la más reciente primero */
  const lista = $("#listaCalificaciones");
  lista.replaceChildren();
  $("#sinCalificaciones").hidden = db.calificaciones.length > 0;
  db.calificaciones
    .slice()
    .reverse()
    .forEach((k) => {
      const fila = plantilla("tpl-calificacion");
      const t = refs(fila);
      t.estrellas.textContent = "★".repeat(k.estrellas) + "☆".repeat(5 - k.estrellas);
      t.barbero.textContent = br(k.barberoId).nombre;
      t.detalle.textContent = `por ${k.cliente} el ${k.fecha}`;
      lista.append(fila);
    });
}

render();
