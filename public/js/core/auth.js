/* Login y registro (modal): cliente por teléfono, equipo (admin/barbero) por correo y clave.
   El HTML del modal está en partials/auth-modal.html; aquí solo está la lógica. */
let authM,
  pendCb = null, // acción que se retoma al terminar el login (ej. agendar la cita)
  authVista = "in"; // pestaña activa: in (ingresar) · up (crear cuenta) · eq (equipo)

function openAuth(t, msg) {
  authM = authM || new bootstrap.Modal("#authM");
  authView(t, msg);
  authM.show();
}

/* Muestra una de las tres vistas del modal y limpia campos y errores */
function authView(t, msg = "") {
  authVista = t;
  const vista = $(`.auth-vista[data-vista="${t}"]`);
  $$(".auth-vista").forEach((v) => (v.hidden = v !== vista));
  $$("#authM [data-ir]").forEach((b) =>
    b.classList.toggle("active", b.dataset.ir === t),
  );
  $$("#authM input").forEach((i) => (i.value = ""));
  $("#authTitulo").textContent = vista.dataset.titulo;
  $("#authMensaje").textContent = msg || vista.dataset.mensaje;
  $("#authEnviar").textContent = vista.dataset.boton;
  $("#authError").textContent = "";
}

function auth(t) {
  const vista = $(`.auth-vista[data-vista="${t}"]`);
  const v = (campo) => ($(`[name="${campo}"]`, vista)?.value || "").trim(),
    err = (m) => ($("#authError").textContent = m);
  if (t === "eq") {
    const a = db.admin,
      b = db.barberos.find(
        (x) =>
          x.activo && x.correo === v("correo") && x.password === v("clave"),
      );
    if (a.correo === v("correo") && a.password === v("clave"))
      db.sesion = { rol: "admin" };
    else if (b) db.sesion = { rol: "barbero", id: b.id };
    else return err("Correo o contraseña incorrectos.");
    save();
    authM.hide();
    return go("pages/panel/citas.html");
  }
  const tel = v("tel").replace(/\D/g, "");
  if (tel.length < 7) return err("Escribe un teléfono válido.");
  if (t === "up") {
    if (v("nombre").length < 3 || !/^\S+@\S+\.\S+$/.test(v("correo")))
      return err("Completa tu nombre y un correo válido.");
    if (cl(tel))
      return err("Ese teléfono ya tiene cuenta. Usa la pestaña Ingresar.");
    db.clientes.push({
      tel,
      nombre: v("nombre"),
      correo: v("correo"),
      visitas: 0,
    });
  } else if (!cl(tel))
    return err("No encontramos ese número. Crea tu cuenta primero.");
  db.sesion = { rol: "cliente", tel };
  save();
  authM.hide();
  if (pendCb) {
    const f = pendCb;
    pendCb = null;
    mountTop();
    f();
  } else location.reload();
}

function salir() {
  db.sesion = null;
  save();
  go("index.html");
}

/* Eventos del modal */
$$("#authM [data-ir]").forEach((b) =>
  b.addEventListener("click", () => authView(b.dataset.ir)),
);
$("#authEnviar").addEventListener("click", () => auth(authVista));
