<<<<<<< HEAD
- [Design System](design-system.md) — Indigo primary (#4f46e5), near-black navy sidebar (#080f1f), Plus Jakarta Sans headings + Inter body; all gradient stat cards use named CSS classes (stat-gradient-*)
- [Role System](role-system.md) — AuthContext fetches role from Firestore users/{uid}; missing doc defaults to owner; exposes isOwner + canAccessFinancialServices
- [Soft Delete Pattern](soft-delete.md) — deleteWorkEntry sets isDeleted:true + deletedAt; subscribeToWorkEntries filters client-side (no Firestore index needed)
- [Payment History](payment-history.md) — WorkEntry.payments[] array; addPaymentToEntry uses arrayUnion; paidAmount kept in sync as running total
- [Financial Services](financial-services.md) — Three new Firestore collections: aepsWithdrawals, electricRecharges, moneyTransfers; all have profitMargin field; pages gated by canAccessFinancialServices || isOwner
- [Challan Field](challan-field.md) — WorkEntry.challanAmount (optional, govt fee); shown in forms and used in profit calculations in Reports and Dashboard
=======
- [Role system & staff creation](role-system.md) — Secondary Firebase app trick for staff account creation without interrupting owner's session; role stored in Firestore users/{uid}.
- [Firestore rules deployment](firestore-rules.md) — Rules live in firestore.rules; must be deployed via Firebase CLI or pasted into Firebase Console manually.
- [Financial services modules](financial-modules.md) — AEPS Withdrawal, Electric Recharge, Money Transfer are gated by canAccessFinancialServices flag on UserProfile; owner always has access.
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
