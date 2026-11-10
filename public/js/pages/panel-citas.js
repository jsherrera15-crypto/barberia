/* Módulo del panel: citas (admin ve todas, barbero solo las suyas).
   La estructura está en pages/panel/citas.html */
function render() {
  if (!panelHead("citas")) return;
  const ad = db.sesion.rol === "admin",
    citas = db.citas
      .filter((c) => ad || c.barberoId === db.sesion.id)
      .sort((a, b) => a.inicio.localeCompare(b.inicio));

  const filas = $("#filas");
  filas.replaceChildren();
  if (!citas.length) filas.append(plantilla("tpl-fila-vacia"));

  citas.forEach((c) => {
    const fila = plantilla("tpl-fila");
    const t = refs(fila);
    t.dia.textContent = c.inicio.slice(0, 10);
    t.hora.textContent = h12(c.inicio.slice(11));
    t.cliente.textContent = cl(c.tel)?.nombre ?? "";
    t.tel.textContent = c.tel;
    if (ad) t.barbero.textContent = br(c.barberoId).nombre;
    else t.barbero.remove();
    t.servicio.textContent = sv(c.servicioId).nombre;
    t.estado.classList.add("e-" + c.estado);
    t.estado.textContent = c.estado.replace("_", " ");

    /* Solo las citas reservadas tienen botones: Completar, No asistió y Cancelar */
    if (c.estado === "reservada") {
      const acciones = plantilla("tpl-acciones-cita");
      $$("[data-estado]", acciones).forEach((boton) =>
        boton.addEventListener("click", () => {
          estado(c.id, boton.dataset.estado);
          render();
        }),
      );
      t.acciones.append(acciones);
    }
    filas.append(fila);
  });
}

render();
