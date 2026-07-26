Please fix the following issue and add the following feature to my app:

## 1. Fix: Error Saving Work Entry

I'm getting this error when saving a work entry:

"Error saving work: Function addDoc() called with invalid data. Unsupported field value: undefined (found in field refundAmount in document workEntries/...)"

This happens when the status is "Pending" or "Completed" (not "Rejected"). The refundAmount and rejectionReason fields are being sent as undefined to Firestore, which is not allowed.

Please fix this so that:
1. When status is NOT "Rejected", do not include refundAmount and rejectionReason fields in the document at all (or set them to null instead of undefined).
2. When status IS "Rejected", these fields should be included with their actual values.

Make sure this fix works for both creating new entries and editing existing ones.

## 2. Add Custom Favicon

My website doesn't show a custom favicon (browser tab icon) — it's currently showing a generic/default icon. Please add a custom favicon for "AZAAN CSC Management":

1. Create a simple, recognizable icon/logo representing the shop (you can design something simple like initials "ACT" or a relevant icon, in the app's existing blue/orange color scheme).
2. Save it as favicon.ico (or favicon.png) in the public folder.
3. Make sure the index.html references it correctly so it shows up in the browser tab.
4. Also update the page title to clearly show "AZAAN CSC Management" instead of any generic title.
