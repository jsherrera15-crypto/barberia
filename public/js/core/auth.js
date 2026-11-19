/* Inicio de sesión y registro: la autenticación y autorización se validan en el servidor. */
let authM,
  pendCb = null,
  authVista = "in";

function openAuth(view = "in", message = "") {
  authM = authM || new bootstrap.Modal("#authM");
  authView(view, message);
  authM.show();
}

function authView(view, message = "") {
  authVista = view;
  const active = $(`.auth-vista[data-vista="${view}"]`);
  $$(".auth-vista").forEach((item) => (item.hidden = item !== active));
  $$("#authM [data-ir]").forEach((button) =>
    button.classList.toggle("active", button.dataset.ir === view),
  );
  $$("#authM input").forEach((input) => (input.value = ""));
  $("#authTitulo").textContent = active.dataset.titulo;
  $("#authMensaje").textContent = message || active.dataset.mensaje;
  $("#authEnviar").textContent = active.dataset.boton;
  $("#authError").textContent = "";
}

async function auth(view) {
  const panel = $(`.auth-vista[data-vista="${view}"]`);
  const value = (name) => $(`[name="${name}"]`, panel)?.value.trim() || "";
  const button = $("#authEnviar");
  button.disabled = true;
  try {
    let result;
    if (view === "up") {
      result = await api("/api/auth/register", {
        method: "POST",
        body: { name: value("nombre"), phone: value("tel"), email: value("correo"), password: value("clave") },
      });
    } else {
      result = await api("/api/auth/login", {
        method: "POST",
        body: { identifier: view === "in" ? value("tel") : value("correo"), password: value("clave") },
      });
    }
    db.user = result.user;
    authM.hide();
    mountTop();
    if (pendCb) {
      const callback = pendCb;
      pendCb = null;
      return callback();
    }
    if (db.user.role !== "cliente") return go("pages/panel/citas.html");
    location.reload();
  } catch (error) {
    $("#authError").textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function salir() {
  try {
    await api("/api/auth/logout", { method: "POST" });
    db.user = null;
    go("index.html");
  } catch (error) {
    toast(error.message);
  }
}

$("#authM [data-ir]")?.closest(".nav")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ir]");
  if (button) authView(button.dataset.ir);
});
$("#authEnviar")?.addEventListener("click", () => auth(authVista));
$("#authM")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    auth(authVista);
  }
});
