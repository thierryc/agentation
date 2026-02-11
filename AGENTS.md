# Agentation

Monorepo containing:

1. **npm package** (`package/`) - See `package/AGENTS.md`
2. **Website/docs** (`package/example/`) - See `package/example/AGENTS.md`

## What is Agentation?

A floating toolbar for annotating web pages and collecting structured feedback for AI coding agents.

## Development

```bash
pnpm install    # Install all workspace dependencies
pnpm dev        # Run both package watch + website dev server
pnpm build      # Build package only
```

## Important

The npm package is public. Changes to `package/src/` affect all users.
Website changes (`package/example/`) only affect agentation.dev.

## PR/Issue Approach

- Package size is critical - avoid bloat
- UI changes need extra scrutiny
- Plugins/extensions -> encourage separate repos
- External binary files -> never accept

## Annotations (Codex)

Whenever the user brings up annotations, fetch all pending annotations before doing anything else.

Use this flow:
1. Call `agentation_get_all_pending`.
2. For each actionable annotation, call `agentation_acknowledge` before edits.
3. After implementing, call `agentation_resolve` with a concise summary.
4. If feedback is invalid/outdated, call `agentation_dismiss` with a reason.
5. If user asks for watch mode, loop on `agentation_watch_annotations` until stopped.
