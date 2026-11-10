/* Utilidades: selectores, plantillas del DOM, formato de fechas y dinero, navegación, avisos */
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ROOT = "/"; // el servidor Node entrega la carpeta public/ en la raíz

/* ───── DOM ───── */
const $ = (selector, desde = document) => desde.querySelector(selector);
const $$ = (selector, desde = document) => [...desde.querySelectorAll(selector)];

/* Copia una <template id="..."> del HTML lista para llenar y agregar a la página */
const plantilla = (id) => document.getElementById(id).content.cloneNode(true);

/* Devuelve los elementos marcados con data-ref="..." de un nodo: refs(n).nombre */
const refs = (nodo) =>
  Object.fromEntries($$("[data-ref]", nodo).map((e) => [e.dataset.ref, e]));

/* ───── Formato ───── */
const p2 = (n) => String(n).padStart(2, "0");
const money = (n) => "$ " + (+n).toLocaleString("es-CO");
const ymd = (d) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5),
  hm = (m) => `${p2(Math.floor(m / 60))}:${p2(m % 60)}`;
const h12 = (t) => {
  const h = +t.slice(0, 2);
  return `${h % 12 || 12}:${t.slice(3, 5)} ${h < 12 ? "am" : "pm"}`;
};
const dur = (m) => (m >= 60 ? "alrededor de 1 hora" : m + " minutos");

/* ───── Navegación y avisos ───── */
const go = (path) => (location.href = ROOT + path);
function toast(t) {
  const e = document.createElement("div");
  e.className = "toastx";
  e.textContent = t;
  document.body.append(e);
  setTimeout(() => e.remove(), 3500);
}
