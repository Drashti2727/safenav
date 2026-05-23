# Security Specification: PathHer AI

This document establishes the zero-trust data invariants and hardened validations for PathHer AI.

## 1. Data Invariants

*   **Users (`/users/{userId}`)**: 
    1. Only the owner of the account (the authenticated user whose `request.auth.uid` matches `{userId}`) can read or write their user profile and preferences.
    2. Modifying system profiles must validate format and preserve immutable records.

*   **Alerts (`/alerts/{alertId}`)**:
    1. Any authenticated user can read alerts to maintain collective safety.
    2. Alerts can be reported anonymized. During creation, `createdBy` must match either standard `request.auth.uid` or be labeled `anonymous`.
    3. Fields such as `type`, `dangerLevel`, and lat/lng coordinates are strictly validated on types and string sizes.
    4. Only authenticated users can upvote an alert. An upvote operation must be atomic, verifying that the user adds themselves to `upvotedBy` list and increments `upvotes`.

*   **Travel History Logs (`/travelHistory/{historyId}`)**:
    1. Only the owner of the travel record can read or write their routes (`userId == request.auth.uid`).
    2. State tracking can be logged dynamically, but user ids cannot be spoofed.

---

## 2. The "Dirty Dozen" Payloads

Here are the 12 malicious payloads designed to crash or spoof our data models, and the reasons why they are strictly blocked:

1.  **Identity Spoofing in Profiles**: Attempting to edit `/users/alice` profile when authenticated as `bob`. (Rejected because `request.auth.uid != userId`).
2.  **Privilege Escalation on Profile Creation**: Adding an admin flag like `role: 'admin'` or `isAdmin: true` during profile setup. (Rejected by strict schema and disallowed fields).
3.  **Coordinate Value Poisoning**: Creating an alert with latitude `999.0` or longitude `-5000.0` or injecting huge text arrays instead of floating double numbers. (Rejected by coordinate boundary checks).
4.  **Huge Description Flood**: Attempting a Denial-of-Wallet resource exhaustion by posting a 2MB string description. (Rejected because `incoming().description.size() <= 2000`).
5.  **Status Shortcutting in Travel Log**: Force-completing a travel log that belongs to another user. (Rejected on both owner ID verification and state transition validation).
6.  **Upvote Count Hijack**: Upvoting an alert by raising `upvotes` count by `1000` without appending the uid to `upvotedBy`. (Blocked because upvote is validated through specific affected keys and delta guards).
7.  **Alert Deletion by Stranger**: Bob trying to delete Alice's posted alert. (Blocked since only the creator or an admin can delete an alert).
8.  **Travel Log Owner Spoofing**: Creating a travel log with `userId = bob` when authenticated as `alice`. (Blocked because `incoming().userId == request.auth.uid`).
9.  **Date Spoofing/Backdating**: Creating an alert with a fake past timestamp in `createdAt`. (Blocked because `incoming().createdAt == request.time`).
10. **Zombies Alerts ID Injection**: Writing an alert using special illegal characters in `{alertId}` like `alerts/../poison`. (Blocked by `isValidId()` guard).
11. **Client-Delegated Read Scrambling**: Requesting list of all private travel history without filtering by ownership. (Query enforcer rule mandates `resource.data.userId == request.auth.uid`).
12. **Ghost-field inject in Travels**: Attempting a shadow update in travel history containing keys like `fakeRouteChanges = 99`. (Rejected because `affectedKeys().hasOnly()` handles specific action branches).

---

## 3. Test Runner Sandbox Setup

We will configure corresponding Firestore security rules to deny all malicious operations.
