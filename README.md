# LUMINHAW account authentication

This repository contains the static email-verification and password-recovery
site for the LUMINHAW Flutter app:

<https://luminhawofficial.github.io/Administrator/>

It uses HTML, CSS, JavaScript, and Supabase Auth. GitHub Pages serves the files;
there is no application server. The browser contains only the Supabase
**publishable** key. Never add a service-role key, password, or other secret to
this repository.

## Authentication flow

- Flutter sign-up and verification resend requests redirect to this site.
  Supabase email links contain a one-time `token_hash` and `type=signup`; the
  site calls `verifyOtp` and reports success only after Supabase accepts it.
- Password reset requests redirect here with a recovery token. The site
  validates it with `verifyOtp`, shows the password form only for a valid
  recovery session, then calls `updateUser`.
- Passwords are sent directly to Supabase over HTTPS, are never written to
  browser storage, and are cleared from the form after success. Auth sessions
  are memory-only.
- After verification or a password update, the site displays a text reminder
  to return to the mobile application. It does not show an app-return link or
  automatically open another app.

## Supabase production settings

In the existing Supabase project (`ccxzjjsxggrxiaaehxxu`), open
**Authentication → URL Configuration** and set:

- **Site URL:** `https://luminhawofficial.github.io/Administrator/`
- **Redirect URLs:** add
  `https://luminhawofficial.github.io/Administrator/` and
  `https://luminhawofficial.github.io/Administrator/**`.
- Keep the existing Android entries
  `com.luminhaw.plantcare://auth-callback` and
  `com.luminhaw.plantcare://auth/reset-password`; do not replace unrelated
  existing redirect URLs.

In **Authentication → Email Templates**, configure the confirmation template
to link directly to the site with the one-time token hash:

```html
<h2>Confirm your LUMINHAW account</h2>
<p>Verify your email address to finish creating your account.</p>
<p>
  <a href="{{ .SiteURL }}?token_hash={{ .TokenHash }}&amp;type=signup">
    Verify email
  </a>
</p>
```

Configure the reset-password template similarly:

```html
<h2>Reset your LUMINHAW password</h2>
<p>We received a request to change your LUMINHAW password.</p>
<p>
  <a href="{{ .SiteURL }}?token_hash={{ .TokenHash }}&amp;type=recovery">
    Choose a new password
  </a>
</p>
<p>If you did not request this change, you can ignore this email.</p>
```

The matching confirmation and recovery template files are also maintained in
the Flutter repository under `supabase/templates/`. Update these dashboard
settings before relying on production email links. This website deployment does
not modify Supabase production settings, data, policies, or Edge Functions.

## Deployment

The `Deploy authentication site to GitHub Pages` workflow publishes the root
site files to GitHub Pages on pushes to `main`. In the repository's **Settings
→ Pages**, select **GitHub Actions** as the build and deployment source.
Deployment status is available in the repository's Actions tab.

## Verification checklist

Use separate test accounts and disposable verification/recovery emails; do not
test against a real user's account or password.

1. Confirm a signup email opens the verification screen and only reports
   success after Supabase accepts the link.
2. Open an expired, malformed, or previously used signup link and confirm that
   no success screen appears.
3. Request a password reset; verify the valid token opens the form, passwords
   shorter than 8 characters or non-matching values are rejected, and duplicate
   submissions are disabled while updating.
4. Confirm a successful password update displays success only after Supabase
   returns the updated user; verify the old password no longer works and the
   new one does.
5. Confirm the verification and password-update screens remind the user to go
   back to the mobile application and show no app-return link.
6. Confirm no request, page URL, browser storage, or console output contains a
   password or service-role key.