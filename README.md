# Convoley

Convocatorias de vóley sin caos de WhatsApp: inscripción, pagos con Yape, lista lista para compartir y tienda del club.

- Producto: `docs/VISION.md`
- Arquitectura: `docs/ARQUITECTURA.md`
- Historias de usuario: `docs/BACKLOG.md`
- Sprint actual: `docs/sprints/`
- Instrucciones para Claude Code: `CLAUDE.md`

## Correr en local

Requisitos: Node 24 y Docker Desktop abierto.

```bash
npm install
cp .env.example .env.local
npm run dev        # levanta Postgres (docker compose, puerto 5433) y Next en http://localhost:3000
```

Otros comandos: `npm run lint` · `npm run format` · `npm run typecheck` · `npm test` · `npm run test:e2e`.

## Desarrollo con Claude Code

- `/sprint 1` · prepara el Sprint Backlog del sprint 1
- `/historia HU-06` · implementa una historia con el flujo completo
- Agentes en `.claude/agents/`: `planner` (Opus), `tester` y `reviewer` (Sonnet), `Explore` (Haiku)
