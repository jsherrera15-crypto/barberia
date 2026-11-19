"use strict";

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const mysql = require("mysql2/promise");

const databaseName = process.env.DB_NAME || "barberia_el_corte";
if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error("DB_NAME solo puede contener letras, números y guion bajo.");
}

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: databaseName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  dateStrings: true,
  decimalNumbers: true,
});

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
const schema = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role ENUM('admin','barbero','cliente') NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(160) NULL UNIQUE,
    phone VARCHAR(25) NULL UNIQUE,
    password_hash VARCHAR(180) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS services (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    duration SMALLINT UNSIGNED NOT NULL,
    price INT UNSIGNED NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    client_id INT UNSIGNED NOT NULL,
    barber_id INT UNSIGNED NOT NULL,
    service_id INT UNSIGNED NOT NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    price INT UNSIGNED NOT NULL,
    status ENUM('reservada','completada','cancelada','no_asistio') NOT NULL DEFAULT 'reservada',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX appointments_barber_time (barber_id, starts_at, ends_at, status),
    INDEX appointments_client_time (client_id, starts_at),
    CONSTRAINT appointments_client_fk FOREIGN KEY (client_id) REFERENCES users(id),
    CONSTRAINT appointments_barber_fk FOREIGN KEY (barber_id) REFERENCES users(id),
    CONSTRAINT appointments_service_fk FOREIGN KEY (service_id) REFERENCES services(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS ratings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT UNSIGNED NOT NULL UNIQUE,
    client_id INT UNSIGNED NOT NULL,
    barber_id INT UNSIGNED NOT NULL,
    stars TINYINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ratings_appointment_fk FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT ratings_client_fk FOREIGN KEY (client_id) REFERENCES users(id),
    CONSTRAINT ratings_barber_fk FOREIGN KEY (barber_id) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    expires_at BIGINT NOT NULL,
    INDEX sessions_expiry (expires_at),
    CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function migrateLegacySqlite() {
  const file = path.join(process.env.DATA_DIR || path.join(__dirname, "data"), "barberia.sqlite");
  if (!fs.existsSync(file)) return false;
  const [[userCount]] = await db.query("SELECT COUNT(*) AS total FROM users");
  if (Number(userCount.total) > 0) return false;

  let legacy;
  try {
    const { DatabaseSync } = require("node:sqlite");
    legacy = new DatabaseSync(file, { readOnly: true });
    const tables = new Set(legacy.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((x) => x.name));
    if (!["users", "services", "appointments", "ratings"].every((table) => tables.has(table))) return false;

    const users = legacy.prepare("SELECT id,role,name,email,phone,password_hash,active,created_at FROM users").all();
    const services = legacy.prepare("SELECT id,category,name,duration,price,active FROM services").all();
    const appointments = legacy.prepare("SELECT id,client_id,barber_id,service_id,starts_at,ends_at,price,status,created_at FROM appointments").all();
    const ratings = legacy.prepare("SELECT id,appointment_id,client_id,barber_id,stars,created_at FROM ratings").all();
    if (!users.length && !services.length) return false;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const u of users) await conn.execute(
        "INSERT INTO users(id,role,name,email,phone,password_hash,active,created_at) VALUES(?,?,?,?,?,?,?,?)",
        [u.id, u.role, u.name, u.email, u.phone, u.password_hash, u.active, u.created_at],
      );
      for (const s of services) await conn.execute(
        "INSERT INTO services(id,category,name,duration,price,active) VALUES(?,?,?,?,?,?)",
        [s.id, s.category, s.name, s.duration, s.price, s.active],
      );
      for (const a of appointments) await conn.execute(
        "INSERT INTO appointments(id,client_id,barber_id,service_id,starts_at,ends_at,price,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
        [a.id, a.client_id, a.barber_id, a.service_id, a.starts_at, a.ends_at, a.price, a.status, a.created_at],
      );
      for (const r of ratings) await conn.execute(
        "INSERT INTO ratings(id,appointment_id,client_id,barber_id,stars,created_at) VALUES(?,?,?,?,?,?)",
        [r.id, r.appointment_id, r.client_id, r.barber_id, r.stars, r.created_at],
      );
      await conn.commit();
      console.log(`Se migraron datos locales a MySQL: ${users.length} cuentas, ${services.length} servicios, ${appointments.length} citas y ${ratings.length} calificaciones.`);
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } finally {
    legacy?.close();
  }
}

async function initializeDatabase() {
  await db.query("SELECT 1");
  for (const statement of schema) await db.query(statement);
  await migrateLegacySqlite();

  const [[serviceCount]] = await db.query("SELECT COUNT(*) AS total FROM services");
  if (!Number(serviceCount.total)) {
    await db.query(`INSERT INTO services(category,name,duration,price) VALUES
      ('Cortes','Corte hombre',40,25000),
      ('Cortes','Corte con cejas',40,27000),
      ('Cortes','Corte niño',40,25000),
      ('Barba','Barba',20,10000),
      ('Combos','Corte con barba',60,30000),
      ('Combos','Corte con barba y cejas',60,32000)`);
  }

  const adminEmail = "admin@gmail.com";
  const adminPassword = "Admin123";
  const [configuredRows] = await db.execute("SELECT id,role FROM users WHERE email=?", [adminEmail]);
  const adminByEmail = configuredRows[0];
  if (adminByEmail && adminByEmail.role !== "admin") {
    throw new Error("admin@gmail.com ya pertenece a un usuario que no es administrador.");
  }
  if (adminByEmail) {
    await db.execute("UPDATE users SET name='Administrador',password_hash=?,active=1 WHERE id=?",
      [passwordHash(adminPassword), adminByEmail.id]);
  } else {
    const [admins] = await db.execute("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1");
    if (admins[0]) {
      await db.execute("UPDATE users SET name='Administrador',email=?,password_hash=?,active=1 WHERE id=?",
        [adminEmail, passwordHash(adminPassword), admins[0].id]);
    } else {
      await db.execute("INSERT INTO users(role,name,email,password_hash) VALUES('admin','Administrador',?,?)",
        [adminEmail, passwordHash(adminPassword)]);
    }
  }
}

module.exports = { db, initializeDatabase, passwordHash };
