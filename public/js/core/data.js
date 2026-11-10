/* Datos de prueba (localStorage) y reglas del negocio. Modelado según el diagrama ER.
   Cuando exista el backend, aquí se reemplaza localStorage por llamadas a la API.

   Nombres cortos que se usan en todo el proyecto:
   sv(id) servicio · br(id) barbero · cl(tel) cliente · me() cliente con sesión · staff() ¿admin o barbero?
   avg(id) promedio de calificaciones · slots() horas del barbero · estado() cambia estado de una cita */
const K = "barberia_front_v1";
function seed() {
  const m = new Date();
  m.setDate(m.getDate() + 1);
  const f = ymd(m),
    hor = { ini: "09:00", fin: "18:00", dias: [1, 2, 3, 4, 5, 6] };
  return {
    admin: { correo: "admin@barberia.com", password: "123456" },
    sesion: null,
    servicios: [
      {
        id: 1,
        cat: "Cortes",
        nombre: "Corte hombre",
        duracion: 40,
        precio: 25000,
      },
      {
        id: 2,
        cat: "Cortes",
        nombre: "Corte con cejas",
        duracion: 40,
        precio: 27000,
      },
      {
        id: 3,
        cat: "Cortes",
        nombre: "Corte niño",
        duracion: 40,
        precio: 25000,
      },
      { id: 4, cat: "Barba", nombre: "Barba", duracion: 20, precio: 10000 },
      {
        id: 5,
        cat: "Combos",
        nombre: "Corte con barba",
        duracion: 60,
        precio: 30000,
      },
      {
        id: 6,
        cat: "Combos",
        nombre: "Corte con barba y cejas",
        duracion: 60,
        precio: 32000,
      },
    ],
    barberos: [
      {
        id: 1,
        nombre: "Carlos Gómez",
        correo: "carlos@barberia.com",
        password: "123456",
        activo: true,
        horario: hor,
      },
      {
        id: 2,
        nombre: "Andrés Ríos",
        correo: "andres@barberia.com",
        password: "123456",
        activo: true,
        horario: hor,
      },
    ],
    clientes: [
      {
        tel: "3000000000",
        nombre: "Cliente de ejemplo",
        correo: "ejemplo@correo.com",
        visitas: 0,
      },
    ],
    citas: [
      {
        id: 1,
        tel: "3000000000",
        barberoId: 1,
        servicioId: 1,
        inicio: f + " 10:00",
        fin: f + " 10:40",
        precio: 25000,
        estado: "reservada",
      },
      {
        id: 2,
        tel: "3000000000",
        barberoId: 1,
        servicioId: 5,
        inicio: f + " 14:00",
        fin: f + " 15:00",
        precio: 30000,
        estado: "reservada",
      },
    ],
    calificaciones: [],
  };
}
let db;
try {
  db = JSON.parse(localStorage.getItem(K));
} catch {}
db = db || seed();
const save = () => localStorage.setItem(K, JSON.stringify(db));
const sv = (id) => db.servicios.find((s) => s.id == id),
  br = (id) => db.barberos.find((b) => b.id == id),
  cl = (t) => db.clientes.find((c) => c.tel === t);
const me = () => (db.sesion?.rol === "cliente" ? cl(db.sesion.tel) : null);
const staff = () => ["admin", "barbero"].includes(db.sesion?.rol);
const avg = (id) => {
  const r = db.calificaciones.filter((k) => !id || k.barberoId == id);
  return r.length
    ? {
        v: (r.reduce((s, k) => s + k.estrellas, 0) / r.length).toFixed(1),
        n: r.length,
      }
    : null;
};
/* Pinta la calificación (estrella + promedio + cantidad) dentro de un elemento.
   Las plantillas están en partials/rate.html. `vacio` es el texto cuando aún no hay calificaciones. */
function pintarRate(el, a, vacio = "Nuevo") {
  const nodo = plantilla(a ? "tpl-rate" : "tpl-rate-vacio");
  const r = refs(nodo);
  if (a) {
    r.v.textContent = a.v;
    r.n.textContent = a.n;
  } else r.texto.textContent = vacio;
  el.replaceChildren(nodo);
}

/* Horas del barbero en bloques de 30 min: ok=false si está ocupada o ya pasó */
function slots(b, f, d) {
  if (!b.horario.dias.includes(new Date(f + "T00:00:00").getDay())) return [];
  const now = new Date(),
    nm = now.getHours() * 60 + now.getMinutes(),
    hoy = f === ymd(now),
    out = [];
  const busy = db.citas
    .filter(
      (c) =>
        c.barberoId == b.id &&
        c.estado === "reservada" &&
        c.inicio.slice(0, 10) === f,
    )
    .map((c) => [mins(c.inicio.slice(11)), mins(c.fin.slice(11))]);
  for (let t = mins(b.horario.ini); t + d <= mins(b.horario.fin); t += 30)
    out.push({
      t: hm(t),
      ok: !(hoy && t <= nm) && !busy.some(([x, y]) => x < t + d && y > t),
    });
  return out;
}
function estado(id, e) {
  const x = db.citas.find((c) => c.id === id);
  x.estado = e;
  if (e === "completada") cl(x.tel).visitas++;
  save();
}
function calificar(id, n) {
  const x = db.citas.find((c) => c.id === id);
  db.calificaciones.push({
    citaId: id,
    barberoId: x.barberoId,
    estrellas: n,
    fecha: ymd(new Date()),
    cliente: cl(x.tel).nombre,
  });
  save();
}
