# Sprint 1 · El organizador abre su convocatoria y los jugadores se inscriben

Orden sugerido: HU-04 ✅ → HU-05 ✅ → HU-01 → HU-02 → HU-03 → HU-06 → HU-07 → HU-08

Estado al iniciar: HU-04 y HU-05 están en `main` (commit `f69b5c0`). Los módulos `events`, `registrations` (mínimo) y `payments` (mínimo) existen. Crear, editar y cancelar convocatorias solo funcionan en desarrollo (`organizer-access.ts`) hasta que HU-01 agregue el login.

Pendiente del Sprint 0 que bloquea este sprint: **HT-04** (bucket de imágenes) antes del logo de HU-02. HT-05 (Mercado Pago sandbox) no bloquea nada aquí.

**Decisión (2026-11-24): por ahora no hay Mercado Pago ni pago automático.** El jugador paga por fuera y el organizador revisa y cambia el estado de pago él mismo (HU-08). HT-05 y las historias de Mercado Pago quedan para después.

Librerías nuevas a aprobar: `next-auth@5` + `@auth/prisma-adapter` (login), `@node-rs/argon2` (hash de contraseñas) y un proveedor de correo para recuperar la contraseña (propuesta: `resend`).

## HU-04 · Crear convocatoria (5 pts) ✅
Depende de: HT-03
- [x] Módulo `events`: dominio, `createEvent`, repositorio Prisma, adapter de `clubs`
- [x] Formulario `/admin/[club]/convocatorias/nueva` y página pública mínima `/c/[club]/[event]`
- [x] Tests unitarios, de integración y e2e

## HU-05 · Editar o cancelar convocatoria (3 pts) ✅
Depende de: HU-04
- [x] Migración `cancellation_outcome` (Event y Payment)
- [x] `updateEvent` y `cancelEvent` en una transacción con la fila bloqueada; módulos `registrations` y `payments` mínimos
- [x] Página `/admin/[club]/convocatorias/[event]/editar` y aviso en la página pública
- [ ] E2E de editar y cancelar (no se pudo correr: el dev server tenía un Prisma client viejo)

## HU-01 · Login del organizador (3 pts)
Depende de: HT-03 (tablas de Auth.js ya existen)
- [ ] Aprobar e instalar `next-auth@5`, `@auth/prisma-adapter`, `@node-rs/argon2` y el proveedor de correo
- [ ] Credenciales de Google OAuth (a cargo tuyo, en Google Cloud) y variables `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, clave del correo en `env.ts`, `.env.example` y Railway
- [ ] Modelo: tabla `PasswordResetToken` (hash del token, `userId`, `expiresAt`, `usedAt`) y su migración
- [ ] Módulo `identity`, dominio: value object `Password` (largo mínimo) y errores (`InvalidCredentialsError`, `EmailAlreadyRegisteredError`, `ResetTokenExpiredError`)
- [ ] `identity`, casos de uso: `registerOrganizer`, `verifyCredentials`, `requestPasswordReset`, `resetPassword`; puertos `PasswordHasher` y `EmailSender`
- [ ] `src/lib/auth.ts`: Auth.js con Google + Credentials, adapter de Prisma y sesión JWT
- [ ] Páginas `/ingresar`, `/registro`, `/recuperar` y `/recuperar/[token]` (mobile-first, en español tuteando)
- [ ] Tras iniciar sesión: si no es miembro de ningún club, redirigir a `/club/nuevo` (HU-02)
- [ ] `requireOrganizer(clubSlug)`: verifica sesión y `ClubMember` del club; reemplaza `isEventManagementEnabled()` en páginas y server actions de convocatorias
- [ ] Tests: unitarios de `Password` y de los casos de uso con fakes, integración del token de recuperación (expira, se usa una vez), e2e de registro e inicio de sesión con correo

## HU-02 · Perfil del club (3 pts)
Depende de: HU-01, HT-04
- [ ] Decidir la URL pública: `convoley.pe/<club>` (raíz, choca con rutas propias como `/ingresar`; requiere lista de slugs reservados) o mantener `/c/<club>`
- [ ] `clubs`, dominio: validación de colores hex y de links de Instagram y TikTok, slugs reservados, errores tipados
- [ ] `clubs`, casos de uso: `createClub` (slug único, crea el `ClubMember` admin y la comunidad "General") y `updateClubProfile`; puerto `ClubRepository`
- [ ] Logo de hasta 2 MB (jpg, png, webp) con el `FileStorage` de `media` (HT-04); el logo es público, a diferencia de los vouchers
- [ ] Páginas `/club/nuevo` y `/admin/[club]/perfil`, protegidas con `requireOrganizer`
- [ ] Tests: unitarios de slug, colores y redes; casos de uso con fakes (slug repetido); integración de crear el club con su admin

## HU-03 · Página pública del club (3 pts)
Depende de: HU-02 (perfil), HU-04 (convocatorias)
- [ ] `events`: caso de uso `listOpenEvents(clubSlug)`: publicadas y llenas, futuras, ordenadas por fecha, con cupos restantes (usa `countConfirmedRegistrations`)
- [ ] Contar los confirmados de varias convocatorias en una sola consulta (evitar N+1)
- [ ] Página `/c/[club]` (o la URL elegida en HU-02): logo, colores, descripción, redes y tarjetas de convocatoria (fecha, lugar, precio, cupos restantes), sin cuenta
- [ ] Que un club o una convocatoria inexistente responda HTTP 404 y no 200: hoy `notFound()` corre dentro de `<Suspense>` y el estado ya salió como 200 (la página sí muestra "no encontrada")
- [ ] Revisar en 375px; metadata básica para que el link se vea bien en WhatsApp (la imagen OG es HU-17)
- [ ] Tests: caso de uso con fakes (sin borradores, canceladas ni pasadas, cupos restantes), e2e de la página en móvil

## HU-06 · Inscripción como invitado (3 pts)
Depende de: HU-04, HU-03 (punto de entrada); HU-01 para el botón de Google
- [ ] `registrations`, dominio: value object `PhoneNumber` (9 dígitos, empieza con 9, se guarda `+519XXXXXXXX`) y errores (`EventFullError`, `DuplicateRegistrationError`, `EventNotOpenError`)
- [ ] `events`: exponer en su API pública un bloqueo de la fila del evento dentro de una transacción (el mismo `FOR UPDATE` de HU-05) y el cambio a `full`; cuidar la importación circular `events` ⇄ `registrations` (importar solo dentro de funciones)
- [ ] `registrations`, caso de uso `registerGuest`: bloquea el evento, valida que esté publicado, cuenta confirmados, rechaza celular repetido (también por el `@@unique` de la base), reactiva una inscripción cancelada del mismo celular, crea `pending_payment` y marca `full` al ocupar el último cupo
- [ ] Formulario en `/c/[club]/[event]` con "Continuar como invitado" (nombre, apellido, celular) y "Continuar con Google" (usa la sesión de HU-01; autocompletar es HU-48)
- [ ] Pantalla de confirmación con estado "pendiente de pago"
- [ ] Tests: unitarios de `PhoneNumber`, caso de uso con fakes (lleno, duplicado, reactivación, último cupo → full), integración de concurrencia (dos inscripciones al último cupo: entra solo una), e2e de inscripción en móvil

## HU-07 · Lista de inscritos (3 pts)
Depende de: HU-06, HU-01
- [ ] `registrations`: caso de uso `listEventRegistrations` ordenado por hora de inscripción, con el estado de pago y filtro por estado
- [ ] Contador de cupos ocupados y libres
- [ ] Página `/admin/[club]/convocatorias/[event]` con la lista, protegida con `requireOrganizer`
- [ ] "Tiempo real" sin librerías: refrescar cada pocos segundos con `router.refresh()` mientras la pestaña está visible
- [ ] Tests: caso de uso con fakes (orden, filtro, contador), e2e de la lista en móvil

## HU-08 · Agregar o quitar jugadores a mano (2 pts)
Depende de: HU-07
- [ ] `payments`: caso de uso `recordManualPayment` (método `manual`, estado `approved`, monto = precio de la convocatoria en céntimos)
- [ ] `registrations`: `addPlayerManually` (reutiliza las reglas de `registerGuest`; opción "pagado manual") y `removeRegistration` (pasa a `cancelled`, libera el cupo y reabre la convocatoria si estaba llena)
- [ ] Botones en la lista de HU-07: "Agregar jugador", "Marcar pagado manual" y "Quitar" con confirmación
- [ ] Tests: casos de uso con fakes (quitar libera cupo, full → published, pago manual con monto correcto), integración del pago manual
