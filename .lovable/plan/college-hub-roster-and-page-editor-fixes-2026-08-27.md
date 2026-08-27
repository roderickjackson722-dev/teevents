# College Hub roster and page-editor fixes

## Goal
Add fully customizable per-player roster questions, make Shirt Size available in the roster, fix the College Hub hero transparency control, and make inserted Tournament Details images reliably selectable, alignable, and keyboard-safe.

## Implementation

### 1. Customizable Player Roster
- Add a separate **Player Roster Fields** editor in the College Hub setup, distinct from the existing coach/team Registration Fields.
- Keep First Name and Last Name required, while allowing organizers to rename, require/optional, show/hide, and reorder the remaining roster fields.
- Include standard fields for Year, Position, and Shirt Size, plus organizer-created text, number, textarea, and dropdown questions.
- Render the configured roster questions for every player on the public college tournament registration form.
- Make the roster layout responsive when additional fields are enabled.
- Show and edit Shirt Size and custom player answers in the College Hub registration roster view.

### 2. Data persistence
- Apply a Lovable Cloud database migration adding:
  - `player_roster_fields` JSON configuration on college tournaments.
  - `shirt_size` and `custom_answers` on college tournament players.
- Preserve existing registrations and supply safe defaults for existing tournaments.
- Keep existing row-level access rules and grants unchanged because these are columns on already-protected tables.

### 3. Hero transparency
- Make the slider update its visible percentage and hero preview immediately while dragging.
- Persist the committed value with explicit success/error handling instead of silently ignoring failed updates.
- Ensure `0%` is preserved correctly and the public College Hub hero reads the saved opacity value without fallback overriding it.

### 4. Tournament Details image controls
- Replace the fragile image click handling with direct image-node selection based on the clicked DOM image position.
- Show a clear selection outline and keep the image size/alignment controls available for the selected image.
- Preserve image width and alignment together when HTML is rendered and sanitized.
- Prevent Space and Tab from replacing/deleting a selected image; deletion remains intentional through Backspace/Delete.
- Verify Center alignment renders on the public Tournament Details page.

## Validation
- Test roster configuration, public registration submission, and admin editing for Shirt Size and custom player answers.
- Test hero opacity at 0%, intermediate, and 100% values and confirm persistence after reload.
- Test image click selection, visible highlighting, center alignment, resizing, Space/Tab behavior, save/reload, and public rendering.
- Confirm the application build remains clean.
