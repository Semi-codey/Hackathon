# Google Calendar integration (development)

This project includes a simple front-end Google Calendar integration that uses OAuth2 PKCE to request `calendar.events` permission and insert mock workout sessions as calendar events.

Important notes

- This is a development convenience only. Storing tokens and doing token exchange in the browser has security trade-offs. For production, run the token exchange and refresh flow on a secure backend.

What you need

1. A Google Cloud project with the Calendar API enabled.
2. An OAuth 2.0 Client ID (type: Web application).
3. Add authorized redirect URIs for your dev server, e.g.:
   - `http://localhost:5173/oauth2callback`
   - `http://localhost:5174/oauth2callback` (if Vite uses a different port)

Environment

- Add your Google OAuth client id in a `.env` file at the repo root (or export it in your shell):

```bash
# .env
VITE_GOOGLE_CLIENT_ID=1019280297840-gprs8vm46be7p5rhbtql50j8vo72hcf4.apps.googleusercontent.com
```

How it works in this repo

- `src/app/lib/googleCalendar.ts` implements a PKCE flow, token exchange and `insertSessionsAsEvents` which will insert events into the primary calendar.
- `src/app/components/pages/OAuthCallback.tsx` receives the Google redirect, exchanges the code for tokens and completes any pending sync.
- `src/app/lib/mockData.ts` exposes `api.syncWithGoogleCalendar()` which now triggers the integration and inserts `mockWorkoutSessions` into the calendar.

Testing the flow

1. Start the dev server:

```bash
npm run dev
```

2. Open the app in your browser.
3. Go to the "Plan" page and click "Sync Google Kalender".
4. If not previously authorized, you'll be redirected to Google. After granting permission you'll return to `http://localhost:5173/oauth2callback` and the app will finish the pending sync.

Troubleshooting

- If you see CORS or token errors, ensure the redirect URI matches exactly the value configured in Google Cloud Console and Vite is running on that host/port.
- For production usage, move token handling to a backend and implement secure token refresh.

If you'd like, I can also:

- Add UI progress and per-event error reporting.
- Implement server-side token exchange and refresh logic (requires a small backend).
