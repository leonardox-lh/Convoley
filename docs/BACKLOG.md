# Convoley · Product Backlog

Fuente de verdad de las historias para Claude Code. La planilla compartida (Sheets) es para seguimiento; si cambias algo allí, actualízalo aquí también.

Prioridad (MoSCoW): **Must** imprescindible · **Should** importante · **Could** deseable · **Won't** por ahora no.
Puntos: esfuerzo relativo (1, 2, 3, 5, 8, 13).

---

## Sprint 0 · Fundamentos

### HT-01 · Fundamentos técnicos · Must · 3 pts
Como desarrollador, quiero el repositorio con el stack base (Next.js + TypeScript + PostgreSQL + ORM) y linters configurados, para construir sobre una base ordenada.
- Repo en GitHub con README y CLAUDE.md
- El proyecto corre en local con un comando
- Lint y formato automáticos
- Estructura de carpetas de `docs/ARQUITECTURA.md` creada, con un módulo de ejemplo
- ESLint bloquea importaciones prohibidas entre capas y módulos (eslint-plugin-boundaries o dependency-cruiser)

### HT-02 · Fundamentos técnicos · Must · 3 pts
Como desarrollador, quiero desplegar automáticamente a la nube (entornos dev y prod), para probar cada cambio en línea.
- Un push a main despliega a producción
- Variables de entorno separadas por entorno
- Dominio (convoley.pe o temporal) con HTTPS
- Decisión (2026-11-24): para el MVP hay un solo entorno en la nube (`production`, desde `main`); "separadas" = local (`.env.local`) frente a Railway. El entorno dev se agrega cuando haga falta.

### HT-03 · Fundamentos técnicos · Must · 5 pts
Como desarrollador, quiero el modelo de datos inicial (clubes, comunidades, convocatorias, inscripciones, pagos, productos, pedidos), para soportar el MVP.
- Migraciones versionadas
- Datos de prueba (seed)
- Modelo documentado en el repo

### HT-04 · Fundamentos técnicos · Must · 2 pts
Como desarrollador, quiero almacenamiento de imágenes (logos, vouchers, productos), para que los usuarios puedan subir archivos.
- Límite de tamaño y tipos (jpg, png, webp)
- Los vouchers no son públicos (URLs firmadas)

### HT-05 · Fundamentos técnicos · Should · 1 pt
Como desarrollador, quiero una cuenta de Mercado Pago en modo prueba (sandbox), para desarrollar el cobro sin dinero real.
- Credenciales de prueba en variables de entorno
- Usuarios de prueba creados

---

## Sprint 1 · Club, convocatorias e inscripción

### HU-01 · Cuenta y club · Must · 3 pts
Como organizador, quiero registrarme e iniciar sesión (Google o correo), para administrar mi club.
- Login con Google y con correo + contraseña
- Recuperar contraseña
- Si no tiene club, lo lleva a crearlo

### HU-02 · Cuenta y club · Must · 3 pts
Como organizador, quiero crear el perfil de mi club (nombre, logo, colores, descripción, redes), para que los jugadores me reconozcan.
- Link único: convoley.pe/nombre-del-club
- Logo de hasta 2 MB
- Editable en cualquier momento

### HU-03 · Convocatorias · Must · 3 pts
Como jugador, quiero ver la página pública del club con sus convocatorias abiertas, para elegir a cuál ir.
- No necesita cuenta
- Muestra fecha, lugar, precio y cupos restantes
- Pensada primero para celular

### HU-04 · Convocatorias · Must · 5 pts
Como organizador, quiero crear una convocatoria (fecha, hora, lugar con link de Maps, precio, cupos, nivel, reglas como mixto), para abrir inscripciones.
- Estados: borrador, publicada, llena, cerrada, cancelada
- Valida fecha futura y cupos > 0
- Genera un link para compartir

### HU-05 · Convocatorias · Must · 3 pts
Como organizador, quiero editar o cancelar una convocatoria, para manejar cambios de último momento.
- No se pueden bajar los cupos por debajo de los confirmados
- Al cancelar, los inscritos ven el aviso
- Los pagos quedan marcados para devolución o saldo a favor

### HU-06 · Inscripción · Must · 3 pts
Como jugador, quiero inscribirme con nombre, apellido y celular sin crear cuenta, para anotarme rápido.
- Al inscribirse puede elegir: "Continuar como invitado" o "Continuar con Google"
- Como invitado: celular peruano de 9 dígitos, sin cuenta ni contraseña
- No permite el mismo celular dos veces en la misma convocatoria
- Muestra confirmación con estado "pendiente de pago"

### HU-07 · Inscripción · Must · 3 pts
Como organizador, quiero ver la lista de inscritos en tiempo real con su estado de pago, para controlar mi convocatoria.
- Ordenada por hora de inscripción
- Filtro por estado de pago
- Contador de cupos ocupados / libres

### HU-08 · Inscripción · Must · 2 pts
Como organizador, quiero agregar o quitar jugadores manualmente, para registrar a quienes pagan en efectivo o por fuera.
- Marcar como "pagado manual"
- Quitar a alguien libera su cupo

---

## Sprint 2 · Voucher, lista de espera e imagen de la lista (MVP piloto)

### HU-48 · Inscripción · Must · 3 pts
Como jugador, quiero crear mi cuenta o iniciar sesión con Google en un clic, sin códigos de verificación, para que mis datos se completen solos y vea mis inscripciones.
- Botón "Continuar con Google" (OAuth): sin contraseña ni código
- La cuenta queda asociada al email de Google
- La primera vez solo pide el celular; después nombre, apellido y celular se autocompletan
- Si antes se inscribió como invitado con ese celular, esas inscripciones se vinculan a su cuenta
- Ve "Mis inscripciones" con su estado de pago

### HU-09 · Cuenta y club · Should · 2 pts
Como organizador, quiero crear comunidades o niveles (General, Amateur, Competitivo), para separar mis convocatorias como en mis grupos de WhatsApp.
- Crear, editar y eliminar comunidades
- Cada convocatoria pertenece a una comunidad

### HU-10 · Inscripción · Should · 1 pt
Como jugador, quiero indicar mi posición y nivel al inscribirme (opcional), para que luego se armen equipos parejos.
- Posiciones: armador, líbero, punta, central, opuesto, cualquiera
- Niveles: principiante, intermedio, avanzado

### HU-11 · Convocatorias · Should · 2 pts
Como organizador, quiero que el link de la convocatoria muestre una vista previa (título, fecha, cupos) al compartirlo en WhatsApp, para que llame la atención.
- Imagen Open Graph generada por convocatoria
- Título y descripción dinámicos

### HU-12 · Inscripción · Must · 3 pts
Como jugador, quiero entrar a la lista de espera cuando no hay cupos, para no perder la oportunidad.
- Orden por llegada
- Al liberarse un cupo, pasa el primero automáticamente
- El jugador ve su posición en la espera

### HU-13 · Pagos · Must · 2 pts
Como organizador, quiero configurar mi QR y número de Yape/Plin, para recibir pagos directos.
- Subir la imagen del QR
- Número y nombre del titular visibles para el jugador

### HU-14 · Pagos · Must · 3 pts
Como jugador, quiero subir la captura de mi pago (voucher), para que el organizador lo valide.
- Acepta imagen desde la galería del celular
- Campo opcional para el código de seguridad de Yape
- El estado pasa a "en revisión"

### HU-15 · Pagos · Must · 2 pts
Como organizador, quiero aprobar o rechazar vouchers con un clic, para confirmar pagos rápido.
- Ver la captura ampliada
- Rechazar con motivo
- Al aprobar, el estado pasa a "pagado"

### HU-16 · Lista e imágenes · Must · 5 pts
Como organizador, quiero generar una imagen de la lista con el logo y los colores del club, para compartirla en WhatsApp e Instagram.
- Formatos cuadrado (1:1) e historia (9:16)
- Lista numerada que marca quién pagó
- Descargar PNG o compartir directo desde el celular

### HU-17 · Lista e imágenes · Must · 1 pt
Como organizador, quiero copiar la lista como texto (1. Juan ✅), para pegarla en WhatsApp.
- Un botón copia al portapapeles
- Incluye la lista de espera

---

## Sprint 3 · Pago automático con Mercado Pago

### HU-18 · Pagos · Must · 5 pts
Como organizador, quiero conectar mi cuenta de Mercado Pago, para cobrar automáticamente y recibir el dinero directo en mi cuenta.
- Conexión por autorización (OAuth), sin compartir contraseñas
- Se puede desconectar
- Convoley nunca retiene el dinero

### HU-19 · Pagos · Must · 8 pts
Como jugador, quiero pagar con Yape (celular + código de aprobación) o con tarjeta dentro de Convoley, para no mandar capturas.
- Pago sin salir de la página
- Mensajes claros si el pago falla
- Funciona bien en celular

### HU-20 · Pagos · Must · 5 pts
Como sistema, quiero marcar la inscripción como pagada al recibir la confirmación de Mercado Pago, para que no haya revisión manual.
- Webhook con firma verificada
- Idempotente: no duplica pagos
- Si el cupo ya se llenó, pasa a lista de espera o se devuelve

### HU-21 · Pagos · Should · 3 pts
Como jugador, quiero que mi cupo quede reservado unos minutos mientras pago, para no perderlo a medio pago.
- Reserva de 10 minutos
- Si vence sin pago, el cupo se libera

### HU-22 · Pagos · Could · 2 pts
Como organizador, quiero definir un cargo por servicio opcional, para trasladar la comisión de la pasarela al jugador.
- Monto fijo o porcentaje
- Se muestra al jugador antes de pagar

---

## Sprint 4 · Tienda y planes

### HU-23 · Tienda · Must · 5 pts
Como organizador, quiero publicar productos (fotos, precio, tallas, stock), para vender los artículos de mi club.
- Hasta 5 fotos por producto
- Variantes por talla
- El stock se descuenta al pagar

### HU-24 · Tienda · Must · 5 pts
Como jugador, quiero comprar un producto y pagarlo (Mercado Pago o voucher) con recojo en la cancha.
- Carrito simple
- Mismos métodos de pago que la inscripción
- Elegir en qué convocatoria lo recoge

### HU-25 · Tienda · Must · 3 pts
Como organizador, quiero ver y gestionar los pedidos (pendiente, pagado, entregado).
- Filtro por estado
- Marcar como entregado

### HU-26 · Planes · Should · 5 pts
Como organizador, quiero crear planes o paquetes (4 fechas por S/50, mensualidad), para asegurar ingresos fijos.
- Número de fechas o vigencia en días
- Precio
- Aplica a ciertas comunidades

### HU-27 · Planes · Should · 5 pts
Como jugador, quiero comprar un plan y usar mis créditos al inscribirme, para no pagar cada vez.
- Ver créditos restantes
- La inscripción con crédito queda "pagada"
- Se identifica por su cuenta de Google o por el celular

---

## Sprint 5 · Operación semanal

### HU-28 · Operación del club · Should · 3 pts
Como organizador, quiero programar convocatorias recurrentes (por ejemplo, todos los martes 8 p. m.), para no crearlas cada semana.
- Frecuencia semanal
- Se publican X días antes
- Se pueden pausar

### HU-29 · Inscripción · Should · 2 pts
Como jugador, quiero cancelar mi inscripción con un link, para liberar mi cupo si no puedo ir.
- Link único que recibe al inscribirse
- Respeta la política de cancelación del club

### HU-30 · Operación del club · Should · 5 pts
Como organizador, quiero definir una política de cancelación con saldo a favor, para reducir a los faltones.
- Horas límite configurables
- Antes del límite: saldo a favor
- Después del límite: se pierde el pago

### HU-31 · Día de juego · Should · 8 pts
Como organizador, quiero armar equipos parejos automáticamente según nivel, posición y reglas (mínimo de chicas en mixto), para evitar discusiones.
- Elegir el número de equipos
- Respeta las reglas de mixto
- Permite mover jugadores a mano

### HU-32 · Día de juego · Should · 2 pts
Como organizador, quiero generar una imagen de los equipos, para mandarla al grupo.
- Mismo estilo que la imagen de la lista

### HU-33 · Operación del club · Should · 3 pts
Como organizador, quiero invitar coorganizadores con permisos limitados, para que me ayuden sin darles mi cuenta.
- Roles: administrador y ayudante
- El ayudante aprueba pagos y hace check-in, pero no ve finanzas

---

## Sprint 6 · Lanzamiento comercial

### HU-34 · Finanzas · Should · 5 pts
Como organizador, quiero un panel de finanzas por convocatoria y por mes (recaudado, costo de cancha, ganancia), exportable a Excel.
- Registrar el costo de la cancha
- Ganancia calculada
- Exportar a Excel / CSV

### HU-35 · Suscripción Convoley · Must · 5 pts
Como dueño de Convoley, quiero cobrar la suscripción mensual (S/49) con 30 días de prueba gratis, para monetizar la plataforma.
- Prueba gratis de 30 días
- Aviso antes de vencer
- Sin pago, el club queda en solo lectura

### HU-36 · Suscripción Convoley · Should · 3 pts
Como dueño de Convoley, quiero un panel de administración, para ver clubes, uso y estado de suscripción.
- Lista de clubes con su estado
- Suspender o reactivar
- Métricas: convocatorias e inscritos por mes

### HU-37 · Lista e imágenes · Could · 3 pts
Como organizador, quiero generar un flyer de la convocatoria con los cupos disponibles, para promocionarla en TikTok e Instagram.
- Formato historia 9:16
- Muestra fecha, lugar, precio y cupos

### HU-38 · Día de juego · Could · 3 pts
Como organizador, quiero hacer check-in con QR en la cancha, para registrar la asistencia.
- Un QR por inscripción
- También se puede marcar asistencia a mano

---

## Futuro

### HU-39 · Día de juego · Could · 3 pts
Como organizador, quiero ver un historial de faltones (inscritos que no fueron), para exigirles pago adelantado o bloquearlos.
- Se calcula con el check-in
- Opción de bloquear por celular

### HU-40 · Día de juego · Could · 5 pts
Como organizador, quiero manejar en vivo la cola de equipos ("ganador se queda"), para ordenar la rotación en la cancha.
- Registrar quién ganó cada partido
- Muestra qué equipo entra y cuál sale
- Pantalla visible para todos

### HU-41 · Tienda · Could · 3 pts
Como jugador, quiero agregar un producto al inscribirme (rodilleras, bebida), para pagar todo junto.
- Productos sugeridos en la inscripción
- Un solo pago

### HU-42 · Comunidad · Could · 5 pts
Como jugador, quiero un perfil con mis partidos jugados y mis clubes, para llevar mi historial.
- Usa la misma cuenta de Google de HU-48 (sin códigos)
- Historial de inscripciones

### HU-43 · Comunidad · Could · 3 pts
Como jugador, quiero votar al MVP de cada fecha, para hacerlo más divertido.
- Solo votan los asistentes
- Ranking mensual por club

### HU-44 · Comunidad · Could · 8 pts
Como jugador, quiero buscar convocatorias de todos los clubes de Lima por distrito, nivel, precio y fecha, para encontrar dónde jugar.
- Solo aparecen los clubes que acepten
- Filtros y mapa

### HU-45 · Finanzas · Could · 3 pts
Como organizador, quiero mostrar logos de auspiciadores en mis imágenes, para monetizar mi comunidad.
- Hasta 3 logos
- Posición configurable

### HU-46 · Torneos · Could · 13 pts
Como organizador, quiero crear torneos con inscripción y pago por equipos, fixture y resultados.
- Inscripción por equipo
- Fixture automático
- Tabla de resultados

### HU-47 · Comunicación · Won't · 5 pts
Como jugador, quiero recibir un recordatorio por WhatsApp antes del partido, para no olvidarme.
- Requiere la API oficial de WhatsApp (costo por mensaje)
- Candidata a un plan superior
