# Domain Docs

## Before exploring

Read these when present:

- `CONTEXT.md`
- `docs/adr/` entries relevant to the work

Proceed silently when they do not exist. The domain-modeling workflow creates them when needed.

## Layout

This is a single-context repository:

```text
/
├── CONTEXT.md
└── docs/adr/
```

## Vocabulary

Use terminology defined in `CONTEXT.md`. Avoid synonyms the glossary rejects. If a needed concept is absent, reconsider the terminology or note the gap for domain modeling.

## ADR conflicts

Explicitly identify output that contradicts an existing ADR instead of silently overriding it.
