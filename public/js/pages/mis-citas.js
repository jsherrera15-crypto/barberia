/* Historial, cancelación y calificaciones del cliente con sesión. */
async function render() {
  const client = me();
  $("#sinSesion").hidden = !!client;
  $("#contenido").hidden = !client;
  if (!client) return;

  const { appointments } = await api("/api/appointments/mine");
  $("#sinCitas").hidden = appointments.length > 0;
  const list = $("#listaCitas");
  list.replaceChildren();
  appointments.forEach((appointment) => {
    const node = plantilla("tpl-cita");
    const ref = refs(node);
    const date = new Date(`${appointment.startsAt.replace(" ", "T")}:00`).toLocaleDateString("es-CO", {
      weekday: "long", day: "numeric", month: "long",
    });
    ref.servicio.textContent = appointment.serviceName;
    ref.barbero.textContent = appointment.barberName;
    ref.detalle.textContent = `${date} · ${h12(appointment.startsAt.slice(11))} · ${money(appointment.price)}`;
    ref.estado.classList.add("e-" + appointment.status);
    ref.estado.textContent = appointment.status.replace("_", " ");

    if (appointment.status === "reservada") {
      const cancel = plantilla("tpl-cancelar");
      $("button", cancel).addEventListener("click", async () => {
        try {
          await api(`/api/appointments/${appointment.id}/cancel`, { method: "PATCH" });
          await render();
        } catch (error) { toast(error.message); }
      });
      ref.acciones.append(cancel);
    }
    if (appointment.status === "completada") {
      if (appointment.rating) {
        const rated = plantilla("tpl-calificada");
        refs(rated).estrellas.textContent = "★".repeat(appointment.rating);
        ref.acciones.append(rated);
      } else {
        const form = plantilla("tpl-calificar");
        $$("button", form).forEach((button, index) => button.addEventListener("click", async () => {
          try {
            await api(`/api/appointments/${appointment.id}/rating`, {
              method: "POST", body: { stars: index + 1 },
            });
            toast("¡Gracias por calificar!");
            await render();
          } catch (error) { toast(error.message); }
        }));
        ref.acciones.append(form);
      }
    }
    list.append(node);
  });
}

$("#btnAcceder").addEventListener("click", () => openAuth("in"));
whenReady(render);
