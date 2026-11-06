---
name: Auth session query lifecycle
description: Preserve the active session observer when clearing user-owned data on login and logout.
---

Do not remove the actively observed session query while replacing its value during authentication. Remove other user-owned queries, then update the existing session query.

**Why:** Clearing the entire QueryClient removed the session query's active observer. Successful HTTP login responses did not update the screen until the next session poll, leaving the login form visible without an error.

**How to apply:** Keep the session query attached during login/logout transitions; separately clear the previous user's data. Treat a session refresh returning 401 as signed out even when stale session data remains cached.
