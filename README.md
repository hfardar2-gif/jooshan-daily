# PWA reminder worker

This Worker stores Web Push subscriptions in D1 and checks every five minutes
for reminders due in each device's own IANA timezone.

Required bindings and secrets:

- D1 binding: `DB`
- Variables: `APP_ORIGIN`, `VAPID_SUBJECT`
- Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

After deployment, copy the Worker URL. It is required by `dist/push-config.js`.
