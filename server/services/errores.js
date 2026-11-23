// Error con código HTTP y un mensaje seguro para mostrar al visitante.
function httpError(status, mensaje) {
  const err = new Error(mensaje);
  err.status = status;
  err.mensaje = mensaje;
  return err;
}
module.exports = { httpError };
