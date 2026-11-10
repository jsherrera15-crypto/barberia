/* Módulo del panel: crear y eliminar barberos (solo administrador).
   La estructura está en pages/panel/barberos.html */
function render() {
  if (!panelHead("barberos", true)) return;
  const lista = $("#listaBarberos");
  lista.replaceChildren();
  db.barberos
    .filter((b) => b.activo)
    .forEach((b) => {
      const fila = plantilla("tpl-barbero-fila");
      const t = refs(fila);
      t.nombre.textContent = b.nombre;
      t.correo.textContent = b.correo;
      t.eliminar.addEventListener("click", () => delB(b.id));
      lista.append(fila);
    });
}

function addB() {
  const n = $("#nNombre").value.trim(),
    c = $("#nCorreo").value.trim(),
    p = $("#nClave").value;
  const error = (m) => ($("#errorBarbero").textContent = m);
  if (!n || !/^\S+@\S+\.\S+$/.test(c) || p.length < 6)
    return error(
      "Escribe nombre, un correo válido y una contraseña de mínimo 6 caracteres.",
    );
  if (c === db.admin.correo || db.barberos.some((b) => b.correo === c))
    return error("Ese correo ya está registrado.");
  db.barberos.push({
    id: Date.now(),
    nombre: n,
    correo: c,
    password: p,
    activo: true,
    horario: { ini: "09:00", fin: "18:00", dias: [1, 2, 3, 4, 5, 6] },
  });
  save();
  toast("Barbero creado");
  ["#nNombre", "#nCorreo", "#nClave"].forEach((s) => ($(s).value = ""));
  error("");
  render();
}

function delB(id) {
  if (
    !confirm(
      "¿Eliminar este barbero? Se conserva su historial de citas y calificaciones.",
    )
  )
    return;
  br(id).activo = false;
  save();
  render();
}

$("#btnCrear").addEventListener("click", addB);
render();
