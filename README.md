# StudyOS

StudyOS is a PWA exam command center with configurable study blocks and Web Push.

## Vercel setup
Import this repository into Vercel. The static app is deployable immediately.

For server push, add:
- NEXT_PUBLIC_VAPID_PUBLIC_KEY
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_EMAIL
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

The cron endpoint runs every minute and sends reminders whose Asia/Kolkata HH:mm matches the current time.

On iPhone, add the deployed site to the Home Screen, open the Home Screen app, then tap Enable Notifications. iOS Home Screen web apps support Web Push.