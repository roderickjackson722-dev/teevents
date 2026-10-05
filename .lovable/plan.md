# Editable survey submission settings

## Build
- Add two optional survey settings: custom submit-button text and a response-copy email address.
- Show both fields in the existing Admin Survey editor, preserving current behavior when left blank.
- Display the custom button text on the public survey.
- Send each new response notification to the configured copy address in addition to the existing TeeVents notification.

## Technical details
- Add backward-compatible nullable columns to college surveys, with no changes to existing survey responses.
- Validate the email in the editor and safely escape response content in notification emails.
- Regenerate database types, deploy the updated submission function, and verify the editor and public survey build cleanly.
