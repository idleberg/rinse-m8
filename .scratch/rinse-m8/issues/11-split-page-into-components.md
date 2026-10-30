# 11: Split the page into components

**What to build:** A prefactor with no visible change. The episode table and the filter bar move out of the page into their own `EpisodeTable` and `EpisodeFilters` components, so the show view, the subscribed table and the schedule table can all reuse them. The page only composes the components and holds the shared state. Neither component knows where it's placed, so a later redesign can rearrange them freely.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `EpisodeTable` takes a list of episodes plus callbacks for the row actions, and renders the same columns and actions as today
- [x] `EpisodeFilters` renders the filter bar and can be configured to show only some of its filters
- [x] The page renders the same table and filters as before, built from the two components
- [x] `bun run check` passes
- [ ] Manual check: filtering, downloading, refreshing a show and subscribing behave exactly as before

## Comments

- SvelteKit 3 removed `$lib`, so the page imports the components from `../lib/` by relative path.
- `EpisodeFilters` shows a filter only when its prop is passed, so a view picks its filters by binding them.
- `EpisodeFilters` still sets `margin: 0 0 1rem` on its fieldset. That's page spacing, so the redesign should move it out.
