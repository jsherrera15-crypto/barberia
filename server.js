"use strict";

const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { db, initializeDatabase, passwordHash } = require("./database");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, "public");
const SESSION_COOKIE = "barberia_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 14;
const COOKIE_SECURE = process.env.NODE_ENV === "production";
app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

function error(status, message) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
function text(value, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function validName(value) {
  return /\p{L}/u.test(value) && /^[\p{L}\p{M}\s.'’-]+$/u.test(value);
}
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function safeUser(row) {
  if (!row) return null;
  return { id: row.id, role: row.role, name: row.name, email: row.email, phone: row.phone };
}
function cookieOptions(maxAge) {
  return [
    `${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax",
    ...(COOKIE_SECURE ? ["Secure"] : []),
    `Max-Age=${Math.max(0, Math.floor(maxAge / 1000))}`,
  ].join("; ");
}
function requestToken(req) {
  return (req.headers.cookie || "").match(/(?:^|;\s*)barberia_session=([^;]+)/)?.[1] || "";
}
async function userFromRequest(req) {
  const token = requestToken(req);
  if (!token) return null;
  return dbGet(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`, [hashToken(token), Date.now()]);
}
async function requireUser(req, res, next) {
  req.user = await userFromRequest(req);
  if (!req.user) return res.status(401).json({ error: "Inicia sesión para continuar." });
  next();
}
function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "No tienes permiso para esta acción." });
    next();
  };
}
async function dbRows(sql, params = [], executor = db) {
  const [rows] = await executor.execute(sql, params);
  return rows;
}
async function dbGet(sql, params = [], executor = db) {
  return (await dbRows(sql, params, executor))[0] || null;
}
async function dbRun(sql, params = [], executor = db) {
  const [result] = await executor.execute(sql, params);
  return result;
}
function verifyPassword(password, stored) {
  const [scheme, salt, expected] = (stored || "").split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}
async function createSession(user, res) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_MS;
  await dbRun("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)", [hashToken(token), user.id, expiresAt]);
  res.setHeader("Set-Cookie", cookieOptions(SESSION_MS).replace(`${SESSION_COOKIE}=`, `${SESSION_COOKIE}=${token}`));
}
function bogotaNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).reduce((a, p) => (a[p.type] = p.value, a), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: +parts.hour * 60 + +parts.minute };
}
const toMins = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const toTime = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
async function slots(barber, service, date, executor = db) {
  if (!validDate(date)) error(400, "La fecha no es válida.");
  const today = bogotaNow().date;
  const lastDate = new Date(`${today}T00:00:00Z`);
  lastDate.setUTCDate(lastDate.getUTCDate() + 41);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (date < today || date > lastDate.toISOString().slice(0, 10) || day === 0) return [];
  const busyRows = await dbRows(`SELECT starts_at,ends_at FROM appointments
    WHERE barber_id=? AND status='reservada' AND DATE(starts_at)=?`, [barber.id, date], executor);
  const busy = busyRows.map((a) => [toMins(a.starts_at.slice(11)), toMins(a.ends_at.slice(11))]);
  const now = bogotaNow();
  const result = [];
  for (let t = 9 * 60; t + service.duration <= 18 * 60; t += 30) {
    result.push({
      time: toTime(t),
      available: !(date === now.date && t <= now.minutes) &&
        !busy.some(([from, until]) => from < t + service.duration && until > t),
    });
  }
  return result;
}
async function serviceById(id) {
  const service = await dbGet("SELECT * FROM services WHERE id=? AND active=1", [id]);
  if (!service) error(404, "No encontramos ese servicio.");
  return service;
}
async function barberById(id, executor = db, lock = false) {
  const barber = await dbGet(`SELECT id,name FROM users WHERE id=? AND role='barbero' AND active=1${lock ? " FOR UPDATE" : ""}`, [id], executor);
  if (!barber) error(404, "No encontramos ese barbero.");
  return barber;
}
async function rateSummary(barberId = null) {
  const r = await dbGet(`SELECT ROUND(AVG(stars),1) AS value, COUNT(*) AS count
    FROM ratings WHERE (? IS NULL OR barber_id=?)`, [barberId, barberId]);
  return Number(r.count) ? { value: Number(r.value).toFixed(1), count: Number(r.count) } : null;
}

app.get("/api/bootstrap", async (req, res) => {
  const user = safeUser(await userFromRequest(req));
  const services = await dbRows("SELECT id,category,name,duration,price FROM services WHERE active=1 ORDER BY id");
  const barbers = await dbRows("SELECT id,name FROM users WHERE role='barbero' AND active=1 ORDER BY name");
  for (const barber of barbers) barber.rating = await rateSummary(barber.id);
  res.json({ user, services, barbers, rating: await rateSummary() });
});

app.post("/api/auth/register", async (req, res) => {
  const name = text(req.body?.name, 100);
  const email = text(req.body?.email, 160).toLowerCase();
  const phone = text(req.body?.phone, 25).replace(/\D/g, "");
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!validName(name) || name.length < 3 || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 7 || phone.length > 15 || password.length < 6 || password.length > 128) {
    error(400, "Completa nombre, correo y un teléfono de 7 a 15 dígitos; la contraseña debe tener entre 6 y 128 caracteres.");
  }
  try {
    const result = await dbRun("INSERT INTO users(role,name,email,phone,password_hash) VALUES('cliente',?,?,?,?)",
      [name, email, phone, passwordHash(password)]);
    const user = await dbGet("SELECT * FROM users WHERE id=?", [result.insertId]);
    await createSession(user, res);
    res.status(201).json({ user: safeUser(user) });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") error(409, "Ese correo o teléfono ya tiene una cuenta.");
    throw e;
  }
});

app.post("/api/auth/login", async (req, res) => {
  const identifier = text(req.body?.identifier, 160).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const user = await dbGet("SELECT * FROM users WHERE (email=? OR phone=?) AND active=1",
    [identifier, identifier.replace(/\D/g, "")]);
  if (!user || !verifyPassword(password, user.password_hash)) error(401, "Correo/teléfono o contraseña incorrectos.");
  await createSession(user, res);
  res.json({ user: safeUser(user) });
});

app.post("/api/auth/logout", requireUser, async (req, res) => {
  const token = requestToken(req);
  if (token) await dbRun("DELETE FROM sessions WHERE token_hash=?", [hashToken(token)]);
  res.setHeader("Set-Cookie", cookieOptions(0));
  res.sendStatus(204);
});
app.get("/api/me", requireUser, (req, res) => res.json({ user: safeUser(req.user) }));

app.get("/api/slots", async (req, res) => {
  const barber = await barberById(Number(req.query.barberId));
  const service = await serviceById(Number(req.query.serviceId));
  res.json({ slots: await slots(barber, service, String(req.query.date || "")) });
});

app.post("/api/appointments", requireUser, allow("cliente"), async (req, res) => {
  const service = await serviceById(Number(req.body?.serviceId));
  const date = String(req.body?.date || "");
  const time = String(req.body?.time || "");
  if (!/^\d{2}:\d{2}$/.test(time)) error(409, "Esa hora no está disponible. Elige otra.");
  const conn = await db.getConnection();
  let transactionOpen = false;
  try {
    await conn.beginTransaction();
    transactionOpen = true;
    const barber = await barberById(Number(req.body?.barberId), conn, true);
    const available = await slots(barber, service, date, conn);
    if (!available.some((slot) => slot.time === time && slot.available)) {
      await conn.rollback();
      transactionOpen = false;
      error(409, "Esa hora ya no está disponible. Elige otra.");
    }
    const startMins = toMins(time);
    const [result] = await conn.execute(`INSERT INTO appointments(client_id,barber_id,service_id,starts_at,ends_at,price)
      VALUES(?,?,?,?,?,?)`, [req.user.id, barber.id, service.id, `${date} ${time}:00`,
      `${date} ${toTime(startMins + service.duration)}:00`, service.price]);
    await conn.commit();
    transactionOpen = false;
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    if (transactionOpen) await conn.rollback().catch(() => {});
    if (e.code === "ER_DUP_ENTRY") error(409, "Esa hora ya no está disponible.");
    throw e;
  } finally {
    conn.release();
  }
});

const appointmentSelect = `SELECT a.id,a.client_id AS clientId,a.barber_id AS barberId,
  a.service_id AS serviceId,DATE_FORMAT(a.starts_at,'%Y-%m-%d %H:%i') AS startsAt,
  DATE_FORMAT(a.ends_at,'%Y-%m-%d %H:%i') AS endsAt,a.price,a.status,
  c.name AS clientName,c.phone AS clientPhone,b.name AS barberName,s.name AS serviceName,
  r.stars AS rating FROM appointments a JOIN users c ON c.id=a.client_id
  JOIN users b ON b.id=a.barber_id JOIN services s ON s.id=a.service_id
  LEFT JOIN ratings r ON r.appointment_id=a.id`;
app.get("/api/appointments/mine", requireUser, allow("cliente"), async (req, res) => {
  res.json({ appointments: await dbRows(`${appointmentSelect} WHERE a.client_id=? ORDER BY a.starts_at DESC`, [req.user.id]) });
});
app.patch("/api/appointments/:id/cancel", requireUser, allow("cliente"), async (req, res) => {
  const now = bogotaNow();
  const result = await dbRun(`UPDATE appointments SET status='cancelada' WHERE id=? AND client_id=?
    AND status='reservada' AND starts_at>?`, [Number(req.params.id), req.user.id, `${now.date} ${toTime(now.minutes)}:00`]);
  if (!result.affectedRows) error(409, "La cita no existe o ya no se puede cancelar.");
  res.sendStatus(204);
});
app.post("/api/appointments/:id/rating", requireUser, allow("cliente"), async (req, res) => {
  const stars = Number(req.body?.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) error(400, "La calificación debe ser de 1 a 5 estrellas.");
  const appointment = await dbGet("SELECT * FROM appointments WHERE id=? AND client_id=? AND status='completada'",
    [Number(req.params.id), req.user.id]);
  if (!appointment) error(404, "Solo puedes calificar una cita completada.");
  try {
    await dbRun("INSERT INTO ratings(appointment_id,client_id,barber_id,stars) VALUES(?,?,?,?)",
      [appointment.id, req.user.id, appointment.barber_id, stars]);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") error(409, "Ya calificaste esta cita.");
    throw e;
  }
  res.sendStatus(201);
});

app.get("/api/staff/appointments", requireUser, allow("admin", "barbero"), async (req, res) => {
  const admin = req.user.role === "admin";
  res.json({ appointments: await dbRows(`${appointmentSelect} ${admin ? "" : "WHERE a.barber_id=?"} ORDER BY a.starts_at ASC`,
    admin ? [] : [req.user.id]) });
});
app.patch("/api/staff/appointments/:id/status", requireUser, allow("admin", "barbero"), async (req, res) => {
  const status = String(req.body?.status || "");
  if (!["completada", "no_asistio", "cancelada"].includes(status)) error(400, "Estado no válido.");
  const appointmentId = Number(req.params.id);
  const appointment = await dbGet("SELECT id,status,barber_id AS barberId FROM appointments WHERE id=?", [appointmentId]);
  if (!appointment) error(404, "No encontramos esa cita.");
  if (req.user.role === "barbero" && appointment.barberId !== req.user.id) {
    error(403, "Solo puedes actualizar tus propias citas.");
  }
  if (appointment.status !== "reservada") error(409, "Esta cita ya tiene un estado registrado.");

  const result = await dbRun("UPDATE appointments SET status=? WHERE id=? AND status='reservada'", [status, appointmentId]);
  if (!result.affectedRows) error(409, "La cita cambió mientras la actualizabas. Recarga la agenda e inténtalo de nuevo.");

  const messages = {
    completada: "La cita quedó registrada como completada.",
    no_asistio: "Se registró que el cliente no asistió a la cita.",
    cancelada: "La cita quedó cancelada.",
  };
  res.json({ message: messages[status] });
});

app.get("/api/staff/barbers", requireUser, allow("admin"), async (req, res) => {
  res.json({ barbers: await dbRows("SELECT id,name,email,active FROM users WHERE role='barbero' ORDER BY name") });
});
app.post("/api/staff/barbers", requireUser, allow("admin"), async (req, res) => {
  const name = text(req.body?.name, 100);
  const email = text(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!validName(name) || name.length < 3 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6 || password.length > 128) {
    error(400, "Escribe nombre, correo válido y contraseña de 6 a 128 caracteres.");
  }
  try {
    const result = await dbRun("INSERT INTO users(role,name,email,password_hash) VALUES('barbero',?,?,?)",
      [name, email, passwordHash(password)]);
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") error(409, "Ese correo ya está registrado.");
    throw e;
  }
});
app.delete("/api/staff/barbers/:id", requireUser, allow("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const result = await dbRun("UPDATE users SET active=0 WHERE id=? AND role='barbero' AND active=1", [id]);
  if (!result.affectedRows) error(404, "No encontramos ese barbero activo.");
  await dbRun("DELETE FROM sessions WHERE user_id=?", [id]);
  res.sendStatus(204);
});
app.get("/api/staff/ratings", requireUser, allow("admin"), async (req, res) => {
  const barbers = await dbRows("SELECT id,name FROM users WHERE role='barbero' AND active=1 ORDER BY name");
  for (const barber of barbers) barber.rating = await rateSummary(barber.id);
  const ratings = await dbRows(`SELECT r.stars,DATE_FORMAT(r.created_at,'%Y-%m-%d') AS date,
    b.name AS barberName,c.name AS clientName FROM ratings r
    JOIN users b ON b.id=r.barber_id JOIN users c ON c.id=r.client_id ORDER BY r.id DESC`);
  res.json({ barbers, ratings, rating: await rateSummary() });
});

function armarHtml(html) {
  return html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_, ref) => {
    const file = path.resolve(PUBLIC, ref);
    if (!file.startsWith(PUBLIC + path.sep)) return "";
    try { return fs.readFileSync(file, "utf8"); }
    catch { return `<!-- No se encontró ${ref} -->`; }
  });
}
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  let route;
  try { route = decodeURIComponent(req.path); } catch { return next(); }
  if (route === "/") route = "/index.html";
  if (!route.endsWith(".html")) return next();
  const file = path.resolve(PUBLIC, `.${route}`);
  if (!file.startsWith(PUBLIC + path.sep)) return next();
  fs.readFile(file, "utf8", (e, html) => {
    if (e) return next();
    res.type("html").send(armarHtml(html));
  });
});
app.use(express.static(PUBLIC, { index: "index.html" }));
app.get("/favicon.ico", (req, res) => res.sendStatus(204));
app.use("/api", (req, res) => res.status(404).json({ error: "Ruta de API no encontrada." }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof SyntaxError && "body" in err) return res.status(400).json({ error: "El cuerpo JSON no es válido." });
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Ocurrió un error interno." });
});

initializeDatabase().then(() => {
  const server = app.listen(PORT, () => console.log(`Barbería El Corte lista en http://localhost:${PORT}`));
  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") console.error(`El puerto ${PORT} ya está en uso. Cambia la variable PORT.`);
    else console.error(e);
    process.exit(1);
  });
}).catch((e) => {
  console.error(`No se pudo inicializar MySQL/MariaDB: ${e.message}`);
  console.error("Revisa DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD en el archivo .env.");
  process.exit(1);
});
