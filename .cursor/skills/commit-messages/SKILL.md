---
name: commit-messages
description: Generate conventional commit messages in Portuguese for the Map Safety Notifier project. Use when the user asks to commit, create a commit message, or review staged changes.
---

# Commit Messages

## Format

Use Conventional Commits with Portuguese descriptions:

```
<type>(<scope>): <subject>

[optional body]
```

## Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `style` | Formatting, missing semicolons (no logic change) |
| `docs` | Documentation changes |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Build, deps, config changes |

## Scopes

Use the project's feature areas: `map`, `pins`, `auth`, `comments`, `votes`, `heatmap`, `dashboard`, `ui`, `sw` (service worker)

## Rules

- Subject line: max 72 chars, imperative mood, lowercase
- Body: explain WHY, not WHAT (the diff shows what changed)
- Reference issue numbers when applicable

## Examples

```
feat(pins): adicionar suporte a imagens nos reports

Permite seleção de até 3 imagens ao criar um novo pin.
```

```
fix(map): corrigir re-render desnecessário ao mover o mapa
```

```
refactor(hooks): extrair lógica de votação para useVotePin
```

## Workflow

1. Run `git diff --staged` to analyze changes
2. Identify the type and scope from changed files
3. Write a concise subject in Portuguese
4. Add body only for complex changes
