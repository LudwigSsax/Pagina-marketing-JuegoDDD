// SERVICIO EXTERNO 1: API REST de Brevo (correo).
// Si prefieres otro (MailerLite, Buttondown...), solo cambia esta función.
const { httpError } = require('./errores');

async function suscribirCorreo(email) {
  const key = process.env.BREVO_API_KEY;
  const lista = process.env.BREVO_LIST_ID;
  if (!key || !lista) throw httpError(503, 'La suscripción aún no está disponible.');

  const r = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': key },
    body: JSON.stringify({ email, listIds: [Number(lista)], updateEnabled: true })
  });

  if (r.ok) return; // 201 creado o 204 actualizado
  const detalle = await r.text();
  console.error('Brevo respondió', r.status, detalle.slice(0, 200));
  throw httpError(502, 'No se pudo registrar el correo. Intenta más tarde.');
}

module.exports = { suscribirCorreo };
