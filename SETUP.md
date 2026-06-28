# Guía de Setup Completa — AI Setter

Sigue estos pasos en orden para tener el bot funcionando en producción con GoHighLevel.

---

## FASE 1: Obtener Credenciales (30 min)

### 1.1 Anthropic API Key

1. Ve a [console.anthropic.com](https://console.anthropic.com)
2. Login con tu cuenta (crea una si no la tienes)
3. **API Keys** → **Create Key**
4. Copia el valor (empieza con `sk-ant-`)
5. **Guarda este valor** en un archivo temporal (vamos a usarlo después)

### 1.2 GoHighLevel API Key

1. Entra a tu cuenta de GHL
2. **Settings → Integrations → API Keys**
3. **Create New Key**
4. Permisos necesarios:
   - ✅ Conversations (read + write)
   - ✅ Contacts (read + write)
   - ✅ Calendars (read + write)
5. Copia el token
6. **Guarda este valor**

### 1.3 GoHighLevel Location ID

1. En GHL, ve a **Settings → Business Info**
2. En la URL del navegador encontrarás: `.../location/`**`AQUI-VA-EL-ID`**`/dashboard`
3. Copia solo el ID
4. **Guarda este valor**

### 1.4 GoHighLevel Calendar ID

1. En GHL, ve a **Calendars**
2. Clickea sobre el calendario que vas a usar para las citas
3. En la URL: `.../calendar/`**`AQUI-VA-EL-ID`**`/edit`
4. Copia solo el ID
5. **Guarda este valor**

### 1.5 Calendly Link (opcional)

Si tienes Calendly, obtén el link de tu calendario público (ej: `https://calendly.com/tu-nombre`).
Si no lo usarás, deja vacío en la próxima fase.

---

## FASE 2: Deploy en Railway (15 min)

### 2.1 Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo**
3. Autoriza Railway para acceder a GitHub
4. Selecciona `eze022/ai-setter`
5. Railway detecta `railway.json` y hace el deploy automático

### 2.2 Configurar Variables de Entorno

En el dashboard de Railway:
1. Tu proyecto → pestaña **Variables**
2. Clickea **New Variable** y agregá cada una:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (de Anthropic) |
| `GHL_API_KEY` | Token de GHL |
| `GHL_LOCATION_ID` | ID de tu ubicación en GHL |
| `GHL_CALENDAR_ID` | ID del calendario |
| `SETTER_NAME` | Sofía (o tu nombre) |
| `BUSINESS_NAME` | Nombre de tu agencia |
| `BUSINESS_SERVICE` | Descripción corta de tu servicio (ej: "automatización de procesos con IA") |
| `BUSINESS_TARGET_CLIENT` | Perfil del cliente ideal (ej: "empresas +10 empleados en logística") |
| `CALENDAR_LINK` | Tu link de Calendly (o deja vacío) |
| `MIN_EMPLOYEES` | `5` (o el número mínimo que requieras) |

**NO agregues `PORT`** — Railway lo inyecta automáticamente.

Después de guardar, Railway hace un redeploy automático (espera ~2-3 minutos).

### 2.3 Obtener URL del servidor

En Railway:
1. Tu proyecto → pestaña **Settings**
2. Busca **Domains** → copiar el dominio (ej: `ai-setter-prod.up.railway.app`)
3. **Guarda esta URL**

### 2.4 Verificar que funciona

Abre en el navegador:
```
https://TU-DOMINIO.up.railway.app/health
```

Tiene que devolver:
```json
{
  "status": "ok",
  "timestamp": "2026-06-27T20:15:30.123Z"
}
```

---

## FASE 3: Conectar Canales en GoHighLevel (15 min)

### 3.1 Conectar WhatsApp (si lo vas a usar)

1. GHL → **Settings → Integrations → WhatsApp**
2. Seguir los pasos para conectar un número de WhatsApp
3. (Requiere una cuenta de Meta Business)

### 3.2 Conectar Instagram (si lo vas a usar)

1. GHL → **Settings → Integrations → Instagram**
2. Conectar tu cuenta de Facebook/Instagram
3. (Requiere acceso a Facebook Business Manager)

---

## FASE 4: Configurar Webhook en GoHighLevel (10 min)

Este es el paso **más importante** — sin webhook el bot no recibe los mensajes.

1. En GHL: **Settings → Webhooks → Add Webhook**
2. Completar:
   - **Name:** `AI Setter`
   - **URL:** `https://TU-DOMINIO.up.railway.app/webhook/ghl`
   - **Events:** Seleccionar solo `Inbound Message`
   - **Active:** ✅ Tildar

3. Clickea **Save**

GHL enviará un test request — tiene que devolver `200 OK`.

---

## FASE 5: Prueba de Humo (5 min)

### 5.1 Test desde otra cuenta

1. Desde tu teléfono (otra cuenta) o un amigo:
   - Envía un **mensaje de prueba** al número/cuenta de WhatsApp/Instagram conectada
   - El bot tiene que responder en máximo 10 segundos

2. Ejemplo de flujo:
   ```
   TÚ: Hola, quiero saber más sobre vuestro servicio
   BOT: ¡Hola [nombre]! Me alegra que escribas. 
        ¿Qué te llevó a contactarnos hoy?
   TÚ: Queremos mejorar nuestros procesos
   BOT: ¡Genial! ¿Cuántas personas trabajan en tu empresa?
   TÚ: Somos 15
   BOT: Perfecto. ¿Actualmente trabajan con alguna agencia 
        o lo manejan internamente?
   ...
   ```

### 5.2 Verificar logs en Railway

1. Railway → tu proyecto → pestaña **Logs**
2. Cada vez que entra un mensaje, deberías ver:
   ```
   [SetterService] processMessage: { contactId: ..., body: "..." }
   ```

3. Si hay errores de Claude o GHL, aparecerán aquí

---

## FASE 6: Ajustar el Setter (según necesidad)

### Si quieres cambiar el flujo de calificación:

Editar [`src/prompts/setter.js`](./src/prompts/setter.js) — ahí está todo el prompt que sigue Claude.

### Si quieres cambiar el detector de intenciones:

Editar `src/services/setterService.js` — secciones `BOOKING_SIGNALS` y `CLOSED_SIGNALS`.

### Si quieres agregar más validaciones:

Editar `src/webhooks/ghl.js` — ahí es donde se validan los mensajes entrantes.

---

## Troubleshooting

### "El bot no responde"

1. ✅ ¿Webhook está registrado en GHL?
2. ✅ ¿La URL del webhook es correcta? (abre en el navegador `/health`)
3. ✅ ¿El canal está conectado en GHL? (Instagram o WhatsApp)
4. ✅ Mira los logs en Railway → hay error de Claude o GHL

### "Error de API Key"

1. ✅ Copia la API Key exacta de Anthropic (sin espacios)
2. ✅ Copia la API Key de GHL exacta
3. ✅ En Railway, después de cambiar una variable, espera ~30 segundos para el redeploy

### "No se agenda la cita"

1. ✅ ¿`GHL_CALENDAR_ID` es correcto? 
2. ✅ ¿El calendario tiene disponibilidad?
3. ✅ Mira los logs de Railway para el error específico

---

## Checklist Final

- [ ] Tengo todas las 10 variables de entorno configuradas en Railway
- [ ] `/health` responde 200
- [ ] Webhook registrado en GHL apunta a mi URL de Railway
- [ ] Enviré un mensaje de prueba y el bot respondió
- [ ] Puedo ver los logs en Railway
- [ ] El primer flujo de calificación funciona (saludo, preguntas)

---

## Next Steps (Mejoras futuras)

- [ ] Persistencia de estado en base de datos (ahora está en memoria)
- [ ] Dashboard para ver conversaciones activas
- [ ] Integración con Zapier para automatizar más cosas
- [ ] A/B testing de prompts
- [ ] Análisis de calidad de prospectos

