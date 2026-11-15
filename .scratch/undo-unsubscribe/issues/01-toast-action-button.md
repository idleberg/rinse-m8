# 01: Toasts can carry an action button

**What to build:** A toast can show one labelled button, such as UNDO, beside its message. Clicking the button runs its action and hides the toast. A toast with no action looks and works as it does today. When the toast times out or another toast replaces it, the action goes with it. The dev panel's fake toast gets an action, so the button can be tried without any real feature.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A toast shown with an action shows a button with the action's label, styled to fit the inverted toast
- [x] Clicking the button runs the action once and hides the toast
- [x] Hiding or replacing the toast clears its action
- [x] Toasts without an action, such as the copied-link toast, are unchanged
- [x] The dev panel's fake toast shows an action button
