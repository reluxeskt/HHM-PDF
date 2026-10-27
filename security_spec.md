# Security Specification & Threat Model — HHM PDF

## 1. Data Invariants
1. **User Identity Boundary**: Every document, folder, and recent file belongs to exactly one authenticated user (`userId`). Cross-tenant access is forbidden.
2. **Path Integrity**: Path variable `{userId}` MUST strictly match `request.auth.uid`. Path variables must satisfy `isValidId()`.
3. **Payload Immutability**: Fields `id`, `userId`, and `createdAt` are immutable once written.
4. **Volume Protection (Denial of Wallet)**: All string fields are constrained with `.size() <= MAX` (e.g. document name <= 256 chars, IDs <= 128 chars).
5. **Storage File Type Guard**: Cloud Storage files must have MIME type `application/pdf` and be <= 25MB (Spark Free Tier limit).
6. **No Unauthenticated Access**: All database operations require `request.auth != null`.

## 2. The "Dirty Dozen" Threat Payloads
The following payloads are tested to guarantee PERMISSION_DENIED:
1. **Ghost Field Injection**: Attempt to create document with unauthorized field `isAdmin: true` or `shadowQuota: 9999999`.
2. **Tenant Crossing Read**: Authenticated User A attempting to read `/users/userB/documents/doc1`.
3. **Tenant Crossing Write**: Authenticated User A attempting to write `/users/userB/documents/doc1`.
4. **Orphan Document Creation**: Document payload where `incoming().userId != userId` in path.
5. **Path Poisoning**: Document ID with junk or directory traversal characters `../../passwords`.
6. **Immortal Field Tampering**: Updating an existing document with a modified `createdAt` or modified `userId`.
7. **Resource Exhaustion String**: Document name exceeding 256 characters (10KB junk string).
8. **Negative Size Bytes**: Document payload with `sizeBytes < 0`.
9. **Negative Page Count**: Document payload with `pageCount < 1`.
10. **Storage Cross-Tenant Upload**: Uploading to `users/userB/document.pdf` with token for User A.
11. **Malicious Content Type**: Uploading an executable `malware.exe` with MIME `application/x-msdownload` instead of `application/pdf`.
12. **Oversized Upload**: Uploading a file exceeding the 25MB Spark free-tier quota.
