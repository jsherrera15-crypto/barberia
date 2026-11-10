/* Layout compartido: acciones de la barra superior y control de acceso del panel.
   El HTML está en partials/navbar.html, panel-head.html y panel-sin-acceso.html */

/* Barra superior: elige la variante según quién tenga la sesión iniciada */
function mountTop() {
  const cliente = me();
  const nodo = plantilla(
    "tpl-nav-" + (cliente ? "cliente" : staff() ? "equipo" : "anon"),
  );
  const r = refs(nodo);
  if (cliente) r.nombre.textContent = cliente.nombre.split(" ")[0];
  r.entrar?.addEventListener("click", () => openAuth("in"));
  r.salir?.addEventListener("click", salir);
  $("#topActions").replaceChildren(nodo);
}

/* Control de acceso del panel: muestra el contenido o el aviso "Acceso solo para el equipo".
   Devuelve true si hay acceso. soloAdmin=true para las pantallas exclusivas del administrador */
function panelHead(active, soloAdmin = false) {
  const admin = db.sesion?.rol === "admin";
  const acceso = soloAdmin ? admin : staff();
  $("#panelSinAcceso").hidden = acceso;
  $("#panel").hidden = !acceso;
  if (!acceso) return false;
  $("#panelTitulo").textContent = admin
    ? "Panel del administrador"
    : "Mi agenda, " + br(db.sesion.id).nombre.split(" ")[0];
  $$("#panel [data-tab]").forEach((a) =>
    a.classList.toggle("active", a.dataset.tab === active),
  );
  if (!admin) $$("#panel [data-admin]").forEach((e) => e.remove());
  return true;
}

mountTop();
$("#btnPanelLogin")?.addEventListener("click", () => openAuth("eq"));
document.addEventListener("DOMContentLoaded", () =>
  document.body.classList.add("listo"),
);
