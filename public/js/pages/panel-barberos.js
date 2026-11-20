/* Alta y baja lógica de cuentas de barbero (solo administrador). */
async function render() {
  if (!panelHead("barberos", true)) return;
  const { barbers } = await api("/api/staff/barbers");
  const list = $("#listaBarberos");
  list.replaceChildren();
  barbers.forEach((barber) => {
    const row = plantilla("tpl-barbero-fila");
    const ref = refs(row);
    ref.nombre.textContent = barber.name;
    ref.correo.textContent = barber.email;
    if (!barber.active) {
      ref.eliminar.remove();
      ref.correo.textContent += " · Inactivo";
    } else ref.eliminar.addEventListener("click", async () => {
      if (!confirm("¿Desactivar este barbero? Se conserva su historial de citas.")) return;
      try {
        await api(`/api/staff/barbers/${barber.id}`, { method: "DELETE" });
        await render();
      } catch (error) { toast(error.message); }
    });
    list.append(row);
  });
}

async function addBarber() {
  const body = {
    name: $("#nNombre").value.trim(),
    email: $("#nCorreo").value.trim(),
    password: $("#nClave").value,
  };
  $("#btnCrear").disabled = true;
  try {
    await api("/api/staff/barbers", { method: "POST", body });
    ["#nNombre", "#nCorreo", "#nClave"].forEach((selector) => ($(selector).value = ""));
    $("#errorBarbero").textContent = "";
    toast("Barbero creado");
    await render();
  } catch (error) {
    $("#errorBarbero").textContent = error.message;
  } finally { $("#btnCrear").disabled = false; }
}

$("#btnCrear").addEventListener("click", addBarber);
whenReady(render);
