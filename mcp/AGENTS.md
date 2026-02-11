# Agentation MCP (Codex)

MCP server package for Agentation.

## Scope

- `src/cli.ts` handles setup (`init`), diagnostics (`doctor`), and server startup.
- `src/server/` contains HTTP + MCP transport and tool implementations.

## Integration Rules

- Keep `Claude Code (Claude)` instructions intact and clearly labeled.
- Add `Codex` instructions immediately after the Claude section.
- Keep Claude as the default selection in setup flows.

## Validation

After CLI changes, run `pnpm --filter agentation-mcp build`.
