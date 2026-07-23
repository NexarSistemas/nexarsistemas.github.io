# AGENTS.md

Reglas de trabajo para IA en `nexarsistemas.github.io`:

## Lectura obligatoria

1. Leer primero `README.md` y la documentación relacionada con la tarea.
2. Si está disponible, consultar `nexar-ai-context/CONTEXTO_NEXAR.md`, `repos/nexarsistemas.github.io/CONTEXTO_REPO.md` y `standards/AI_WORKFLOW.md`.
3. Revisar Issues y PR abiertas relacionadas.

## Roles y seguridad

4. ChatGPT analiza, diseña, revisa y redacta prompts. Codex implementa, valida y ejecuta el flujo Git. Copilot/Gemini auditan o proponen salvo instrucción explícita.
5. Mantener el repo como frontend público. Nunca exponer `service_role`, tokens backend, claves privadas ni secretos en HTML, JavaScript, fixtures o documentación pública.
6. Cualquier cambio en formularios, páginas de retorno, portal de vendedores o funciones server-side debe considerar impacto en `nexar-admin` y `nexar-pagos`.
7. Si una integración server-side no está confirmada, usar `TODO(confirmar)`.
8. No mezclar cambios visuales, integraciones y refactorizaciones en una misma PR sin necesidad demostrada.

## Git y revisión

9. Nunca trabajar directamente sobre `main`. Usar ramas `feature/*`, `fix/*`, `docs/*`, `test/*` o `chore/*` y remoto SSH.
10. `main` recibe cambios solo mediante Pull Request. Estrategia predeterminada: `Squash and Merge`.
11. La primera revisión puede cubrir toda la implementación. Revisiones posteriores deben limitarse a `COMMIT_ANTERIOR...COMMIT_NUEVO`.
12. Si hay tests fallidos, conflictos, checks fallidos, hallazgos funcionales reales o PR no mergeable, detenerse y no mergear.
13. Si la revisión final resulta `APROBABLE`, cerrar automáticamente: Ready for Review si aplica, validación final, `Squash and Merge`, actualización de `main`, eliminación de ramas y `git status` limpio.

## Validación

14. Ejecutar primero validaciones focalizadas para los archivos modificados.
15. Antes del cierre ejecutar los comandos reales disponibles del repo, además de:

```bash
git diff --check
git status
```

16. Si se modifican funciones Netlify, validar localmente con `netlify dev` y los tests/lint existentes.
17. Si se modifican formularios o páginas de retorno, verificar estados de éxito, pendiente, fallo, errores de red y ausencia de secretos en el bundle público.

## Versionado y despliegue

18. No desplegar a producción salvo instrucción explícita y validación aprobable.
19. Mantener README y documentación alineados cuando corresponda.
20. Crear tag y Release solo cuando la tarea indique explícitamente un cierre de versión. No hacerlo para fixes internos, revisiones post-merge o cambios documentales aislados.
21. Cerrar un Issue solo si quedó completamente resuelto.
