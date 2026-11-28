# Convoley

Plataforma web para que clubes y comunidades de vóley de Lima gestionen sus convocatorias semanales: inscripción de jugadores, pagos (Yape/tarjeta), imagen de la lista para WhatsApp/Instagram, tienda del club y planes. Contexto completo del producto en `docs/VISION.md`. Historias de usuario en `docs/BACKLOG.md`.

## Stack

- Next.js (App Router) + TypeScript estricto
- PostgreSQL + Prisma (migraciones versionadas)
- Auth.js: Google OAuth (organizadores y jugadores) + correo/contraseña (solo organizadores)
- Tailwind CSS + shadcn/ui
- Pagos: Mercado Pago Checkout API (Yape + tarjeta) con OAuth por organizador
- Imágenes de lista: generadas en servidor (`next/og` / Satori)
- Archivos: bucket S3-compatible (Railway Bucket)
- Tests: Vitest (unitarios/integración) + Playwright (e2e)
- Despliegue: Railway (app + Postgres + bucket)

Si una historia necesita una librería nueva, proponla en el plan antes de instalarla.

## Comandos

- `npm run dev` · servidor local
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run test:e2e`
- `npx prisma migrate dev --name <nombre>` · crear migración

## Convenciones

- Código, nombres de variables, tablas y commits en inglés. Textos de la interfaz en español peruano, tuteando.
- Mobile-first: casi todos los jugadores entran desde el celular por un link de WhatsApp.
- Montos en soles como enteros en céntimos (`priceCents`). Nunca `float` para dinero.
- Celulares peruanos: 9 dígitos, empiezan con 9. Guardar normalizados (`+519XXXXXXXX`).
- Fechas en UTC en la base de datos; mostrar en `America/Lima`.
- Validar toda entrada con Zod, en el servidor.
- Commits con Conventional Commits y el ID de la historia: `feat(HU-06): guest registration`.

## Arquitectura: monolito modular con DDD ligero

Detalle, ejemplos y glosario en `docs/ARQUITECTURA.md`. Léelo antes de crear un módulo nuevo o de cambiar cómo se comunican los módulos.

```
src/
├── app/            # rutas de Next.js: solo interfaz, server actions y route handlers delgados
├── components/     # UI compartida (shadcn/ui), sin lógica de negocio
├── modules/        # un módulo por contexto del negocio
│   └── <modulo>/
│       ├── domain/          # entidades, value objects, reglas y errores. TypeScript puro
│       ├── application/     # casos de uso + interfaces (puertos) que necesitan
│       ├── infrastructure/  # Prisma, Mercado Pago, bucket: implementan los puertos
│       └── index.ts         # API pública del módulo: lo único que otros pueden importar
└── lib/            # transversal: db client, auth, logger, env, utilidades
```

Módulos: `clubs`, `events` (convocatorias), `registrations`, `payments`, `store`, `plans`, `media`, `billing`, `identity`.

Reglas de dependencia (el reviewer las verifica):

1. `domain/` no importa nada de fuera del módulo: ni Prisma, ni Next.js, ni Zod, ni otros módulos.
2. `application/` depende de `domain/` y de interfaces; nunca de una implementación concreta de `infrastructure/`.
3. `infrastructure/` implementa las interfaces de `application/`. Es el único lugar con Prisma o SDKs externos.
4. Entre módulos, solo se importa desde `modules/<otro>/index.ts`. Nunca sus carpetas internas ni sus tablas.
5. `app/` valida la entrada (Zod), llama a un caso de uso y renderiza. Nada de reglas de negocio ahí.

## Clean Code y SOLID

Aplícalos siempre, con criterio y sin sobreingeniería:

- **S · Responsabilidad única**: un caso de uso hace una cosa (`registerPlayer`, `approveVoucher`). Funciones cortas; si necesitas un "y" para describirla, divídela.
- **O · Abierto/cerrado**: comportamiento que varía (métodos de pago, formatos de imagen) va detrás de una interfaz, para agregar uno nuevo sin tocar los existentes.
- **L · Sustitución de Liskov**: toda implementación de un puerto cumple el mismo contrato, incluidos los fakes de los tests.
- **I · Segregación de interfaces**: interfaces pequeñas y específicas (`RegistrationRepository`), no un "servicio" gigante.
- **D · Inversión de dependencias**: los casos de uso reciben sus dependencias por parámetro (inyección por constructor o función). Nunca hacen `new PrismaClient()` ni importan el SDK de Mercado Pago.
- Nombres que dicen qué es y para qué, con el lenguaje del glosario. Sin abreviaturas ni números mágicos: constantes con nombre.
- Retornos tempranos en lugar de `if` anidados. Funciones con pocos parámetros: usa un objeto si son más de 3.
- Errores de negocio explícitos y tipados en `domain/` (`EventFullError`), no `throw new Error("...")` genérico.
- Los comentarios explican el porqué, no el qué. Sin código muerto ni `console.log` en commits.
- Pragmatismo: no crees una interfaz si solo hay una implementación y no es un borde (repositorio, pasarela, almacenamiento). No agregues capas que la historia no necesita.

## Reglas que no se rompen

- Convoley **nunca retiene dinero**: el pago va directo a la cuenta de Mercado Pago del organizador.
- Webhooks de pago: verificar firma, ser idempotentes, nunca confiar en datos del cliente para marcar "pagado".
- Los vouchers (capturas de pago) no son públicos: solo URLs firmadas para el organizador.
- Un jugador se inscribe **con su cuenta** (Google o correo): sin sesión, la convocatoria le pide iniciar sesión. Solo el organizador agrega jugadores sin cuenta ("Agregar jugador"). No pedir códigos de verificación.
- Nunca subir secretos al repo: todo en variables de entorno (`.env.local`, no versionado).

## Flujo de trabajo por historia

Usa `/historia HU-XX`. El flujo es siempre:

1. Leer la historia y sus criterios en `docs/BACKLOG.md`.
2. Presentar un plan y **esperar aprobación** antes de editar. Para historias de 8+ puntos o de pagos, usar el agente `planner`.
3. Implementar en una rama `feat/HU-XX-descripcion`.
4. Agente `tester`: un test por cada criterio de aceptación, y correrlos.
5. Agente `reviewer`: revisar el diff contra los criterios. Corregir lo que reporte.
6. Lint, typecheck y tests en verde. Commit. Resumir qué se hizo y qué probar a mano.

## Definición de Hecho

Una historia está hecha cuando: cumple todos sus criterios de aceptación, tiene tests que los verifican (las reglas de `domain/` con tests unitarios sin base de datos), respeta las reglas de arquitectura, pasa lint + typecheck + tests, el reviewer no reporta problemas bloqueantes, funciona en un celular (viewport 375px) y está desplegada.

## Uso eficiente

- Una historia por sesión. No leer archivos que la historia no necesita.
- Para buscar en el código, delegar al agente `Explore` (Haiku).
- No usar Opus salvo en el `planner` o si el usuario lo pide.
