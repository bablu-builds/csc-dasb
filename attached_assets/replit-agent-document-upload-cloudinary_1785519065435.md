I want to add a document/photo upload feature to my CSC shop management app (AZAAN CSC Management), so customer documents (like Aadhar card copies, photos) can be attached to work entries. Since Firebase Storage is no longer free on the Spark plan, please implement this using Cloudinary's free tier instead (25 free credits/month, no credit card required).

## Exact UI Design (Follow This Precisely)

Add a new section lower on the same "Edit Work Entry" page (below the existing cards like Payment History, Deal Adjustments, Status Timeline — at the bottom of the page). Title this section "Document / Receiving" and structure it exactly like this:

**Section 1: Document**
- A small form with:
  - "Name of Document" (text input, e.g., "Aadhar Card", "Ankita Photo")
  - "Choose Document File" (file picker button — accepts image/PDF)
  - An "Add" (+) button to save this entry
- Below the form, a "Document List" showing each added document as a row: the name typed by the user (e.g., "Ankita Photo"), with a **View icon** (opens the file in a new tab/viewer) and a **Download icon** (downloads the file) next to each row — no image thumbnails, just clean list rows with the name and these two action icons.

**Section 2: Receiving**
- The same structure, but for receipts/receiving slips:
  - "Name of Document" (text input, e.g., "Ankita PAN Receiving")
  - "Choose Document File" (file picker button)
  - An "Add" (+) button
- Below it, a "Receiving List" showing each entry as a row with its name, a **View icon**, and a **Download icon** — same clean list style as the Document List.

Keep these two sections visually separated (e.g., each in its own card) but both living together under one "Document / Receiving" area near the bottom of the Edit Work Entry page. Do NOT use thumbnail/image preview grids — use simple text rows with View and Download icon buttons only, as described above.

## Requirements

1. Implement the UI exactly as described above.
2. Use Cloudinary's "unsigned upload" feature (client-side upload directly from the browser to Cloudinary, using an unsigned upload preset) so no backend server code is needed — this works well with our current Firebase/Firestore setup.
3. Store each uploaded file as an entry in one of two arrays on the work entry's Firestore document: `documents` (for Section 1) and `receivings` (for Section 2). Each entry should contain: `name` (the text the user typed), `fileUrl` (the Cloudinary URL), `uploadedAt` (timestamp, automatic), and `addedBy` (automatic, non-editable — same pattern as other fields in the app).
4. The "View" icon should open the file in a new browser tab (using the Cloudinary URL directly). The "Download" icon should trigger a file download (e.g., using Cloudinary's `fl_attachment` delivery flag, or a standard anchor download attribute).
5. Allow removing a document/receiving entry from its list (a small delete icon on each row, with a confirmation prompt) — this removes the reference from Firestore; the file itself staying in Cloudinary is fine for the free tier.
6. Keep file size reasonable — validate that uploaded images aren't excessively large (e.g., limit to 5MB per file) to conserve the free Cloudinary quota.
7. Show a simple upload progress indicator while the file is uploading.

## Setup Instructions Needed
Since this requires a Cloudinary account, please also provide clear step-by-step instructions (as part of your response, not just in code) for:
1. Creating a free Cloudinary account.
2. Finding the Cloud Name and creating an unsigned upload preset in the Cloudinary dashboard.
3. Where to add these as environment variables/secrets in this project (following the same pattern already used for Firebase config).

## Important Notes
- Do not break any existing work entry functionality — this is purely an additive feature.
- Keep the UI simple and mobile-friendly, since this will primarily be used on phones to photograph documents.
- Test the full flow: add a Document entry with a name and file, confirm it appears in the Document List with working View and Download icons; do the same for a Receiving entry; then remove one and confirm it's cleared from the list.
