interface Props {
  onSave?: () => Promise<void> | void;
  label?: string;
  disabled?: boolean;
}

/**
 * Deprecated: the floating bottom-right "Save Changes" bubble has been removed
 * across the organizer dashboard. Each page now uses its own in-page Save button
 * for a consistent experience. This component is kept as a no-op to avoid
 * breaking existing imports.
 */
export default function StickySaveBar(_props: Props) {
  return null;
}
