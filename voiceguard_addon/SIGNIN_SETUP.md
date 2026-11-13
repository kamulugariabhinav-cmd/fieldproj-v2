# VoiceGuard sign-in

The homepage dialog supports Google, GitHub, and email/password using the
existing Firebase project. The project owner confirmed all three providers
are enabled. Provider secrets remain managed by Firebase; none are needed in
this repository.

Email sign-in includes account creation, verification-email sending, password
reset, and a password visibility toggle. Passwords are sent through the Firebase
SDK and cleared from the form after success or dialog closure. They are never
sent to VoiceGuard's SQLite API or stored in its database.

Successful sign-in opens `/dashboard`. The database verifies the Firebase ID
token with Google and uses the verified UID regardless of sign-in provider.
If an email belongs to a different provider, the dialog asks the user to use
that provider rather than silently linking identities.

For a new Firebase project, enable Email/Password and GitHub under Authentication
and configure a GitHub OAuth app using the callback URL Firebase provides.
For this project's existing auth domain the callback is:

`https://voiceguard-61a95.firebaseapp.com/__/auth/handler`

Add the site's hostname under Firebase authorized domains. GitHub OAuth client
secrets belong in Firebase Console, never in frontend code or this chat.

References:
- https://firebase.google.com/docs/auth/web/github-auth
- https://firebase.google.com/docs/auth/web/password-auth

Client tests:

```powershell
node voiceguard_addon/test_signin_client.js
```

Tests use a mocked Firebase SDK. Actual personal account sign-in is left to the
user; the agent has not entered account credentials or completed OAuth login.
