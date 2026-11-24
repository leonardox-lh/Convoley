---
description: Implementa una historia de usuario de docs/BACKLOG.md con el flujo completo (plan, implementación, tests, revisión, commit).
argument-hint: [ID de la historia, ej. HU-06]
disable-model-invocation: true
---

Implementa la historia **$0** de Convoley siguiendo este flujo. No te saltes pasos.

## 1. Entender
- Lee la historia $0 y sus criterios de aceptación en `docs/BACKLOG.md`.
- Si existe `docs/sprints/` con el sprint actual, lee las tareas de $0 allí.
- Usa el agente `Explore` para ubicar el código relacionado. No leas archivos que la historia no necesita.

## 2. Planear y esperar aprobación
- Si la historia tiene 8+ puntos, toca pagos o cambia el modelo de datos, pide el plan al agente `planner`.
- Si no, arma tú un plan breve: archivos a tocar, pasos, y qué test cubre cada criterio.
- **Muestra el plan y espera mi aprobación. No edites nada antes.**

## 3. Implementar
- Crea la rama `feat/$0-<descripcion-corta>` desde `main`.
- Implementa siguiendo `CLAUDE.md`. Haz commits pequeños si la historia es grande.

## 4. Testear
- Pide al agente `tester` que escriba y corra un test por cada criterio de aceptación.
- Si reporta bugs, corrígelos y vuelve a correr los tests.

## 5. Revisar
- Pide al agente `reviewer` que revise el diff.
- Corrige todos los bloqueantes. Si el veredicto fue "Requiere cambios", pide una segunda revisión.

## 6. Cerrar
- Verifica que `npm run lint`, `npm run typecheck` y `npm test` pasen.
- Haz el commit final: `feat($0): <descripción>`.
- Termina con un resumen corto:
  - Qué se hizo
  - Cada criterio de aceptación con ✅ o ❌
  - Qué debo probar a mano en el celular
  - Si algo quedó pendiente o cambió respecto a la historia
