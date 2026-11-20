# Barbería El Corte

Aplicación de reservas con frontend HTML/CSS/JavaScript y backend Node.js + Express conectado a MySQL/MariaDB. Puedes administrar la base desde phpMyAdmin.

## Preparar phpMyAdmin (XAMPP)

1. Inicia MySQL desde el panel de XAMPP y abre phpMyAdmin.
2. Crea una base de datos llamada `barberia_el_corte` con cotejamiento `utf8mb4_unicode_ci`.
3. Copia `.env.example` como `.env` en la carpeta del proyecto. Configura `DB_USER` y `DB_PASSWORD` con las credenciales de MySQL que usas para phpMyAdmin. `DB_HOST`, `DB_PORT` y `DB_NAME` ya tienen valores para una instalación local habitual.
4. Ejecuta `npm install` y luego `npm start`. Con la configuración actual abre <http://localhost:3006>.

El servidor crea las tablas dentro de `barberia_el_corte` cuando inicia. Los nombres son `users`, `services`, `appointments`, `ratings` y `sessions`. No guardes el archivo `.env` en Git ni compartas su contraseña.

Requisitos: Node.js 24 o superior y MySQL/MariaDB iniciado. El controlador MySQL es `mysql2`.

## Primer inicio

La cuenta administradora predeterminada es `admin@gmail.com`, contraseña `Admin123`. Al iniciar, el servidor crea o actualiza esa cuenta y guarda la contraseña como hash en MySQL. Si migra el administrador anterior de SQLite, lo convierte a estas credenciales.

Usa `npm run dev` durante el desarrollo. El puerto HTTP se puede cambiar con `PORT`.

## Funcionalidades

- Catálogo de servicios y disponibilidad de barberos.
- Registro e inicio de sesión de clientes con contraseña.
- Reservas, cancelación de citas futuras e historial.
- Panel del personal para consultar su agenda y actualizar citas.
- Panel de administración para gestionar barberos y consultar calificaciones.
- Las operaciones validan permisos y disponibilidad en el servidor.

## Estructura

```
server.js                         Express y rutas de la API
database.js                       conexión MySQL, esquema e importación SQLite
.env.example                      configuración local de ejemplo
public/
  index.html                      portada y catálogo
  pages/                          reserva, mis citas y paneles
  partials/                       cabecera, scripts, navbar y plantillas compartidas
  css/                            estilos
  js/core/                        API del frontend, acceso y layout
  js/pages/                       interacción de cada página
data/barberia.sqlite              base local anterior (si existe)
```

## Migración desde SQLite

Al iniciar, si encuentra `data/barberia.sqlite` y la tabla `users` de MySQL está vacía, importa usuarios, servicios, citas y calificaciones en una transacción, conservando los hashes de contraseña. No migra sesiones activas. Los datos antiguos guardados únicamente en el `localStorage` del navegador no se pueden leer desde el servidor y requieren una migración aparte.

Clientes y barberos pueden usar contraseñas de 6 a 128 caracteres. Las sesiones usan cookies HttpOnly y las contraseñas se almacenan con scrypt. En producción, usa HTTPS para activar la cookie `Secure`. Esta versión aún no envía correos de confirmación ni permite configurar horarios distintos por barbero.
