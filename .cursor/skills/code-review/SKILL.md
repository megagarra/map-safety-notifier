---
name: code-review
description: Review code for quality, security, performance, and adherence to project standards in the Map Safety Notifier app. Use when reviewing pull requests, examining code changes, or when the user asks for a code review.
---

# Code Review

## Quick Start

When reviewing code, follow this checklist:

1. **Correctness** — Logic handles edge cases, null/undefined, empty arrays
2. **Security** — No exposed secrets, XSS prevention, input sanitization
3. **Performance** — No unnecessary re-renders, proper memoization, efficient queries
4. **Consistency** — Follows project architecture (controllers → hooks → components)
5. **Types** — No `any`, proper interfaces, Zod validation for forms

## Review Checklist

- [ ] Data logic in controllers/hooks, not directly in components
- [ ] Error states handled (try/catch, toast notifications)
- [ ] Loading states implemented (Skeleton or spinner)
- [ ] No direct DOM manipulation (use React refs if needed)
- [ ] Tailwind classes used (no inline styles or CSS modules)
- [ ] `cn()` used for conditional class merging
- [ ] No modifications to `src/components/ui/` files
- [ ] User-facing text in Brazilian Portuguese
- [ ] Map interactions don't cause full re-renders

## Severity Levels

Format feedback as:

- **CRITICAL**: Must fix — bugs, security issues, data loss risks
- **WARNING**: Should fix — performance issues, missing error handling
- **SUGGESTION**: Nice to have — code style, readability improvements
- **GOOD**: Positive callout — well-written code worth highlighting

## Output Format

```markdown
## Code Review: [file or feature name]

### Summary
[1-2 sentence overview]

### Findings
| Severity | File | Line | Issue |
|----------|------|------|-------|
| CRITICAL | ... | ... | ... |

### Recommendations
1. [Actionable recommendation]
```
