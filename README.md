# AI Setter — B2B Appointment Bot

Bot de calificación y agendamiento automático para canales de Instagram y WhatsApp, integrado con GoHighLevel y Claude AI.

---

## Variables de entorno

Copiá `.env.example` a `.env` y completá cada valor antes de deployar.

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (Railway lo asigna automáticamente) |
| `ANTHROPIC_API_KEY` | API Key de Anthropic — [console.anthropic.com](https://console.anthropic.com) |
| `GHL_API_KEY` | API Key de GoHighLevel (ver instrucciones abajo) |
| `GHL_LOCATION_ID` | ID de la ubicación en GHL |
| `GHL_CALENDAR_ID` | ID del calendario donde se agendarán las citas |
| `WEBHOOK_SECRET` | Secreto para validar webhooks (opcional, uso futuro) |
| `SETTER_NAME` | Nombre del setter IA (ej: `Sofía`) |
| `BUSINESS_NAME` | Nombre de tu agencia |
| `BUSINESS_SERVICE` | Descripción en una línea de tu servicio |
| `BUSINESS_TARGET_CLIENT` | Perfil del cliente ideal |
| `CALENDAR_LINK` | Link de Calendly u otro calendario (fallback manual) |
| `MIN_EMPLOYEES` | Mínimo de empleados para calificar (default: `5`) |

---

## Cómo obtener el GHL API Key

1. Ir a **Settings → Integrations → API Keys**
2. Crear una nueva API Key con permisos de lectura y escritura
3. Copiar el valor y pegarlo en `GHL_API_KEY`

Para obtener el `GHL_LOCATION_ID`:
- Ir a **Settings → Business Info**
- El ID aparece en la URL: `app.gohighlevel.com/location/LOCATION_ID/...`

---

## Configurar el webhook en GoHighLevel

1. Ir a **Settings → Webhooks → Add Webhook**
2. Completar:
   - **Name:** AI Setter
   - **URL:** `https://TU-APP.railway.app/webhook/ghl`
   - **Events:** seleccionar `Inbound Message`
3. Guardar

El bot procesará automáticamente los mensajes entrantes de Instagram y WhatsApp. Los mensajes de otros canales (SMS, GMB) son ignorados.

---

## Deploy en Railway

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Crear proyecto nuevo
railway init

# 4. Configurar variables de entorno
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set GHL_API_KEY=...
# (repetir para cada variable)

# 5. Deploy
railway up
```

O conectar el repositorio de GitHub desde el dashboard de Railway para deploys automáticos en cada push.

---

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Health check — Railway lo usa para verificar que el servicio está vivo |
| `POST` | `/webhook/ghl` | Recibe eventos de GoHighLevel |

---

## Flujo del setter

```
Mensaje entrante (Instagram / WhatsApp)
        ↓
Verificación locationId
        ↓
Claude califica al prospecto (hasta 5 preguntas)
        ↓
    ┌───┴───┐
 Califica   No califica
    ↓           ↓
Muestra    Cierra con
  slots    cordialidad
    ↓
Prospecto elige horario
    ↓
Cita agendada en GHL + tag "cita-agendada"
```
