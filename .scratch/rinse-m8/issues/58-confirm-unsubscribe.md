# 58: Confirm before unsubscribing

**What to build:** Unsubscribing from a show asks first, in a new shared confirm dialog. Today a single click unsubscribes.

The dialog is a native modal `<dialog>`, so focus stays trapped inside, Esc closes it and the page behind is inert:

- A rectangle with a 1px border, on the paper background.
- A titlebar with the title and a close button drawn as `[×]`, labelled "Close" for screen readers.
- A body with the message.
- A footer with the action buttons aligned right.
- The titlebar, body and footer are separated by the tables' dashed row line.
- The dialog is labelled by its title.

Unsubscribing, from any subscribe button (dashboard, show view, show directory, schedule table), opens "Unsubscribe from {show}?" with Cancel and Unsubscribe buttons. Cancel has focus when the dialog opens, so pressing Enter by accident does nothing harmful. Subscribing still happens straight away.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human (needs a look in the app in both themes, and a focus check on macOS)

- [x] Unsubscribing from any subscribe button opens the dialog and the show stays subscribed until it's confirmed
- [x] Unsubscribe in the dialog unsubscribes; Cancel, `[×]` and Esc close it without changing anything
- [x] Subscribing doesn't open the dialog
- [ ] While open, Tab stays inside the dialog and focus goes back to the button that opened it on close
- [ ] The dialog matches the description above in light and dark theme
- [x] The dialog is one reusable component with a title, a body and footer actions, ready for tickets 59 and 60

## Comments

- `src/lib/ConfirmDialog.svelte`: one instance in `+page.svelte`, used through `confirm({ title, message, action })`, which resolves to `true` only for the action button. The title is "Unsubscribe" and the question is the body.
- Focus trap, Esc and the inert page come from the native `showModal()`. WebKit doesn't focus a button on mouse click, so the native focus return would miss it. The dialog instead records the last button clicked outside it, and focuses that button on close. Not checked in the app.
- A `confirm()` while the dialog is already open resolves `false` and leaves the open question as it is.
