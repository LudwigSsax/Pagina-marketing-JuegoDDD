
const CONFIG = {
  VIDEO_URL: "" // enlace al video del gameplay 
};
/* ============================ */

const $ = (sel) => document.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ----  Navegación entre secciones (#inicio, #juego, #desarrollo) ---- */
const pages = [...document.querySelectorAll(".page")];
const links = [...document.querySelectorAll("[data-nav]")];

function show(name) {
  pages.forEach((p) => p.classList.toggle("on", p.dataset.page === name));
  links.forEach((a) => a.classList.toggle("on", a.dataset.nav === name));
}

function route() {
  let h = (location.hash || "#inicio").slice(1);
  if (h === "sub") {
    if (!pages.some((p) => p.classList.contains("on"))) show("inicio");
    $("#sub").scrollIntoView();
    return;
  }
  if (!pages.some((p) => p.dataset.page === h)) h = "inicio";
  show(h);
  window.scrollTo(0, 0);
}
addEventListener("hashchange", route);
route();

/* ----  Video del gameplay ---- */
if (CONFIG.VIDEO_URL) {
  const l = $("#vlink");
  l.href = CONFIG.VIDEO_URL;
  l.style.display = "inline-block";
  $("#vtxt").textContent = "Mira el gameplay del juego";
}

/* ----  Servicio propio: GET /api/entradas ---- */
async function cargarEntradas() {
  const cont = $("#posts");
  try {
    const r = await fetch("/api/entradas");
    if (!r.ok) throw new Error();
    const entradas = await r.json();
    if (!entradas.length) { cont.innerHTML = '<p class="small">Aún no hay entradas.</p>'; return; }
    cont.innerHTML = entradas.map((p) => {
      const media = p.imagen
        ? `<img class="post-img" src="${esc(p.imagen)}" alt="${esc(p.alt || p.titulo)}">`
        : p.video ? `<p><a class="btn" href="${esc(p.video)}" target="_blank" rel="noopener">Ver video del avance</a></p>` : "";
      return `<article class="post"><time>${esc(p.fecha)}</time><h3>${esc(p.titulo)}</h3>${media}<p style="color:var(--muted);margin:0">${esc(p.texto)}</p></article>`;
    }).join("");
  } catch {
    cont.innerHTML = '<p class="small">No se pudieron cargar las entradas. Intenta de nuevo más tarde.</p>';
  }
}
cargarEntradas();

/* ---. Suscripción: POST /api/suscribir (usa el servicio de correo) ---- */
$("#subform").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#msg");
  const email = new FormData(e.target).get("email");
  msg.textContent = "Enviando…";
  try {
    const r = await fetch("/api/suscribir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const d = await r.json();
    msg.textContent = d.mensaje || (r.ok ? "¡Listo!" : "Ocurrió un error.");
    if (r.ok) e.target.reset();
  } catch {
    msg.textContent = "No se pudo conectar con el servidor.";
  }
});

/* ---- 5. Donación: POST /api/donar (usa la API de PayPal) ---- */
fetch("/api/config").then((r) => r.json()).then((c) => { $("#moneda").textContent = c.moneda; }).catch(() => {});

$("#donform").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#donmsg");
  const monto = Number(new FormData(e.target).get("monto"));
  msg.textContent = "Conectando con PayPal…";
  try {
    const r = await fetch("/api/donar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto })
    });
    const d = await r.json();
    if (r.ok && d.url) { location.href = d.url; return; }
    msg.textContent = d.mensaje || "No se pudo iniciar la donación.";
  } catch {
    msg.textContent = "No se pudo conectar con el servidor.";
  }
});


const don = new URLSearchParams(location.search).get("donacion");
if (don) {
  const textos = {
    ok: "¡Gracias por tu donación! Todo apoyo ayuda a que el juego avance.",
    cancelado: "La donación se canceló. No se hizo ningún cargo.",
    error: "No pudimos confirmar la donación. Si ves un cargo, escríbenos."
  };
  $("#donmsg").textContent = textos[don] || "";
  history.replaceState(null, "", location.pathname + location.hash);
}
