# Security Specification: Income & Expense Tracker (income6727)

## 1. Data Invariants
1. **User Identity Isolation**: Every transaction, budget, and profile record MUST have `userId == request.auth.uid`. No user can read, list, create, edit, or delete another user's records.
2. **Numeric Sanity**: Transaction `amount` MUST be a positive number greater than 0, with a reasonable upper limit (<= 100,000,000 THB) to prevent overflow/poisoning.
3. **Transaction Type Integrity**: `type` MUST strictly be `'income'` or `'expense'`.
4. **Date Format Integrity**: `date` MUST follow standard YYYY-MM-DD pattern `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`.
5. **No Ghost Fields**: Payload on create MUST satisfy `data.keys().hasAll(...)` and `data.keys().hasOnly(...)`.
6. **Immutable Fields**: `userId` and `createdAt` cannot be modified after document creation.
7. **Document ID Format Guard**: Document IDs must satisfy `isValidId(id)` pattern `^[a-zA-Z0-9_\-]+$`.

## 2. The "Dirty Dozen" Payloads (Designed to Fail)
1. **Unauthenticated Write**: An unauthenticated request creating a transaction.
2. **User Impersonation Write**: Auth user A creating a transaction with `userId: "user_B"`.
3. **Ghost Field Poisoning**: Transaction payload containing arbitrary undeclared fields like `{ isAdmin: true, role: "admin" }`.
4. **Negative or Zero Amount**: Transaction payload with `amount: -500` or `amount: 0`.
5. **Extreme Amount Overflow**: Transaction payload with `amount: 999999999999`.
6. **Invalid Transaction Type**: Transaction payload with `type: "crypto_drain"` instead of `"income"` or `"expense"`.
7. **Malformed Date String**: Transaction payload with `date: "not-a-date"` or SQL injection strings.
8. **String Size Flooding**: Transaction payload with `title` exceeding 100 characters or `note` exceeding 300 characters.
9. **Cross-Tenant Document Read**: User A trying to read or list documents where `userId == "user_B"`.
10. **Immutable Field Tampering**: Updating an existing transaction and altering `userId` to hijack ownership.
11. **Creation Timestamp Forgery**: Tampering with `createdAt` during update.
12. **Malformed Document ID Attack**: Targeting an invalid path ID with junk escape characters like `../../admin`.
