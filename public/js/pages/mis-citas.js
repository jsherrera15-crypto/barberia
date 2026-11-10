/* Módulo: mis citas del cliente, cancelar y calificar (la estructura está en pages/mis-citas.html) */
function render() {
  const c = me();
  $("#sinSesion").hidden = !!c;
  $("#contenido").hidden = !c;
  if (!c) return;

  const citas = db.citas
    .filter((x) => x.tel === c.tel)
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  $("#sinCitas").hidden = citas.length > 0;

  const lista = $("#listaCitas");
  lista.replaceChildren();
  citas.forEach((x) => {
    const nodo = plantilla("tpl-cita");
    const t = refs(nodo);
    const fecha = new Date(x.inicio.replace(" ", "T")).toLocaleDateString(
      "es-CO",
      { weekday: "long", day: "numeric", month: "long" },
    );
    t.servicio.textContent = sv(x.servicioId).nombre;
    t.barbero.textContent = br(x.barberoId).nombre;
    t.detalle.textContent = `${fecha} · ${h12(x.inicio.slice(11))} · ${money(x.precio)}`;
    t.estado.classList.add("e-" + x.estado);
    t.estado.textContent = x.estado.replace("_", " ");

    /* Acciones según el estado de la cita */
    if (x.estado === "reservada") {
      const cancelar = plantilla("tpl-cancelar");
      $("button", cancelar).addEventListener("click", () => {
        estado(x.id, "cancelada");
        render();
      });
      t.acciones.append(cancelar);
    }
    if (x.estado === "completada") {
      const k = db.calificaciones.find((r) => r.citaId === x.id);
      if (k) {
        const calificada = plantilla("tpl-calificada");
        refs(calificada).estrellas.textContent = "★".repeat(k.estrellas);
        t.acciones.append(calificada);
      } else {
        const formCalificar = plantilla("tpl-calificar");
        $$("button", formCalificar).forEach((boton, i) =>
          boton.addEventListener("click", () => {
            calificar(x.id, i + 1);
            toast("¡Gracias por calificar!");
            render();
          }),
        );
        t.acciones.append(formCalificar);
      }
    }
    lista.append(nodo);
  });
}

$("#btnAcceder").addEventListener("click", () => openAuth("in"));
render();
