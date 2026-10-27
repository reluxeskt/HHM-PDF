# HHM PDF — Security Rules & ABAC Architecture

## 1. Zero-Trust Access Control (ABAC)

HHM PDF implements Attribute-Based Access Control (ABAC) across both Firestore and Cloud Storage. All user assets are segregated into isolated, per-tenant namespaces under `/users/{userId}`.

### The 8 Pillars Implemented in `firestore.rules`:
1. **Master Gate Default-Deny**:
   ```javascript
   match /{document=**} {
     allow read, write: if false;
   }
   ```
2. **Context-Aware Path Verification**:
   The `{userId}` path parameter must strictly match `request.auth.uid`. No user can read or write documents belonging to another UID.
3. **Identifier Sanitization (`isValidId`)**:
   Document and folder IDs are restricted to alphanumeric characters, dashes, and underscores (max 128 chars) to guard against path traversal attacks.
4. **Volume Protection (Denial of Wallet)**:
   Every incoming field is checked with `.size() <= MAX` (e.g. document name <= 256 characters, storage paths <= 512 characters).
5. **Entity Validation Helpers**:
   Writes are strictly guarded with `isValidUser()`, `isValidFolder()`, `isValidDocument()`, and `isValidRecent()`. Shadow fields are rejected via `keys().hasOnly()`.
6. **Immutable Fields**:
   The `userId` and `createdAt` timestamps cannot be changed once created.
7. **Action-Based Updates**:
   Updates must declare which fields can change using `affectedKeys().hasOnly(...)`.
8. **Storage File Type Guard**:
   Cloud Storage only accepts `application/pdf` or images with size <= 25MB.

---

## 2. Threat Analysis & Dirty Dozen Defenses

| Threat Vector | Attack Scenario | Defense Implemented |
| :--- | :--- | :--- |
| **Ghost Field Injection** | Attacker adds `isAdmin: true` or `quota: 999999` | Rejected by `keys().hasOnly()` in `isValidDocument` |
| **Tenant Crossing Read** | User A tries to list `/users/UserB/documents` | Rejected by `isOwner(userId)` (`auth.uid == userId`) |
| **Tenant Crossing Write** | User A attempts to write into User B's folder | Blocked at path level; requires matching `auth.uid` |
| **Path Traversal / Poisoning** | ID like `../../passwords` | Rejected by `matches('^[a-zA-Z0-9_\\-]+$')` |
| **Immortal Field Tampering** | User changes original `createdAt` timestamp | Rule enforces `incoming().createdAt == existing().createdAt` |
| **Resource Exhaustion** | Attacker uploads a 1GB file | Rejected by Storage rule `request.resource.size <= 26214400` |
| **Malicious MIME Executable** | Attacker uploads `.exe` masquerading as PDF | Rejected by `request.resource.contentType == 'application/pdf'` |
