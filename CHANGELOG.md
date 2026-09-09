# Changelog

This fork is maintained by [Gulithor](https://github.com/Gulithor) and adds features on top of the original [obsidian-kanban](https://github.com/mgmeyers/obsidian-kanban) by mgmeyers.

---

## 3.x (Gulithor fork)

### Lane color borders
Each lane can have a configurable colored border applied to all its cards. Colors are defined per-board in settings (name + color picker). The color name is stored in the board markdown as `kanban-lane-color: <name>` and resolved at render time. Set via the lane menu.

### Urgent cards
Cards can be marked urgent from the card menu. Urgent cards get a red top border and an alert icon. State is stored as `[kanban-urgent:: true]` in the card text (hidden from the title editor). The urgent flag is automatically cleared when the card moves to a Done lane.

### Card description
A freeform description can be added to any card and stored in the card's linked note under a `## Description` heading. Inline editing: click to edit, Cmd+Enter or blur saves, Escape cancels. A linked note is created automatically if one does not exist.

### Subtasks
Cards support interactive subtask checklists stored in the linked note under a `## Subtasks` heading. Checking/unchecking toggles `[ ]`/`[x]` in the note immediately. Subtask text can be edited inline (click to edit). Individual subtasks can be deleted with a trash icon. New subtasks are added from the card menu. Deleting a card with a linked note prompts whether to also delete the note.

### Blocker cards
Cards can be flagged as blocked with a text description via the card menu. Displayed as an orange flag icon; hovering shows the description. Stored as `[kanban-blocker:: text]`. Can co-exist with the urgent flag (blocker border takes visual precedence). The "Remove blocker" option only appears when a blocker is set.

### Recurring cards
Cards can be set to recur on a schedule (daily, weekly, every two weeks, monthly) via the card menu. When a recurring card is moved to a Done lane — by drag-and-drop or "Move to list" — a new card is automatically created at the top of the source lane with the next due date advanced accordingly. Stored as `[kanban-recurring:: daily|weekly|biweekly|monthly]`.

### Done-lane completion date
When a card moves into a lane marked "Mark cards in this list as complete", it is stamped with today's date stored as `[kanban-done:: YYYY-MM-DD]` and displayed as a green badge. The badge is removed when the card leaves the Done lane. The badge is shown by default and can be disabled in board settings ("Show completion date").

### Due-date auto-coloring
A board setting ("Color due dates") automatically colors date badges without requiring manual color rules: red for overdue, orange for today, yellow for within 7 days. User-defined date-color rules still apply and take priority.

### Subtask inline editing
Clicking subtask text enters an inline edit mode. Enter or blur saves the change; Escape cancels. Uses `data-ignore-drag` to prevent drag-and-drop interference while editing.

### Description editor improvements
The description editor now has an X cancel button (matching the title editor). Pointer movement is no longer blocked by the drag-and-drop system while editing the description.

### Tag modal improvements
The "Manage tags" modal shows existing tags from across the board as clickable suggestion chips — click to add without typing. Duplicate tags are prevented both in the UI (suggestion chips hide already-added tags; clicking a chip with an existing tag is a no-op) and at save time (deduplication via Set). The tag color preview in board settings no longer shows the `#` prefix.

### Menu-managed tags (kanban-tags)
Cards can have tags added via the card menu ("Add tags" / "Edit tags"), without writing them in the card title. Tags are stored as `[kanban-tags:: tag1, tag2]` bracket metadata — invisible in the title, displayed as pills in the card footer without the `#` prefix. The modal shows one input per tag with individual add and remove controls. Tag colors are configured in board settings (Tag Colors section) and apply automatically. Clicking a tag in the footer opens Obsidian's global search for that tag.

### Automated GitHub releases
Releases are built and published automatically by GitHub Actions whenever `manifest.json` changes on `main`. No manual tagging required — push to release. BRAT-compatible.

---

## 2.0.51 and earlier

See the [original project](https://github.com/mgmeyers/obsidian-kanban) for prior history.
