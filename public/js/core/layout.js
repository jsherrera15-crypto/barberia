/* Barra superior y elementos comunes. La sesión viene del backend. */
function mountTop() {
  const cliente = me();
  const node = plantilla("tpl-nav-" + (cliente ? "cliente" : staff() ? "equipo" : "anon"));
  const refsNode = refs(node);
  if (cliente) refsNode.nombre.textContent = cliente.name.split(" ")[0];
  refsNode.entrar?.addEventListener("click", () => openAuth("in"));
  refsNode.registrar?.addEventListener("click", () => openAuth("up"));
  refsNode.salir?.addEventListener("click", salir);
  $("#topActions").replaceChildren(node);
}

function panelHead(active, soloAdmin = false) {
  const admin = db.user?.role === "admin";
  const access = soloAdmin ? admin : staff();
  $("#panelSinAcceso").hidden = access;
  $("#panel").hidden = !access;
  if (!access) return false;
  $("#panelTitulo").textContent = admin
    ? "Panel del administrador"
    : `Mi agenda, ${db.user.name.split(" ")[0]}`;
  $$("#panel [data-tab]").forEach((a) => a.classList.toggle("active", a.dataset.tab === active));
  if (!admin) $$("#panel [data-admin]").forEach((element) => element.remove());
  return true;
}

whenReady(() => {
  mountTop();
  $("#btnPanelLogin")?.addEventListener("click", () => openAuth("eq"));
  document.body.classList.add("listo");
});
