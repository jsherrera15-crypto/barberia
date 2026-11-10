/* Módulo: portada + servicios (la estructura está en index.html) */

/* Dibuja los servicios agrupados por categoría, filtrados por lo que se escribió en el buscador */
function pintarServicios(busqueda = "") {
  const lista = $("#listaServicios");
  const encontrados = db.servicios.filter((s) =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );
  $("#sinResultados").hidden = encontrados.length > 0;
  lista.replaceChildren();

  [...new Set(encontrados.map((s) => s.cat))].forEach((cat) => {
    const bloque = plantilla("tpl-categoria");
    const b = refs(bloque);
    b.titulo.textContent = cat;

    encontrados
      .filter((s) => s.cat === cat)
      .forEach((s) => {
        const tarjeta = plantilla("tpl-servicio");
        const t = refs(tarjeta);
        t.nombre.textContent = s.nombre;
        t.duracion.textContent = dur(s.duracion);
        t.precio.textContent = money(s.precio);
        t.boton.addEventListener("click", () =>
          go(`pages/reservar.html?servicio=${s.id}`),
        );
        b.lista.append(tarjeta);
      });

    lista.append(bloque);
  });
}

pintarRate($("#ratingGeneral"), avg(), "Aún sin calificaciones");
pintarServicios();

$("#buscar").addEventListener("input", (e) => pintarServicios(e.target.value));
$("#btnReservar").addEventListener("click", () =>
  $("#serv").scrollIntoView({ behavior: "smooth" }),
);
