# 37: Download button on notifications

**What to build:** A new-episode notification gets a Download button that adds the episode to the download queue without showing the window. Progress shows in the queue view as usual. When auto-download is on, the episode is already queued, so the notification has no Download button. Pressing Download for an episode that's already queued or downloaded does nothing.

Clicking the notification itself, outside the button, behaves as it did before.

**Blocked by:** 35 (Clicking a notification shows the window)

**Status:** ready-for-agent

- [ ] With auto-download off, a notification offers a Download button
- [ ] With auto-download on, a notification has no Download button
- [ ] Pressing Download queues the episode and leaves the window as it was
- [ ] Pressing Download for an episode that's already queued or downloaded doesn't queue it again
