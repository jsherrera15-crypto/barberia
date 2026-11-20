/* Acceso al backend. El navegador solo conserva la sesión en una cookie HttpOnly. */
const db = { services: [], barbers: [], user: null, rating: null };

async function api(url, options = {}) {
  const { body, headers = {}, ...requestOptions } = options;
  const response = await fetch(url, {
    ...requestOptions,
    credentials: "same-origin",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}

const appReady = api("/api/bootstrap").then((data) => {
  Object.assign(db, {
    services: data.services,
    barbers: data.barbers,
    user: data.user,
    rating: data.rating,
  });
  return true;
}).catch((error) => {
  document.body.classList.add("listo");
  toast(`No se pudo conectar con el servidor: ${error.message}`);
  return false;
});

function whenReady(callback) {
  return appReady
    .then((ready) => (ready ? callback() : undefined))
    .catch((error) => toast(error.message));
}

const sv = (id) => db.services.find((s) => Number(s.id) === Number(id)),
  br = (id) => db.barbers.find((b) => Number(b.id) === Number(id)),
  me = () => db.user?.role === "cliente" ? db.user : null,
  staff = () => ["admin", "barbero"].includes(db.user?.role),
  avg = (id) => id ? br(id)?.rating ?? null : db.rating;

async function getSlots(barberId, serviceId, date) {
  const q = new URLSearchParams({ barberId, serviceId, date });
  return (await api(`/api/slots?${q}`)).slots;
}

function pintarRate(el, rating, vacio = "Nuevo") {
  const nodo = plantilla(rating ? "tpl-rate" : "tpl-rate-vacio");
  const r = refs(nodo);
  if (rating) {
    r.v.textContent = rating.value;
    r.n.textContent = rating.count;
  } else r.texto.textContent = vacio;
  el.replaceChildren(nodo);
}
