/* ====== CONFIGURA AQUÍ ====== */
const CONFIG = {
  // ID del video de YouTube: lo que va después de "v=" en la dirección (o después de youtu.be/).
  // Deja el id vacío ("") para los videos que aún no subes.
  VIDEOS: [
    { titulo: "Gameplay corto (1 min)", id: "4QF4qvYNj7s" },
    { titulo: "Gameplay extendido (3 min)", id: "4QF4qvYNj7s" }
  ]
};
/* ============================ */

const $ = (sel) => document.querySelector(sel);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---- 1. Navegación entre secciones (#inicio, #juego, #desarrollo) ---- */
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

/* ---- 2. Videos del gameplay (YouTube incrustado) ---- */
const vbox = $("#vbox"), vtabs = $("#vtabs");
const vPlaceholder = vbox.innerHTML;
const videos = CONFIG.VIDEOS.filter((v) => v.id);

function mostrarVideo(i) {
  const v = videos[i];
  [...vtabs.children].forEach((b, j) => b.classList.toggle("on", j === i));
  vbox.classList.add("on");
  vbox.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}" title="${esc(v.titulo)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}
if (videos.length) {
  if (videos.length > 1) {
    videos.forEach((v, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = v.titulo;
      b.addEventListener("click", () => mostrarVideo(i));
      vtabs.appendChild(b);
    });
  }
  mostrarVideo(0);
}

/* ---- 3. Servicio propio: GET /api/entradas ---- */
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

/* ---- 4. Suscripción: POST /api/suscribir (usa el servicio de correo) ---- */
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

/* Mensaje al volver de PayPal (?donacion=ok | cancelado | error) */
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

/* ---- 6. Servicio propio: GET /api/descarga (versión alfa para Android) ---- */
async function cargarDescarga() {
  const card = $("#dlcard");
  try {
    const r = await fetch("/api/descarga");
    if (!r.ok) throw new Error();
    const d = await r.json();
    if (!d.url) { card.innerHTML = '<h3>Próximamente</h3><p class="small" style="margin:0">La versión alfa estará disponible muy pronto.</p>'; return; }
    const datos = [d.fecha, d.tamano, d.requisitos].filter(Boolean).map(esc).join(" · ");
    card.innerHTML = `<h3>Versión ${esc(d.version)}</h3>
      ${datos ? `<p class="small" style="margin:0 0 10px">${datos}</p>` : ""}
      ${d.notas ? `<p>${esc(d.notas)}</p>` : ""}
      <p><a class="btn" href="${esc(d.url)}" rel="noopener">Descargar APK</a></p>
      ${d.sha256 ? `<details><summary>Verificar integridad (SHA-256)</summary><code>${esc(d.sha256)}</code></details>` : ""}`;
  } catch {
    card.innerHTML = '<p class="small" style="margin:0">No se pudo cargar la información de la descarga.</p>';
  }
}
cargarDescarga();
