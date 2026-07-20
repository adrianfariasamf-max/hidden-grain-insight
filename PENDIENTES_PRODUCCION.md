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