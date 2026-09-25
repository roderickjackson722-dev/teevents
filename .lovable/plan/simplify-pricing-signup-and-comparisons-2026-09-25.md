# Simplify pricing signup and comparisons

## Pricing page
- Remove the two top call-to-action boxes: “Get Started” and “See What’s Included.”
- Send all three plan buttons directly to the organizer signup form at `/signup`.
- Pass the selected plan in the URL so signup can preselect tournament or league and preserve No Cost, Per-Event, or Per-League intent.
- Open signup directly on the account details form, skipping the “Welcome to TeeVents” event-type choice for pricing visitors.

## Compare page and footer
- Point the footer’s single “Compare” link to `/compare`.
- Remove the separate comparison-card section from the footer.
- Replace the current choices inside `/compare` with five selectable comparison boxes: Eventbrite, Golf Genius, Zeffy, GiveButter, and Google Forms.
- Keep each existing detailed comparison page available and open it from its corresponding box.

## Verification
- Check the pricing page at desktop and mobile sizes.
- Confirm each plan button opens the correct organizer signup state.
- Confirm the footer Compare link and all five comparison choices work.
