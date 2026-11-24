---
description: Prepara el Sprint Backlog de un sprint: toma sus historias de docs/BACKLOG.md y las divide en tareas técnicas.
argument-hint: [número del sprint, ej. 1]
disable-model-invocation: true
---

Prepara el Sprint Backlog del **Sprint $0** de Convoley.

1. Lee en `docs/BACKLOG.md` todas las historias de la sección "Sprint $0".
2. Usa el agente `Explore` para revisar qué existe ya en el código y qué falta.
3. Para cada historia, divídela en tareas técnicas pequeñas (de 1 a 3 horas cada una), en orden de dependencia: modelo de datos → lógica de servidor → interfaz → tests.
4. Marca dependencias entre historias (por ejemplo, HU-06 necesita HU-04).
5. Propón el orden en que conviene implementar las historias.
6. Escribe el resultado en `docs/sprints/sprint-$0.md` con este formato:

```markdown
# Sprint $0 · <objetivo>

Orden sugerido: HU-XX → HU-YY → ...

## HU-XX · <título corto> (<puntos> pts)
Depende de: <IDs o "nada">
- [ ] Tarea 1
- [ ] Tarea 2
```

7. Muéstrame el resumen y pregúntame si quiero ajustar algo antes de empezar.

No escribas código de la aplicación en este comando.
