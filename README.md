# Office Hours Scheduler

A small web-based office hours booking and admin dashboard system.

This repository includes:

- `index.html` — the student-facing booking page and schedule viewer.
- `admin.html` — an admin dashboard for viewing and filtering published schedule slots.
- `api/proxy.js` — a CORS proxy endpoint for forwarding booking requests to a Google Apps Script web app.
- `script-app-code.ts` — the Google Apps Script code used to perform bookings and send confirmation emails.
- `vercel.json` — configuration for deploying the proxy/API on Vercel.

## How it works

1. `index.html` loads a published Google Sheets CSV to render available office hours.
2. Students can select a slot and submit their name/email.
3. The booking request is sent through `api/proxy.js` to the Google Apps Script web app configured in `UPSTREAM`.
4. The Apps Script marks the slot as booked in the sheet and sends confirmation email(s).
5. `admin.html` also loads the published CSV and shows schedule stats, filtering, and slot details.

## Requirements

- A published Google Sheet with the office hours data.
- A Google Apps Script deployment as a web app.
- A web server to serve `index.html` and `admin.html` (recommended for local testing).
- Optional: Vercel or another Node server to deploy `api/proxy.js`.

## Setup

### 1. Prepare the Google Sheet

The sheet should have these columns in the first row:

- `Date`
- `Day`
- `Time`
- `Student Name`
- `Student Email`
- `Status`
- `Location`
- `Notes`

Then publish the sheet as a CSV:

1. Open the sheet in Google Sheets.
2. Select `File` → `Share` → `Publish to web`.
3. Publish the desired sheet.
4. Copy the published CSV URL. It should look like:

```text
https://docs.google.com/spreadsheets/d/e/<sheet-id>/pub?gid=<gid>&single=true&output=csv
```

### 2. Deploy the Google Apps Script

1. Open the Google Sheets file.
2. Go to `Extensions` → `Apps Script`.
3. Create a new script and copy the contents of `script-app-code.ts` into it.
4. Deploy as a web app:
   - Select `Deploy` → `New deployment`.
   - Choose `Web app`.
   - Set access to `Anyone` or `Anyone with link` depending on your needs.
   - Copy the web app URL.

### 3. Configure the proxy

In `api/proxy.js`, update the `UPSTREAM` constant to your deployed Apps Script URL if you are not using the current one:

```js
const UPSTREAM = 'https://script.google.com/macros/s/<your-script-id>/exec';
```

This proxy forwards requests from the browser to the Apps Script and adds CORS headers.

### 4. Configure the front-end

In `admin.html` and `index.html`, set the `SHEET_URL` constant to your published sheet CSV URL.

In `index.html`, update the proxy endpoint if you deploy your own API instead of the existing remote deployment:

```js
const endpoint = 'https://your-deployment-url.vercel.app/api/proxy';
```

If you deploy the repo to Vercel and keep the default API route, the endpoint should be:

```js
/api/proxy
```

when the page is served from the same site.

## Running locally

From the repository root, start a local HTTP server so `fetch()` can load the CSV correctly:

```bash
cd c:\Users\bskopyk\git-projects\office-hours
python -m http.server 8000
```

Then open:

- `http://127.0.0.1:8000/index.html` for students
- `http://127.0.0.1:8000/admin.html` for admin dashboard

> Opening `admin.html` or `index.html` directly from `file://` will often fail due to browser security restrictions on `fetch()`.

## Deploying

### Vercel

This repo is configured to deploy the API under `api/proxy.js` using Vercel.

1. Install the Vercel CLI or use the Vercel dashboard.
2. Deploy the repo.
3. Make sure `vercel.json` stays in place so CORS headers are applied to `/api/*`.

If you deploy the front end and API together, update `index.html` to use the same origin for `endpoint`.

### Alternative deployment

You can also deploy the proxy on any Node server or serverless environment that supports CommonJS.

## Customization

### Sheet columns

If your sheet layout changes, update both:

- `admin.html` column parsing and rendering logic
- `script-app-code.ts` row mapping and booking logic

### Booking logic

`script-app-code.ts` uses `slotKey` to match rows based on date, day, time, and location. Keep the same format in the spreadsheet and the front-end parser.

### Email notifications

The Apps Script code sends:

- a confirmation email to the student
- a notification email to `bskopyk@binghamton.edu`

Update the email recipient inside `script-app-code.ts` if needed.

## Notes

- `admin.html` currently fetches the published CSV directly and does not require a proxy for schedule loading.
- `index.html` uses the proxy only for booking requests to avoid CORS issues with Google Apps Script.
- If you want to reuse this for another person, update the sheet URL, Apps Script URL, and proxy endpoint to your own deployment.

## Troubleshooting

- `NetworkError when attempting to fetch resource` → run a local web server and do not open the files via `file://`.
- No data shown → verify the published CSV URL and the `SHEET_URL` values in both HTML files.
- Booking fails → verify `api/proxy.js` points to a valid Apps Script web app and that the app is deployed with public access.

## Files

- `index.html` — student booking interface and schedule display
- `admin.html` — admin dashboard and slot statistics
- `api/proxy.js` — proxy server for bookings
- `script-app-code.ts` — Google Apps Script logic for booking and email confirmations
- `vercel.json` — deployment/CORS configuration for Vercel
