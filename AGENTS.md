# AGENTS.md

Reglas de trabajo para IA en `nexarsistemas.github.io`:

1. Leer primero `README.md` y, si esta disponible en el workspace, el repo externo `nexar-ai-context` en `CONTEXTO_NEXAR.md`.
2. `nexar-ai-context` es un repo externo y la fuente central para contexto compartido y estandares.
3. Copilot solo audita o propone. Codex aplica cambios y controla que no se filtren secretos.
4. Mantener el repo como frontend publico: nunca documentar `service_role` como valor cliente.
5. Cualquier cambio en formularios o paginas de retorno debe considerar impacto en `nexar-admin` y `nexar-pagos`.
6. Si una integracion server-side no esta confirmada, marcar `TODO(confirmar)`.
