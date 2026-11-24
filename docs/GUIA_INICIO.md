# Guía para empezar Convoley con Claude Code

## 1. Preparar la carpeta

1. Descomprime el kit en tu carpeta de proyectos, por ejemplo `~/proyectos/convoley`.
2. Comprueba que estén estos archivos (algunos están ocultos por empezar con punto):

```
convoley/
├── CLAUDE.md
├── README.md
├── .gitignore
├── .claude/
│   ├── agents/      planner.md, reviewer.md, tester.md, Explore.md
│   └── skills/      historia/SKILL.md, sprint/SKILL.md
└── docs/
    ├── VISION.md, ARQUITECTURA.md, BACKLOG.md, GUIA_INICIO.md
    └── sprints/
```

3. Inicia git y súbelo a GitHub (repo privado):

```bash
cd ~/proyectos/convoley
git init
git add .
git commit -m "chore: project kit (CLAUDE.md, backlog, agents)"
gh repo create convoley --private --source=. --push   # o créalo desde github.com
```

## 2. Abrir Claude Code en la carpeta

- **App de escritorio**: abre una sesión nueva y elige la carpeta `convoley` como carpeta de trabajo.
- **Terminal**: `cd ~/proyectos/convoley` y luego `claude`.

Comprueba que todo cargó:

- `/agents` → deben aparecer `planner`, `reviewer`, `tester` y `Explore`.
- Escribe `/` → deben aparecer `/historia` y `/sprint`.
- `/model` → deja **Sonnet** como modelo principal.

## 3. Sprint 0: fundamentos

Primero prepara el sprint:

```
/sprint 0
```

Revisa el plan que escribe en `docs/sprints/sprint-0.md` y ajústalo si hace falta. Luego ve historia por historia:

```
/historia HT-01
```

Para HT-01, si `create-next-app` no acepta la carpeta porque ya tiene archivos, pídele que cree el proyecto en una carpeta temporal y mueva los archivos sin borrar `CLAUDE.md`, `docs/` ni `.claude/`.

Sigue con `/historia HT-02` … `/historia HT-05`. En HT-02 vas a necesitar:

- Una cuenta en Railway (app + PostgreSQL + bucket).
- Credenciales de Google OAuth (Google Cloud Console → APIs y servicios → Credenciales).

En HT-05 vas a necesitar una cuenta de Mercado Pago Developers con credenciales de prueba.

Claude Code te va a pedir estas credenciales: ponlas en `.env.local` (no se sube a git) y en las variables de entorno de Railway. Nunca las pegues en el código.

## 4. Ciclo de cada sprint

1. Usa `/clear` y luego `/sprint N` para armar el Sprint Backlog.
2. Para cada historia, en el orden sugerido:
   - Usa `/clear`. Una historia por sesión.
   - Ejecuta `/historia HU-XX`.
   - Lee el plan y apruébalo o corrígelo.
   - Al final, prueba en tu celular lo que te indique el resumen.
   - Marca la historia como "Hecho" en la planilla del backlog.
3. Al cerrar el sprint, muéstrale lo nuevo al organizador piloto y anota su feedback en `docs/BACKLOG.md`: historias nuevas o cambios de prioridad.

## 5. Consejos para que rinda el plan Pro

- Sonnet para todo. Opus solo lo usa el `planner` en historias grandes o de pagos.
- Si llegas al límite de 5 horas, aprovecha para probar en el celular, diseñar o hablar con clubes.
- Si cambias una regla o una decisión, actualiza `CLAUDE.md` o `docs/VISION.md`: así no tienes que repetirla en cada sesión.
- Si la conversación se alarga mucho dentro de una historia, usa `/compact`.
