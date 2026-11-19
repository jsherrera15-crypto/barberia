/* Módulo: portada + servicios (la estructura está en index.html) */

/* Dibuja los servicios agrupados por categoría, filtrados por lo que se escribió en el buscador */
function pintarServicios(busqueda = "") {
  const lista = $("#listaServicios");
  const encontrados = db.services.filter((s) =>
    s.name.toLowerCase().includes(busqueda.toLowerCase()),
  );
  $("#sinResultados").hidden = encontrados.length > 0;
  lista.replaceChildren();

  [...new Set(encontrados.map((s) => s.category))].forEach((cat) => {
    const bloque = plantilla("tpl-categoria");
    const b = refs(bloque);
    b.titulo.textContent = cat;

    encontrados
      .filter((s) => s.category === cat)
      .forEach((s) => {
        const tarjeta = plantilla("tpl-servicio");
        const t = refs(tarjeta);
        t.nombre.textContent = s.name;
        t.duracion.textContent = dur(s.duration);
        t.precio.textContent = money(s.price);
        t.boton.addEventListener("click", () =>
          go(`pages/reservar.html?servicio=${s.id}`),
        );
        b.lista.append(tarjeta);
      });

    lista.append(bloque);
  });
}

appReady.then((ready) => {
  if (!ready) return;
  pintarRate($("#ratingGeneral"), avg(), "Aún sin calificaciones");
  pintarServicios();
  $("#buscar").addEventListener("input", (e) => pintarServicios(e.target.value));
  $("#btnReservar").addEventListener("click", () =>
    $("#serv").scrollIntoView({ behavior: "smooth" }),
  );
});
