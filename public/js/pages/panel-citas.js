/* Agenda de administración o barbero. El backend filtra y valida cada operación. */
async function render() {
  if (!panelHead("citas")) return;
  const { appointments } = await api("/api/staff/appointments");
  const rows = $("#filas");
  rows.replaceChildren();
  if (!appointments.length) {
    const empty = plantilla("tpl-fila-vacia");
    if (db.user.role !== "admin") $("td", empty).colSpan = 5;
    rows.append(empty);
  }

  appointments.forEach((appointment) => {
    const row = plantilla("tpl-fila");
    const ref = refs(row);
    ref.dia.textContent = appointment.startsAt.slice(0, 10);
    ref.hora.textContent = h12(appointment.startsAt.slice(11));
    ref.cliente.textContent = appointment.clientName;
    ref.tel.textContent = appointment.clientPhone || "";
    if (db.user.role === "admin") ref.barbero.textContent = appointment.barberName;
    else ref.barbero.remove();
    ref.servicio.textContent = appointment.serviceName;
    ref.estado.classList.add("e-" + appointment.status);
    ref.estado.textContent = appointment.status.replace("_", " ");

    if (appointment.status === "reservada") {
      const actions = plantilla("tpl-acciones-cita");
      $$('[data-estado]', actions).forEach((button) => button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const result = await api(`/api/staff/appointments/${appointment.id}/status`, {
            method: "PATCH", body: { status: button.dataset.estado },
          });
          toast(result.message);
          await render();
        } catch (error) {
          toast(error.message);
          button.disabled = false;
        }
      }));
      ref.acciones.append(actions);
    }
    rows.append(row);
  });
}

whenReady(render);
