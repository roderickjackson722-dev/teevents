# Proposal isolation
- Proposal templates and editable terms are draft document content only, never platform billing rules.
- Save, status, duplicate and delete actions call only role-checked proposal functions; printing uses browser print and never external delivery APIs.
- Reusable templates clear client details/dates when starting drafts; PDF exports use jsPDF from proposal data with page-aware text layout and no screenshot or delivery integration.