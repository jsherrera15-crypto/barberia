/* Promedios y comentarios resumidos para administración. */
async function render() {
  if (!panelHead("calificaciones", true)) return;
  const data = await api("/api/staff/ratings");
  const summary = $("#resumen");
  summary.replaceChildren();
  data.barbers.forEach((barber) => {
    const card = plantilla("tpl-resumen-barbero");
    const ref = refs(card);
    ref.nombre.textContent = barber.name;
    pintarRate(ref.rate, barber.rating);
    summary.append(card);
  });

  const list = $("#listaCalificaciones");
  list.replaceChildren();
  $("#sinCalificaciones").hidden = data.ratings.length > 0;
  data.ratings.forEach((rating) => {
    const row = plantilla("tpl-calificacion");
    const ref = refs(row);
    ref.estrellas.textContent = "★".repeat(rating.stars) + "☆".repeat(5 - rating.stars);
    ref.barbero.textContent = rating.barberName;
    ref.detalle.textContent = `por ${rating.clientName} el ${rating.date.slice(0, 10)}`;
    list.append(row);
  });
}

whenReady(render);
