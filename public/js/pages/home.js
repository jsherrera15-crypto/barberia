/* Módulo: portada + servicios (la estructura está en index.html) */

/* Dibuja los servicios agrupados por categoría. */
function pintarServicios() {
  const lista = $("#listaServicios");
  lista.replaceChildren();

  const categorias = new Map();
  db.services.forEach((service) => {
    if (!categorias.has(service.category)) categorias.set(service.category, []);
    categorias.get(service.category).push(service);
  });

  categorias.forEach((services, category) => {
    const bloque = plantilla("tpl-categoria");
    const b = refs(bloque);
    b.titulo.textContent = category;

    services.forEach((service) => {
      const tarjeta = plantilla("tpl-servicio");
      const t = refs(tarjeta);
      t.nombre.textContent = service.name;
      t.duracion.textContent = dur(service.duration);
      t.precio.textContent = money(service.price);
      t.boton.addEventListener("click", () =>
        go(`pages/reservar.html?servicio=${service.id}`),
      );
      b.lista.append(tarjeta);
    });

    lista.append(bloque);
  });
}

whenReady(() => {
  pintarRate($("#ratingGeneral"), avg(), "Aún sin calificaciones");
  pintarServicios();
  $("#btnReservar").addEventListener("click", () =>
    $("#serv").scrollIntoView({ behavior: "smooth" }),
  );
});
