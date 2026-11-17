# Notes for coding assistants

- **Release notes are part of every user-facing change.** When a change is something people will
  notice (new feature, changed screen or behaviour, a fix they could have hit), add an entry at the
  top of `lib/changelog.ts` in the same commit. See "Release notes" in README.md for the format.
  Refactors and build fixes don't need one.
- New pages or controls that the first-run tour or help panel should mention: update `lib/guide.ts`
  (tour steps target `data-tour` attributes; help tips are per page).
