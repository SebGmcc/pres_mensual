# Security Specification — Mi Presupuesto Mensual

## 1. Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`months`, `expenses`, `incomes`) is strictly private and accessible only when `request.auth != null && request.auth.uid == userId`.
2. Root `users` collection listing is strictly denied (`allow list: if false`) to prevent user enumeration or PII exposure.
3. All subcollection `list` operations enforce `resource.data.ownerId == request.auth.uid` on the server rules side.
4. `uid` / `ownerId` and `createdAt` are immutable once created; `createdAt` and `updatedAt` must match `request.time`.
5. Every document strictly validates required and allowed keys (`hasAll` + `hasOnly`), preventing shadow/ghost field injection.
6. All string fields enforce `minLength`/`maxLength` boundaries and regex validation where applicable; numeric amounts and budgets enforce sane positive/bounded ranges.

## 2. Adversarial Payloads ("Dirty Dozen")
1. Cross-user profile read: User B requests `get /users/userA`. Expected: `PERMISSION_DENIED`.
2. User enumeration: User A requests `list /users`. Expected: `PERMISSION_DENIED`.
3. Cross-user expense create: User B writes `/users/userA/expenses/exp-1` with `ownerId: "userA"`. Expected: `PERMISSION_DENIED`.
4. Owner spoofing: User A writes `/users/userA/expenses/exp-1` with `ownerId: "userB"`. Expected: `PERMISSION_DENIED`.
5. Shadow field injection on profile create: User A writes `/users/userA` with `isAdmin: true`. Expected: `PERMISSION_DENIED`.
6. Shadow field injection on expense update: User A updates `/users/userA/expenses/exp-1` adding `approved: true`. Expected: `PERMISSION_DENIED`.
7. Client timestamp spoofing: User A creates an expense with `createdAt` in the past instead of `request.serverTimestamp()`. Expected: `PERMISSION_DENIED`.
8. Immutable owner/createdAt tampering on update: User A updates `ownerId` or `createdAt` on an existing expense. Expected: `PERMISSION_DENIED`.
9. Path variable poisoning: User A writes `/users/userA/expenses/bad$id/extra` or a 200-char ID. Expected: `PERMISSION_DENIED`.
10. Negative or excessive expense amount: User A writes expense with `amount: -500` or `amount: 999999999999`. Expected: `PERMISSION_DENIED`.
11. Unbounded string payload (Denial of Wallet): User A writes expense with 5,000-character `concept` or `notes`. Expected: `PERMISSION_DENIED`.
12. Unscoped list query without `ownerId` filter or on another user's subcollection: User B runs `list /users/userA/expenses`. Expected: `PERMISSION_DENIED`.
