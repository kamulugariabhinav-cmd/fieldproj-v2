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

## Signup requirements

The signup form requires at least eight characters, including an uppercase ASCII
letter, a lowercase ASCII letter, a number, and a non-space symbol. Password
confirmation must match. Existing sign-in passwords are not subjected to new
signup rules. Passwords are sent only to Firebase, never to the username-check
endpoint or the profile database.

Usernames contain 3–30 letters, numbers, or underscores. They are normalized to
lowercase and protected by SQLite's unique constraint. The form checks
availability before creating a Firebase account; the unique constraint remains
authoritative if two people choose the same name simultaneously. Firebase's
duplicate-email error is shown without creating another password account.

Required Firebase project configuration (needs project-owner console access):

1. In Authentication → Settings → Password policy, require a minimum length of
   8, uppercase, lowercase, numeric, and non-alphanumeric characters. Use
   enforcement mode so direct Firebase clients and password resets follow the
   same rules; form-side checks alone cannot enforce a Firebase project policy.
2. In Authentication → Settings → User account linking, select one account per
   email address. Otherwise Firebase can allow separate provider accounts with
   the same email address. Link providers to an existing account instead of
   creating duplicate identities.

These console settings were not changed by the local code update.
Official policy reference: https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/auth/web/password-auth

Client tests:

```powershell
node voiceguard_addon/test_signin_client.js
```

Tests use a mocked Firebase SDK. Actual personal account sign-in is left to the
user; the agent has not entered account credentials or completed OAuth login.
