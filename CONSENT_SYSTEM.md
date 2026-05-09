# DebugToDeploy Consent Management System

This system implements a production-ready legal consent flow for Privacy Policy and Terms & Conditions, compliant with Google Play Store requirements.

## Components

1.  **SQL Migration (`supabase_consent_migration.sql`)**: Adds `accepted_terms`, `accepted_privacy_policy`, `accepted_at`, and `accepted_policy_version` to the `profiles` table.
2.  **Consent Utility (`src/lib/consent.ts`)**: Manages versioning (`v1.0`) and provides helper functions to save consent.
3.  **Consent Checkbox (`src/components/ConsentCheckbox.tsx`)**: A premium, glassmorphism-compatible checkbox component used in the Auth flow and the Modal.
4.  **Auth Page Integration (`src/pages/Auth.tsx`)**: Gates all authentication methods (Email, Google, GitHub) behind a mandatory consent checkbox.
5.  **Mandatory Consent Modal (`src/components/ConsentModal.tsx`)**: A global enforcer that blocks dashboard access for existing users or new OAuth users until they accept the latest policy version.
6.  **Legal Pages (`src/pages/Privacy.tsx`, `src/pages/Terms.tsx`)**: Premium, dedicated pages for legal documentation.

## How it works

### New Users (Email/Password)
1.  User visits the Auth page.
2.  The "Start Deploying" or "Join the Squad" buttons are disabled until the checkbox is checked.
3.  Upon successful signup, `saveUserConsent` is called to record the agreement.

### OAuth Users (Google/GitHub)
1.  User must check the checkbox before the OAuth redirect starts.
2.  After successful OAuth redirect back to the app, the `ConsentModal` detects if the user is new or has an outdated policy version.
3.  The modal blocks the dashboard and requires acceptance before the user can proceed.

### Existing Users
1.  When an existing user logs in, the `ConsentModal` checks their `accepted_policy_version`.
2.  If it doesn't match `POLICY_VERSION` (v1.0), the modal appears.
3.  The user must accept to regain access to their dashboard.

## Policy Versioning
To force re-consent in the future (e.g., legal updates), simply increment the `POLICY_VERSION` constant in `src/lib/consent.ts`.

```typescript
export const POLICY_VERSION = 'v2.0';
```

This will automatically trigger the `ConsentModal` for all users on their next session.

## Mobile App
The mobile app is a WebView wrapper of the web application. Therefore, it inherits all consent management logic, UI, and versioning checks automatically, ensuring a synchronized experience across all platforms.
