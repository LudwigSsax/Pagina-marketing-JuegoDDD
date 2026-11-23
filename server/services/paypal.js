// SERVICIO EXTERNO 2: API REST de PayPal (Orders v2).
// Flujo: crear orden -> el visitante aprueba en PayPal -> capturar el pago.
const crypto = require('crypto');
const { httpError } = require('./errores');

const BASE = process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const MONEDA = process.env.PAYPAL_CURRENCY || 'MXN';
const URL_SITIO = process.env.BASE_URL || 'http://localhost:3000';

async function obtenerToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secreto = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secreto) throw httpError(503, 'Las donaciones aún no están disponibles.');

  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secreto}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) {
    console.error('PayPal (token) respondió', r.status);
    throw httpError(502, 'No se pudo conectar con PayPal.');
  }
  return (await r.json()).access_token;
}

async function crearOrden(monto) {
  const token = await obtenerToken();
  const r = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID()
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        description: 'Donación a Dancing Dead Dystopia',
        amount: { currency_code: MONEDA, value: monto }
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'Dancing Dead Dystopia',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            return_url: `${URL_SITIO}/donacion/exito`,
            cancel_url: `${URL_SITIO}/donacion/cancelado`
          }
        }
      }
    })
  });
  const orden = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('PayPal (crear orden) respondió', r.status, JSON.stringify(orden).slice(0, 300));
    throw httpError(502, 'No se pudo crear la donación.');
  }
  const enlace = (orden.links || []).find((l) => l.rel === 'payer-action' || l.rel === 'approve');
  if (!enlace) throw httpError(502, 'PayPal no devolvió el enlace de pago.');
  return enlace.href;
}

async function capturarOrden(idOrden) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(idOrden)) throw httpError(400, 'Orden no válida.');
  const token = await obtenerToken();
  const r = await fetch(`${BASE}/v2/checkout/orders/${idOrden}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID()
    }
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || datos.status !== 'COMPLETED') {
    console.error('PayPal (captura) respondió', r.status, datos.status);
    throw httpError(502, 'No se pudo confirmar la donación.');
  }
  return datos;
}

module.exports = { crearOrden, capturarOrden };
