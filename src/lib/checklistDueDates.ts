/** Due-date writes must never include or reset the item's completion fields. */
export function checklistDueDatePatch(date: string) {
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Enter a valid due date.");
  return { due_date: date || null };
}