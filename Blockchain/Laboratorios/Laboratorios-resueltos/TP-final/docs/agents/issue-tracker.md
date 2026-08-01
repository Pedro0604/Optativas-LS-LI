# Issue tracker: Local Markdown

Issues and specs live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- Spec: `.scratch/<feature-slug>/spec.md`
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Number tickets from `01`; never use one combined tickets file
- Record triage state with a `Status:` line near the top
- Append discussion under `## Comments`

## Publishing and fetching

When a skill says “publish to the issue tracker,” create a file under `.scratch/<feature-slug>/`.

When a skill says “fetch the relevant ticket,” read the referenced file.

## Wayfinding

- Map: `.scratch/<effort>/map.md`
- Child: `.scratch/<effort>/issues/NN-<slug>.md`
- Record ticket type with `Type: research|prototype|grilling|task`
- Record state with `Status: claimed|resolved`
- Record blockers with `Blocked by: NN, NN`
- The first numbered open, unblocked, unclaimed ticket is next
- Claim by setting `Status: claimed` before work
- Resolve by adding `## Answer`, setting `Status: resolved`, and updating the map’s Decisions-so-far
