# MyPet v1.5.0

Backend moved from Enzo to the existing MySubs Supabase project (radskybbymadavveatzn). MyPet now uses the shared MyCar/MyList account, with its own browser session storage. Membership and per-user RLS remain required.

Existing profile, health records, push subscriptions and delivery history were copied, mapping owner IDs by verified email. VAPID keys were preserved privately. No credentials, health data or private keys are stored in this repository. The original Enzo database is retained as a rollback copy. Push scheduling runs only in the new project.

After updating, sign in with the existing shared account password. A previous Enzo session is not reused.
