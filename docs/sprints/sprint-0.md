# Sprint 0 · Base técnica lista para construir el MVP

Orden sugerido: HT-01 → HT-02 → HT-03 → HT-04 → HT-05

Estado al iniciar: el repo solo tiene documentación y la configuración de Claude Code (`docs/`, `CLAUDE.md`, `.claude/`). Todavía no hay código de la aplicación.

Librerías nuevas a aprobar: `prettier`, `eslint-plugin-boundaries`, `prisma` + `@prisma/client`, `zod`, `vitest`, `@playwright/test`, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.

## HT-01 · Stack base y linters (3 pts)
Depende de: nada
- [x] Repo en GitHub con README y CLAUDE.md
- [ ] Crear el proyecto Next.js (App Router, TypeScript estricto, Tailwind) e inicializar shadcn/ui
- [ ] Postgres local con `docker-compose.yml` y `.env.example` con las variables mínimas
- [ ] Instalar Prisma y crear `src/lib/db.ts` (cliente único) y `src/lib/env.ts` (variables validadas con Zod)
- [ ] Prettier + ESLint, con los scripts `lint`, `typecheck`, `test` y `test:e2e` en `package.json`
- [ ] Crear la estructura `src/{app,components,modules,lib}` y un módulo de ejemplo (`clubs`) con `domain/`, `application/`, `infrastructure/` e `index.ts`
- [ ] Configurar `eslint-plugin-boundaries` con las 5 reglas de dependencia de `CLAUDE.md`
- [ ] Configurar Vitest y Playwright, con un test unitario del dominio de ejemplo y un e2e de humo (la home carga)
- [ ] Test que confirme que ESLint falla ante una importación prohibida (domain → infrastructure, y módulo → carpeta interna de otro)
- [ ] Actualizar el README con "cómo correrlo en local" (un comando: `npm run dev`)

## HT-02 · Despliegue automático (3 pts)
Depende de: HT-01
- [ ] Crear el proyecto en Railway con los servicios app y Postgres, y los entornos `dev` y `production`
- [ ] Conectar el repo: push a `main` → producción, rama `dev` → entorno dev
- [ ] Separar las variables de entorno por entorno (`DATABASE_URL`, `AUTH_SECRET`, etc.)
- [ ] Ejecutar `prisma migrate deploy` en cada despliegue (paso de pre-deploy)
- [ ] Dominio temporal de Railway con HTTPS (o convoley.pe si ya está comprado)
- [ ] Verificar: un push a `main` despliega y la home responde por HTTPS

## HT-03 · Modelo de datos inicial (5 pts)
Depende de: HT-01
- [ ] Diseñar el esquema con el agente `planner`: clubes, comunidades, usuarios/organizadores, convocatorias, inscripciones (invitado o con Google), pagos, productos, pedidos
- [ ] Escribir `schema.prisma`: dinero en `priceCents` (Int), fechas en UTC, celular normalizado (`+519XXXXXXXX`)
- [ ] Primera migración versionada (`npx prisma migrate dev --name init`)
- [ ] Seed con datos de prueba: un club, una comunidad, una convocatoria, inscripciones y productos
- [ ] Documentar el modelo en `docs/MODELO_DATOS.md` (diagrama de entidades y relaciones)
- [ ] Test de integración: migrar + seed sobre una base vacía sin errores

## HT-04 · Almacenamiento de imágenes (2 pts)
Depende de: HT-01, HT-02 (bucket de Railway)
- [ ] Crear el bucket S3-compatible en Railway y agregar sus credenciales a las variables de entorno
- [ ] Puerto `FileStorage` en `media/application` y su implementación S3 en `media/infrastructure`
- [ ] Validar en el servidor el tamaño máximo y los tipos permitidos (jpg, png, webp), con errores tipados del dominio
- [ ] Vouchers privados: subida sin acceso público y lectura solo por URL firmada con expiración
- [ ] Tests: unitarios de validación (tipo y tamaño) e integración de la URL firmada con un fake del puerto

## HT-05 · Mercado Pago sandbox (1 pt)
Depende de: HT-02 (variables por entorno)
- [ ] Crear la aplicación en Mercado Pago Developers y obtener las credenciales de prueba (a cargo tuyo, en el panel de MP)
- [ ] Crear los usuarios de prueba: vendedor (organizador) y comprador (jugador)
- [ ] Cargar las credenciales en `.env.local` y en el entorno `dev` de Railway, y agregarlas a `env.ts` y `.env.example` (sin valores)
- [ ] Documentar en `docs/GUIA_INICIO.md` cómo obtener y renovar las credenciales de prueba
