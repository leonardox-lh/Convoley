# Convoley · Visión del producto

## El problema

En Lima hay muchas comunidades de vóley (no siempre clubes formales) que convocan al público por TikTok e Instagram y organizan todo por comunidades de WhatsApp, con grupos separados por nivel (general, amateur, competitivo). Cada semana el organizador:

- Publica la convocatoria y la gente se anota escribiendo en el grupo.
- Cobra por Yape/Plin y revisa capturas una por una.
- Arma la lista a mano y la comparte como texto o imagen.
- Vende polos, rodilleras u otros artículos del club por chat.

Es lento, desordenado y genera errores (pagos que no se ven, cupos sobrevendidos, faltones).

## La solución

Convoley digitaliza ese flujo con un link que el organizador comparte en WhatsApp:

1. El jugador abre el link, ve la convocatoria y se inscribe en segundos (como invitado o con Google).
2. Paga con Yape o tarjeta y queda confirmado automáticamente (o sube su voucher si el club usa pago directo).
3. El organizador ve la lista en tiempo real y genera con un clic una imagen bonita de la lista para WhatsApp/Instagram.
4. El club vende sus artículos y planes (paquetes de fechas, mensualidades) en la misma plataforma.

## Usuarios

- **Organizador**: dueño de la comunidad. Crea convocatorias, cobra, comparte listas, vende. Es quien paga Convoley.
- **Coorganizador**: ayudante con permisos limitados (aprobar pagos, check-in).
- **Jugador**: entra desde el celular por un link de WhatsApp. Quiere anotarse y pagar rápido.
- **Dueño de Convoley** (yo): administra clubes y suscripciones.

## Modelo de negocio

- Suscripción mensual por club: **S/49** (precio de fundador congelado para los primeros 5–10 clubes), 30 días de prueba gratis.
- El club piloto (el organizador que pidió la herramienta) usa Convoley gratis el primer mes a cambio de feedback.
- La comisión de la pasarela la paga el organizador desde su cobro o la traslada al jugador como "cargo por servicio".
- Futuro: plan superior (recordatorios por WhatsApp, torneos, estadísticas), convocatorias destacadas en un directorio público.

## Decisiones tomadas

- **Pagos**: Mercado Pago Checkout API (Yape con celular + código de aprobación, y tarjeta). Cada organizador conecta su propia cuenta por OAuth; el dinero va directo a él. No se puede detectar automáticamente un pago al QR personal de Yape, por eso el pago con voucher queda como alternativa manual.
- **Cuentas**: el jugador puede inscribirse sin cuenta. Si quiere, crea cuenta con Google en un clic (sin código de verificación) y sus inscripciones como invitado se vinculan por celular.
- **Mobile-first**: la gran mayoría del tráfico viene de WhatsApp en el celular.
- **Mercado inicial**: Lima, vóley amateur. El nombre y la arquitectura no deben impedir abrirse a otros deportes después.

## Qué diferencia a Convoley

Las plataformas que existen (TeamSnap, OpenSports, Playoff, Clupik, apps de fútbol como Sivoy) no combinan: vóley amateur peruano + convocatoria semanal + Yape + imagen de la lista para WhatsApp + tienda del club. La imagen compartible es clave: cada lista publicada es publicidad gratis para Convoley.

## Roadmap

| Sprint | Objetivo |
|---|---|
| 0 | Fundamentos: repo, despliegue, base de datos, archivos, sandbox de pagos |
| 1 | Club, convocatorias e inscripción |
| 2 | Pago con voucher, lista de espera, cuenta con Google, imagen de la lista → **MVP para el club piloto** |
| 3 | Pago automático con Mercado Pago |
| 4 | Tienda y planes |
| 5 | Operación semanal: recurrentes, cancelaciones, armado de equipos, coorganizadores |
| 6 | Lanzamiento comercial: suscripción, panel admin, finanzas |
