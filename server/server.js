require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { suscribirCorreo } = require('./services/correo');
const { crearOrden, capturarOrden } = require('./services/paypal');

const app = express();
const PORT = process.env.PORT || 3000;
const MONEDA = process.env.PAYPAL_CURRENCY || 'MXN';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.set('trust proxy', 1); // necesario detrás de un proveedor en la nube
app.use(express.json({ limit: '10kb' }));
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: 'Demasiadas solicitudes. Intenta más tarde.' }
}));
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ---------- API propia ---------- */
app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));
app.get('/api/config', (req, res) => res.json({ moneda: MONEDA }));

app.get('/api/entradas', (req, res, next) => {
  try {
    const ruta = path.join(__dirname, 'data', 'entradas.json');
    res.json(JSON.parse(fs.readFileSync(ruta, 'utf8')));
  } catch (e) { next(e); }
});

app.get('/api/descarga', (req, res, next) => {
  try {
    const ruta = path.join(__dirname, 'data', 'descarga.json');
    res.json(JSON.parse(fs.readFileSync(ruta, 'utf8')));
  } catch (e) { next(e); }
});

app.post('/api/suscribir', async (req, res, next) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ mensaje: 'Escribe un correo válido.' });
  }
  try {
    await suscribirCorreo(email);
    res.json({ mensaje: '¡Gracias! Te avisaremos cuando haya novedades.' });
  } catch (e) { next(e); }
});

app.post('/api/donar', async (req, res, next) => {
  const monto = Number(req.body && req.body.monto);
  if (!Number.isFinite(monto) || monto < 1 || monto > 5000) {
    return res.status(400).json({ mensaje: 'Elige un monto entre 1 y 5000.' });
  }
  try {
    res.json({ url: await crearOrden(monto.toFixed(2)) });
  } catch (e) { next(e); }
});

/* ---------- Regreso desde PayPal ---------- */
app.get('/donacion/exito', async (req, res) => {
  try {
    await capturarOrden(String(req.query.token || ''));
    res.redirect('/?donacion=ok#sub');
  } catch (e) {
    console.error(e.message);
    res.redirect('/?donacion=error#sub');
  }
});
app.get('/donacion/cancelado', (req, res) => res.redirect('/?donacion=cancelado#sub'));

/* ---------- Manejo de errores ---------- */
app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ mensaje: err.mensaje || 'Error interno del servidor.' });
});

app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));
