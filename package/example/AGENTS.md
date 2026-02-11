# Agentation Website (Codex)

Demo site and documentation at agentation.dev.

## Safe but Important

- Changes here do not affect npm package consumers.
- This is the public face of the project; keep it accurate and polished.
- Content should be clear and helpful for potential users.
- If demos break, investigate whether the package has a bug.

## Structure

- `src/app/` - Next.js app router pages.
- Pages include features, FAQ, install, MCP, and API docs.

## Development

```bash
pnpm dev                                    # From root (starts both)
pnpm --filter feedback-tool-example dev     # Website only
```

## Agentation Docs Rule

When documenting integrations, keep `Claude Code (Claude)` directions explicit and place the `Codex` directions immediately after.
