/* Reserva: selección visual; disponibilidad y validación final pertenecen al backend. */
const sid = new URLSearchParams(location.search).get("servicio");
const B = { serviceId: Number(sid), barberId: null, date: ymd(new Date()), time: null, week: 0 };

function pintarBarberos() {
  const list = $("#barberos");
  list.replaceChildren();
  db.barbers.forEach((barber) => {
    const card = plantilla("tpl-barbero");
    const ref = refs(card);
    ref.inicial.textContent = barber.name.slice(0, 1);
    ref.nombre.textContent = barber.name;
    pintarRate(ref.rate, avg(barber.id));
    ref.boton.classList.toggle("on", B.barberId === barber.id);
    ref.boton.addEventListener("click", () => {
      B.barberId = barber.id;
      B.time = null;
      pintarBarberos();
      pintarAgenda();
    });
    list.append(card);
  });
  if (!db.barbers.length) $("#msgElegir").textContent = "Aún no hay barberos disponibles para reservar.";
}

async function pintarAgenda() {
  const barber = B.barberId && br(B.barberId);
  $("#msgElegir").hidden = !!barber;
  $("#agenda").hidden = !barber;
  if (!barber) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - mondayOffset + B.week * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });

  $("#mesAnio").textContent = days[0].toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  $("#semPrev").disabled = B.week === 0;
  $("#semNext").disabled = B.week >= 5;

  const dayContainer = $("#dias");
  dayContainer.replaceChildren();
  days.forEach((day) => {
    const date = ymd(day);
    const node = plantilla("tpl-dia");
    const ref = refs(node);
    ref.dia.textContent = DAYS[day.getDay()];
    ref.boton.append(day.getDate());
    ref.boton.disabled = date < ymd(new Date());
    ref.boton.classList.toggle("on", date === B.date);
    ref.boton.addEventListener("click", () => {
      B.date = date;
      B.time = null;
      pintarAgenda();
    });
    dayContainer.append(node);
  });

  $("#horasTitulo").textContent = `Horas de ${barber.name.split(" ")[0]}`;
  const container = $("#horas");
  container.replaceChildren();
  $("#horasNota").hidden = true;
  $("#sinHoras").hidden = true;
  try {
    const availableSlots = await getSlots(barber.id, B.serviceId, B.date);
    $("#horasNota").hidden = availableSlots.length === 0;
    $("#sinHoras").hidden = availableSlots.length > 0;
    availableSlots.forEach((slot) => {
      const node = plantilla("tpl-hora");
      const button = node.firstElementChild;
      button.textContent = h12(slot.time);
      button.disabled = !slot.available;
      button.classList.toggle("on", B.time === slot.time);
      button.addEventListener("click", () => {
        B.time = slot.time;
        pintarAgenda();
      });
      container.append(node);
    });
  } catch (error) {
    toast(error.message);
  }
  $("#btnAgendar").disabled = !B.time;
  $("#agendarNota").hidden = !!B.time;
}

async function agendar() {
  if (!me()) {
    pendCb = agendar;
    return openAuth("in", "Ingresa o crea tu cuenta para confirmar la cita.");
  }
  try {
    await api("/api/appointments", {
      method: "POST",
      body: { barberId: B.barberId, serviceId: B.serviceId, date: B.date, time: B.time },
    });
    toast("¡Cita agendada!");
    setTimeout(() => go("pages/mis-citas.html"), 900);
  } catch (error) {
    toast(error.message);
    B.time = null;
    await pintarAgenda();
  }
}

appReady.then((ready) => {
  if (!ready) return;
  const service = sv(B.serviceId);
  if (!service) return go("index.html");
  $("#svNombre").textContent = service.name;
  $("#svDetalle").textContent = `${dur(service.duration)} · ${money(service.price)}`;
  $("#semPrev").addEventListener("click", () => { B.week--; pintarAgenda(); });
  $("#semNext").addEventListener("click", () => { B.week++; pintarAgenda(); });
  $("#btnAgendar").addEventListener("click", agendar);
  pintarBarberos();
  pintarAgenda();
});
