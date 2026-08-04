# 13 — Interactive 404 command line

Type: prototype
Status: resolved

## Question

How should the fake CLI on the 404 page support navigation without losing the existing terminal layout?

## Answer

Keep the original integrated prompt and add editor-style prefix suggestions. `Tab` completes the first
match; Enter navigates. Supported commands are `inicio`, `mis-escrows`, `crear`, and
`escrow <dirección>`.

The four throwaway UI variants are preserved on branch `prototype/404-cli-variants` at commit
`982e24a`. Variant D won because it retains variant A's layout while making the available commands
discoverable during typing.

## Comments

- The selected behavior was rewritten in the production `NotFoundPage`; the prototype switcher and
  losing variants remain only on the prototype branch.
