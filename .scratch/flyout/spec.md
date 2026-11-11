# Flyout

Table rows show at most three buttons. Less common actions move into a **flyout**, opened by the **flyout trigger** (`⋯`), the last button in the row. Both terms are in the glossary.

## Behaviour

- The trigger opens the flyout on click. Escape, a click outside and choosing an entry close it; the arrow keys move between entries.
- Built on the native `popover` attribute and positioned from the trigger in script, not with CSS anchor positioning, which WebKitGTK doesn't support reliably.
- Toggle entries flip their labels (LOVE/UNLOVE, SUBSCRIBE/UNSUBSCRIBE) and expose their state as checkable menu items.
- An entry that can't run on a row is disabled, not hidden, so every row's flyout lists the same entries in the same order.
- Destructive entries confirm first: Remove from history and Unsubscribe. Unlove and Mark as downloaded don't, since both are undone from the app.

## Default actions

Every flyout ends with these, below a divider:

- **View on web**: opens the episode's page on rinse.fm, or the show's page for an episode cached before episodes carried their slug.
- **Copy download link**: copies the mp3 URL; disabled without an mp3, enabled after a 404. The flyout closes with no other feedback.

## Per table

| Table                          | Row buttons                      | Flyout entries before the defaults             |
| ------------------------------ | -------------------------------- | ---------------------------------------------- |
| Dashboard: Latest              | Play, Download/Show in folder, ⋯ | Mark as downloaded, Love, Subscribe            |
| Dashboard: show sections       | Play, Download/Show in folder, ⋯ | Mark as downloaded, Love                       |
| Schedule, Show view            | Play, Download, ⋯                | Subscribe, Love                                |
| Favs                           | Play, Show in folder/Download, ⋯ | Love                                           |
| Player tab: play queue         | Play, Remove, ⋯                  | Subscribe, Love                                |
| Player tab: history            | Play, ⋯                          | Remove from history, Subscribe, Love           |
| Queue view: previous downloads | Show in folder, Remove, ⋯        | Play (follows the play-or-queue setting), Love |

## Out of scope

- The Shows tab's show directory, Recommendations and the queue view's active downloads get no flyout.
- Confirming the existing single-row removals is tracked in `.scratch/confirm-removals/`.
