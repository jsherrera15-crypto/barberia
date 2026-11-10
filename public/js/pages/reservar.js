/* Módulo: reserva (barbero → día → hora → agendar). La estructura está en pages/reservar.html */
const sid = new URLSearchParams(location.search).get("servicio");

/* Estado de la reserva: servicio, barbero elegido, día, hora y semana que se está viendo */
const B = { sv: +sid, bar: null, fecha: ymd(new Date()), hora: null, week: 0 };

/* ───── Barberos ───── */
function pintarBarberos() {
  const lista = $("#barberos");
  lista.replaceChildren();
  db.barberos
    .filter((x) => x.activo)
    .forEach((x) => {
      const tarjeta = plantilla("tpl-barbero");
      const t = refs(tarjeta);
      t.inicial.textContent = x.nombre[0];
      t.nombre.textContent = x.nombre;
      pintarRate(t.rate, avg(x.id));
      t.boton.classList.toggle("on", B.bar == x.id);
      t.boton.addEventListener("click", () => {
        B.bar = x.id;
        B.hora = null;
        pintarBarberos();
        pintarAgenda();
      });
      lista.append(tarjeta);
    });
}

/* ───── Agenda: semana, días y horas del barbero elegido ───── */
function pintarAgenda() {
  const b = B.bar && br(B.bar);
  $("#msgElegir").hidden = !!b;
  $("#agenda").hidden = !b;
  if (!b) return;

  const s = sv(B.sv);
  const inicioSemana = new Date();
  inicioSemana.setHours(0, 0, 0, 0);
  inicioSemana.setDate(inicioSemana.getDate() + B.week * 7);
  const dias = [...Array(7)].map((_, i) => {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    return d;
  });

  /* Encabezado y flechas de semana */
  $("#mesAnio").textContent = dias[0].toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
  $("#semPrev").disabled = !B.week;
  $("#semNext").disabled = B.week >= 5;

  /* Días de la semana */
  const contenedorDias = $("#dias");
  contenedorDias.replaceChildren();
  dias.forEach((d) => {
    const f = ymd(d);
    const nodo = plantilla("tpl-dia");
    const t = refs(nodo);
    t.dia.textContent = DAYS[d.getDay()];
    t.boton.append(d.getDate());
    t.boton.disabled = f < ymd(new Date()) || !b.horario.dias.includes(d.getDay());
    t.boton.classList.toggle("on", f === B.fecha);
    t.boton.addEventListener("click", () => {
      B.fecha = f;
      B.hora = null;
      pintarAgenda();
    });
    contenedorDias.append(nodo);
  });

  /* Horas del día elegido */
  const horas = slots(b, B.fecha, s.duracion);
  $("#horasTitulo").textContent = "Horas de " + b.nombre.split(" ")[0];
  $("#horasNota").hidden = !horas.length;
  $("#sinHoras").hidden = horas.length > 0;
  const contenedorHoras = $("#horas");
  contenedorHoras.replaceChildren();
  horas.forEach((x) => {
    const nodo = plantilla("tpl-hora");
    const boton = nodo.firstElementChild;
    boton.textContent = h12(x.t);
    boton.disabled = !x.ok;
    boton.classList.toggle("on", B.hora === x.t);
    boton.addEventListener("click", () => {
      B.hora = x.t;
      pintarAgenda();
    });
    contenedorHoras.append(nodo);
  });

  /* Botón de agendar */
  $("#btnAgendar").disabled = !B.hora;
  $("#agendarNota").hidden = !!B.hora;
}

/* ───── Confirmar la cita ───── */
function agendar() {
  const c = me();
  if (!c) {
    pendCb = agendar;
    return openAuth(
      "in",
      "Inicia sesión o crea tu cuenta para confirmar la cita.",
    );
  }
  const s = sv(B.sv),
    b = br(B.bar);
  if (!slots(b, B.fecha, s.duracion).some((x) => x.t === B.hora && x.ok)) {
    toast("Esa hora ya no está disponible. Elige otra.");
    B.hora = null;
    return pintarAgenda();
  }
  db.citas.push({
    id: Date.now(),
    tel: c.tel,
    barberoId: b.id,
    servicioId: s.id,
    inicio: `${B.fecha} ${B.hora}`,
    fin: `${B.fecha} ${hm(mins(B.hora) + s.duracion)}`,
    precio: s.precio,
    estado: "reservada",
  });
  save();
  toast("¡Cita agendada! (Aquí se enviaría la confirmación por correo)");
  setTimeout(() => go("pages/mis-citas.html"), 900);
}

/* ───── Inicio: si el servicio no existe, vuelve a la portada ───── */
if (!sv(sid)) go("index.html");
else {
  const s = sv(B.sv);
  $("#svNombre").textContent = s.nombre;
  $("#svDetalle").textContent = `${dur(s.duracion)} · ${money(s.precio)}`;
  $("#semPrev").addEventListener("click", () => {
    B.week--;
    pintarAgenda();
  });
  $("#semNext").addEventListener("click", () => {
    B.week++;
    pintarAgenda();
  });
  $("#btnAgendar").addEventListener("click", agendar);
  pintarBarberos();
  pintarAgenda();
}
