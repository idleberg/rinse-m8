# 54: Play queue

**What to build:** This replaces ticket 10.

- **Enqueue:** an "Add to play queue" icon button sits right next to Play on every available row in every episode table. It's disabled while the episode is already queued. Its icon is three list lines with a small outlined play triangle after the last one. It doesn't use `+`, which belongs to subscribe.
- **Queue table:** under the controls on the Player tab, a table of the play queue in the style of the app's other tables. Each row has Play and Remove.
- **Playing from the queue:** it removes that episode from the queue and keeps the others in order, both the ones before it and the ones after.
- **Auto-advance:** when the playing episode ends, the first episode in the queue starts and leaves the queue.
- **Persistence:** the queue is kept in the player state store and restored at launch.

**Blocked by:** 53 (Player tab with cover and controls)

**Status:** ready-for-human

- [x] Every episode table has an enqueue button next to Play, disabled for queued episodes
- [x] The enqueue icon is list lines with a play triangle, in the same stroke style as the other icons
- [x] The Player tab lists the queue below the controls, or "The play queue is empty"
- [x] Playing a queued episode removes only that one; the rest keep their order
- [x] Remove takes an episode out of the queue without playing it
- [x] When an episode ends, the first queued episode starts and leaves the queue
- [x] The queue survives a restart
- [x] Ticket 10's comment points to this ticket; the glossary's **Play queue** entry still fits and gains a **Player tab** entry
- [ ] Manual check: queue three episodes, play the middle one, then seek near its end. The first one starts by itself and the third stays queued.
