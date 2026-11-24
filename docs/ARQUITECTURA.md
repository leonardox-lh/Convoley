# Convoley · Arquitectura

## Por qué un monolito modular

Convoley es **una sola aplicación Next.js** (interfaz + API + webhooks) con **una sola base de datos**, desplegada en Railway. Por dentro está dividida en **módulos de negocio** con límites claros, siguiendo un **DDD ligero** (Domain-Driven Design): cada módulo es un contexto del negocio con su propio lenguaje, sus reglas y sus datos.

Así se consigue:

- La simplicidad de un monolito: un repo, un despliegue, transacciones simples.
- El orden de los microservicios: cada módulo se puede entender, testear y, si algún día hace falta, extraer como servicio sin reescribir el resto.
- Historias que tocan uno o dos módulos, así Claude Code no necesita leer todo el proyecto.

Lo que **no** hacemos (sería sobreingeniería para esta etapa): microservicios, event sourcing, CQRS con bases separadas, un bus de mensajes externo.

## Módulos (contextos)

| Módulo | Responsabilidad | Historias principales |
|---|---|---|
| `identity` | Usuarios, sesiones, Google OAuth, vínculo invitado → cuenta | HU-01, HU-48 |
| `clubs` | Clubes, perfil, comunidades/niveles, coorganizadores y roles | HU-02, HU-09, HU-33 |
| `events` | Convocatorias: crear, editar, cancelar, recurrencia, cupos | HU-03, HU-04, HU-05, HU-28 |
| `registrations` | Inscripciones, lista de espera, cancelación, check-in, equipos | HU-06–08, HU-12, HU-29–32, HU-38 |
| `payments` | Pagos con Mercado Pago, vouchers, webhooks, cargo por servicio | HU-13–15, HU-18–22 |
| `store` | Productos, variantes, pedidos | HU-23–25 |
| `plans` | Planes, paquetes y créditos del jugador | HU-26, HU-27 |
| `media` | Imagen de la lista, de equipos, flyers, Open Graph | HU-11, HU-16, HU-17, HU-32, HU-37 |
| `billing` | Suscripción de los clubes a Convoley, panel admin | HU-35, HU-36 |

`finanzas` (HU-34) es una vista de lectura que combina datos de `events`, `payments` y `store`: vive en `app/` y consulta las APIs públicas de esos módulos.

## Capas dentro de un módulo

```
modules/registrations/
├── domain/
│   ├── registration.ts          # entidad Registration y sus reglas
│   ├── phone-number.ts          # value object PhoneNumber (valida y normaliza)
│   └── errors.ts                # EventFullError, DuplicateRegistrationError...
├── application/
│   ├── ports.ts                 # interfaces: RegistrationRepository, EventCapacityReader
│   ├── register-player.ts       # caso de uso
│   └── join-waitlist.ts
├── infrastructure/
│   ├── prisma-registration-repository.ts
│   └── events-capacity-adapter.ts   # usa la API pública de modules/events
└── index.ts                     # exporta casos de uso ya armados y tipos públicos
```

### domain/
Reglas del negocio en TypeScript puro. Sin Prisma, sin Next.js, sin fetch. Se testea con tests unitarios rapidísimos.

```ts
// domain/phone-number.ts
export class PhoneNumber {
  private constructor(readonly value: string) {}

  static create(raw: string): PhoneNumber {
    const digits = raw.replace(/\D/g, "").replace(/^51/, "");
    if (!/^9\d{8}$/.test(digits)) throw new InvalidPhoneNumberError(raw);
    return new PhoneNumber(`+51${digits}`);
  }
}
```

### application/
Casos de uso: orquestan el dominio y hablan con el exterior **solo a través de interfaces** (puertos). Reciben sus dependencias por parámetro (inversión de dependencias).

```ts
// application/ports.ts
export interface RegistrationRepository {
  existsForPhone(eventId: string, phone: PhoneNumber): Promise<boolean>;
  countConfirmed(eventId: string): Promise<number>;
  save(registration: Registration): Promise<void>;
}

// application/register-player.ts
export function makeRegisterPlayer(deps: {
  registrations: RegistrationRepository;
  events: EventCapacityReader;
}) {
  return async function registerPlayer(input: RegisterPlayerInput) {
    const phone = PhoneNumber.create(input.phone);
    if (await deps.registrations.existsForPhone(input.eventId, phone)) {
      throw new DuplicateRegistrationError();
    }
    const capacity = await deps.events.getCapacity(input.eventId);
    const taken = await deps.registrations.countConfirmed(input.eventId);
    if (taken >= capacity) throw new EventFullError();

    const registration = Registration.createPending({ ...input, phone });
    await deps.registrations.save(registration);
    return registration;
  };
}
```

### infrastructure/
Implementaciones concretas de los puertos: Prisma, SDK de Mercado Pago, bucket S3. Es el único lugar donde aparecen.

### index.ts (API pública)
Arma los casos de uso con sus implementaciones reales y exporta solo lo que otros pueden usar:

```ts
// modules/registrations/index.ts
export const registerPlayer = makeRegisterPlayer({
  registrations: new PrismaRegistrationRepository(db),
  events: eventsCapacityAdapter,
});
export type { RegistrationSummary } from "./domain/registration";
export { EventFullError, DuplicateRegistrationError } from "./domain/errors";
```

### app/ (Next.js)
Delgado: valida con Zod, llama al caso de uso y traduce errores a mensajes para el usuario.

```ts
// app/c/[club]/[event]/actions.ts
"use server";
export async function registerAction(formData: FormData) {
  const input = registerSchema.parse(Object.fromEntries(formData));
  try {
    await registerPlayer(input);
    return { ok: true };
  } catch (e) {
    if (e instanceof EventFullError) return { ok: false, error: "Ya no hay cupos. ¿Te anotamos en la lista de espera?" };
    throw e;
  }
}
```

## Comunicación entre módulos

1. **Llamada directa a la API pública** (`index.ts`) del otro módulo. Es el caso normal.
2. **Eventos de dominio en proceso** para efectos secundarios desacoplados. Por ejemplo, `payments` publica `PaymentConfirmed` y `registrations` reacciona marcando la inscripción como pagada. Usa un despachador simple en `lib/events.ts`, sin brokers externos.
3. **Datos**: cada módulo es dueño de sus tablas. Otro módulo puede tener la referencia por ID (`eventId`), pero no consulta esas tablas directamente.

Una transacción que cruza módulos (por ejemplo, confirmar el pago y ocupar el cupo) se coordina en un caso de uso del módulo dueño del proceso, que pasa un contexto de transacción a los puertos.

## Lenguaje del negocio (glosario)

Usa siempre estos nombres en el código, en los tests y en las conversaciones con Claude Code.

| Español (interfaz) | Código | Nota |
|---|---|---|
| Club / comunidad del organizador | `Club` | La organización que paga Convoley |
| Comunidad / nivel | `Community` | General, Amateur, Competitivo |
| Convocatoria | `Event` | Una fecha de juego con cupos |
| Inscripción | `Registration` | Estados: `pending_payment`, `in_review`, `paid`, `cancelled` |
| Lista de espera | `Waitlist` / `WaitlistEntry` | |
| Invitado | `GuestPlayer` | Se inscribe sin cuenta, identificado por celular |
| Jugador con cuenta | `Player` | Cuenta de Google |
| Organizador / ayudante | `Organizer` / `ClubMember` con rol `admin` o `helper` | |
| Pago | `Payment` | Mercado Pago o voucher |
| Voucher (captura) | `PaymentProof` | Archivo privado |
| Producto / pedido | `Product` / `Order` | |
| Plan / crédito | `Plan` / `Credit` | |
| Equipo | `Team` | Armado automático |
| Suscripción de Convoley | `Subscription` | Plan del club |

## Tests por capa

| Capa | Tipo de test | Herramienta |
|---|---|---|
| `domain/` | Unitario, sin base de datos ni red | Vitest |
| `application/` | Unitario con fakes de los puertos | Vitest |
| `infrastructure/` | Integración contra Postgres de test | Vitest |
| Flujos clave (inscribirse, pagar) | End-to-end | Playwright |

## Cómo se hace cumplir

- ESLint con `eslint-plugin-boundaries` (o `dependency-cruiser`) bloquea las importaciones prohibidas: `domain/` importando infraestructura, o un módulo importando carpetas internas de otro.
- El agente `reviewer` revisa estas reglas en cada historia.

## Cuándo extraer un módulo a un servicio aparte

Solo si se cumple al menos uno de estos casos: necesita escalar muy distinto al resto (por ejemplo, procesar miles de webhooks), necesita otro lenguaje o tiempo de ejecución, o lo mantiene otro equipo. Gracias a los límites de los módulos, extraerlo es mover la carpeta y reemplazar `index.ts` por un cliente HTTP.
