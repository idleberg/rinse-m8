# 01: Share the Latest list beyond the Dashboard

**What to build:** The Latest list (the newest episode of each subscribed show, after the shared filters, leaving out Seen episodes unless "show seen" is ticked) is computed inside the Dashboard page, so nothing else can read it while another tab is open. Move it into the shared library as a function that takes whether to include Seen episodes, and have the Dashboard call it. Nothing changes for the user; this makes room for the Dock badge in 02.

Latest still picks each show's newest episode before the Seen check, so an older episode never stands in for it. Put it next to the episodes state unless that creates an import cycle with the player, filters or settings; otherwise give it its own small module.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The Latest list is computed by one shared function, which the Dashboard uses; the Dashboard no longer has its own copy of the logic.
- [x] Latest on the Dashboard shows the same episodes as before, with "show seen" ticked and unticked, and with the shared filters applied.
- [x] Type check and existing tests pass.
