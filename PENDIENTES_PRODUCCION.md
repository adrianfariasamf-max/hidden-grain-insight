# Pendientes para la fase de producción

## Infraestructura de correo institucional

- **Estado actual (piloto):** no hay dominio de envío configurado. Supabase Auth
  utiliza el remitente compartido por defecto, con cuota horaria muy limitada y
  entrega no garantizada.
- **Impacto funcional:**
  - El flujo de **recuperación de contraseña** (`/auth` → "¿Olvidaste tu
    contraseña?") queda expuesto en la interfaz y responde correctamente a nivel
    de API, pero **la entrega del correo no está garantizada**.
  - Cualquier email transaccional futuro (invitaciones, notificaciones a
    participantes, alertas al OWNER) queda igualmente bloqueado hasta resolver
    este punto.
- **Acción requerida en producción:** configurar un dominio de envío propio
  (p. ej. `notify.<dominio-institucional>`) en Lovable Emails, verificar DNS
  (SPF/DKIM/DMARC) y validar entrega real de correos de auth.
- **Mitigación durante el piloto:** el OWNER es único y su contraseña se
  gestiona manualmente. El registro público está deshabilitado, por lo que no
  se emiten correos de confirmación.

## Alta de investigadores adicionales

- Con el registro público deshabilitado, incorporar nuevos investigadores
  requiere una acción administrativa del OWNER (aún no expuesta en UI).
- Pendiente: flujo de invitación controlada (dependiente también del correo
  institucional).

## Enlace público del participante (vista previa vs. publicado)

- **Diagnóstico:** el 401 `{"error":"unauthorized"}` reportado al abrir el
  enlace del participante NO provenía de nuestros endpoints públicos
  (`/api/public/*` responden `200` sin sesión), sino del hecho de que
  `SharePanel` construía el enlace con `window.location.origin`, que en
  el entorno de vista previa (`id-preview--…lovable.app` /
  `lovableproject.com`) está protegido por el gate de autenticación de la
  plataforma. Cualquier participante que abría ese enlace era interceptado
  por el auth-bridge de Lovable.
- **Mitigación aplicada:** `SharePanel` ahora prefiere
  `VITE_HG_PUBLIC_BASE` (dominio publicado) y, si detecta que el
  investigador está en vista previa sin override, muestra una advertencia
  explícita. El `.env` del piloto ya apunta a
  `https://hidden-grain-insight.lovable.app`.
- **Acción en producción:** al mover el sitio a un dominio institucional,
  actualizar `VITE_HG_PUBLIC_BASE` con el dominio final antes de compartir
  enlaces.