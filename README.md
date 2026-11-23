# Dancing Dead Dystopia – Página de promoción

Sitio web con frontend en HTML/CSS/JavaScript y backend en Node.js (Express) que consume **dos servicios web externos**:

| # | Servicio externo | Para qué se usa | Archivo |
|---|------------------|-----------------|---------|
| 1 | API REST de **Brevo** | Registrar el correo de quien se suscribe | `server/services/correo.js` |
| 2 | API REST de **PayPal** (Orders v2) | Crear y confirmar donaciones | `server/services/paypal.js` |

## Estructura

```
dancing-dead-dystopia/
├── public/                <- lo que ve el visitante (frontend)
│   ├── index.html         <- contenido de las 3 secciones
│   ├── styles.css         <- diseño (colores, fuentes, adaptación a móvil)
│   ├── app.js             <- comportamiento: navegación, formularios, llamadas a la API
│   └── img/               <- imágenes del juego
├── server/                <- backend
│   ├── server.js          <- rutas de la API
│   ├── services/          <- conexión con Brevo y PayPal
│   └── data/entradas.json <- entradas de la sección Desarrollo
├── .env.example           <- plantilla de claves
├── Dockerfile             <- para desplegar en la nube
└── package.json
```

## Cómo ejecutarlo en tu computadora

1. Instala **Node.js** (versión 20 o superior) desde nodejs.org.
2. Abre esta carpeta en VS Code y abre la terminal (Terminal → Nueva terminal).
3. Instala las dependencias: `npm install`
4. Copia `.env.example` como `.env` (puede quedar vacío al principio).
5. Inicia el servidor: `npm run dev` (se reinicia solo al guardar cambios en el servidor).
6. Abre http://localhost:3000

Sin claves, el sitio funciona y los formularios responden "aún no está disponible". Eso es normal.

## Conectar los servicios

**Brevo (correo)**
1. Crea una cuenta en Brevo y una lista de contactos.
2. Copia tu clave API en `BREVO_API_KEY` y el número de la lista en `BREVO_LIST_ID`.
3. Suscríbete desde la página y revisa que el contacto aparezca en la lista.

**PayPal (donaciones, modo prueba)**
1. Entra a developer.paypal.com con tu cuenta y crea una app en *Apps & Credentials* (pestaña Sandbox).
2. Copia el Client ID y el Secret en `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`. Deja `PAYPAL_ENV=sandbox`.
3. Dona desde la página con una **cuenta de prueba** de PayPal (se crean en el mismo panel, sección Sandbox accounts).
4. Para cobros reales: cambia a credenciales *Live* y `PAYPAL_ENV=live`. PayPal puede exigir ciertos requisitos de cuenta; revísalos en su documentación.

> Revisa la documentación oficial de Brevo y PayPal para confirmar que las rutas y los campos usados en `services/` siguen vigentes; las APIs cambian con el tiempo.

## Rutas de la API propia (útil para el informe de SOA)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/entradas` | Devuelve las entradas de desarrollo (JSON) |
| POST | `/api/suscribir` | Recibe `{ "email": "..." }` y lo registra en Brevo |
| POST | `/api/donar` | Recibe `{ "monto": 100 }`, crea la orden en PayPal y devuelve `{ "url": "..." }` |
| GET | `/donacion/exito` | Regreso de PayPal: captura el pago y redirige al sitio |
| GET | `/donacion/cancelado` | Regreso si el visitante cancela |
| GET | `/api/salud` | Revisión de estado del servidor |
| GET | `/api/config` | Moneda de las donaciones |

**Flujo de donación:** formulario → `POST /api/donar` → el servidor pide un token a PayPal y crea la orden → el visitante aprueba en PayPal → PayPal lo regresa a `/donacion/exito` → el servidor captura el pago.

## Seguridad básica incluida

- Las claves viven en `.env` (nunca en el navegador ni en GitHub).
- Validación de correo y de monto en el servidor.
- Límite de solicitudes por IP (`express-rate-limit`).
- Los errores no revelan datos internos al visitante.

## Cómo agregar una entrada de desarrollo

Edita `server/data/entradas.json`, copia una entrada y cambia sus campos. Para una imagen, guarda el archivo en `public/img/` y pon `"imagen": "img/nombre.png"`. Para un video, usa `"video": "https://..."`. Recarga la página; no hace falta reiniciar.

## Despliegue en la nube (para la materia)

Con Docker:

```
docker build -t dancing-dead-dystopia .
docker run -p 3000:3000 --env-file .env dancing-dead-dystopia
```

En cualquier proveedor, define las variables del `.env` en su panel (no subas el archivo) y cambia `BASE_URL` a la dirección pública del sitio, porque PayPal usa esa dirección para regresar al visitante.
