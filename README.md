# Cohort 85 / Porter

This is the web app for University of Denver EMBA Cohort 85.

The idea is pretty simple: instead of having random links, group chats, votes, events, photos, and trip info scattered everywhere, Porter gives the cohort one private home base.

It is part cohort dashboard, part travel app, part AI concierge, and part ridiculous spy-movie command center because apparently that is the direction we chose and now we are committed.

The app includes a home dashboard, Porter AI concierge, destination voting, events, RSVP flows, Explore, chat, teams, gallery, and member profiles.

The main visual direction is dark, cinematic, private, and premium. Think black, wine, champagne/gold, ember, glass panels, and holographic UI. The `/votes` page is the big showpiece right now. It is supposed to feel like you are standing in a room with a holographic globe projected from a table, picking a country for the cohort trip.

Stack: Vite, React 19, React Router 7, Firebase/Auth-ready architecture, Tailwind-style utility classes, `react-globe.gl`, `three`, and Vercel.

## What is in the app

### Command Center / Home

The main landing page for the cohort. This is where the app should feel like a private control room instead of a normal school website.

It includes cohort highlights, trip/event info, quick links, and the main navigation into the rest of the app.

### Porter AI Concierge

Porter is the cohort assistant concept.

The goal is not “random chatbot slapped into an app.” The goal is more like a private concierge for cohort travel, events, planning, questions, recommendations, and whatever else makes sense later.

### Votes

This is currently the most cinematic page.

The destination voting page includes:

* A holographic globe
* Clickable/highlighted countries
* Country search
* Shortlist chips
* Country intel cards
* Destination images
* Vote actions
* A more normal voting flow for in-trip decisions
* Completed votes/results

The goal is for destination voting to feel like a spy movie recon room, not a boring multiple-choice survey.

### Plan + RSVP / Events

This is where cohort events and trip plans live.

The idea is that people can RSVP to events, see what is coming up, and eventually have winning votes turn into actual event/trip options.

### Explore

A discovery feed for destinations, restaurants, experiences, and other cohort/travel ideas.

This can be connected to something like a Google Sheet if we want to manage the content outside the app.

### Chat

A cohort group chat area.

### Teams

A place for small groups, teams, or project groups.

### Gallery

Photos and media from cohort events and trips.

### Profile / Me

Member profile area.

## Quick start

```bash
git clone <your fork>
cd <your fork>
npm install
cp .env.example .env
npm run dev
```

Check `.env.example` for the environment variables the app expects.

## Main dependencies

```bash
npm install react-router-dom react-globe.gl three
```

If Firebase is being used in the repo:

```bash
npm install firebase
```

## Forking checklist

If you are copying this repo or setting up a new version, go through this in order.

### 1. Create a Firebase project

Go to:

```text
https://console.firebase.google.com
```

Create a new project for this app.

### 2. Update `.firebaserc`

Change the Firebase project id:

```json
{ "projects": { "default": "your-project-id" } }
```

### 3. Enable Firebase services

Turn on the Firebase services the app needs:

* Authentication
* Cloud Firestore
* Cloud Storage
* Firebase Functions, if using server-side AI/image features

### 4. Set up environment variables

Copy the example env file:

```bash
cp .env.example .env
```

Then fill in the Firebase config and app-specific values.

Common values may include:

```bash
VITE_COHORT_ID=cohort-85
VITE_ALLOWED_EMAIL_DOMAIN=du.edu
VITE_AUTH_REDIRECT_URL=
VITE_EXPLORE_SHEET_URL=
```

### 5. Deploy Firebase rules and indexes

If the app is using Firestore/Storage rules:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 6. Bootstrap the first admin

Sign in once so your user gets a uid.

Then go into Firestore and create:

```text
cohorts/{VITE_COHORT_ID}/admins/{your-uid}
```

With:

```json
{ "enabled": true }
```

Client-side users should not be able to make themselves admins, so this should be done from the Firebase console or an admin script.

### 7. Configure Porter AI

If Porter uses an AI provider through a Firebase Function or Vercel serverless route, add the API key as a server-side secret.

Do not put private API keys in frontend `VITE_` variables.

Firebase Functions example:

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase deploy --only functions
```

Vercel example:

```text
ANTHROPIC_API_KEY=your-key
```

### 8. Wire up Explore

If Explore uses a Google Sheet, publish the sheet to the web as a CSV and set the sheet URL in the right environment variable.

If the app uses `/api/sheets.js` as a proxy, set this in Vercel too, not just locally:

```text
VITE_EXPLORE_SHEET_URL=your-published-csv-url
```

### 9. Replace old branding

Search the repo for any old names or leftover copy.

Replace things like:

* Global 84
* global-84
* Old city references
* Old splash/launch copy
* Old icons
* Old titles

The current app should use Cohort 85 / Porter branding.

## Browser tab title and icon

Update `index.html` so the browser tab is not still using the Vite icon or old Global 84 title.

Use something like this:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/porter-icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Porter | Cohort 85</title>
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Put the icon here:

```text
public/porter-icon.svg
```

Because Vite serves the `public` folder from the root, the icon path should be:

```text
/porter-icon.svg
```

## Deploying to Vercel

Use these Vercel settings:

* Framework preset: Vite
* Build command: `npm run build`
* Output directory: `dist`

Add all required environment variables in:

```text
Project Settings > Environment Variables
```

Add them for Production and Preview if using preview deployments.

If Firebase Auth is turned on, also add your Vercel domains in Firebase:

```text
Firebase Console > Authentication > Settings > Authorized domains
```

## Routing

`vercel.json` should send normal React routes back to `/`, while keeping `/api/*` available for serverless routes.

Example:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/launch", "destination": "/launch.html" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

This helps routes work when someone refreshes or opens a direct link.

Routes that should work:

```text
/
 /porter
 /votes
 /events
 /explore
 /chat
 /teams
 /gallery
 /me
```

## Email-link redirect behavior

Email-link sign-in should return users to the deployed app, not localhost.

The app should use:

* `VITE_AUTH_REDIRECT_URL` when provided
* otherwise `window.location.origin`

For production, set:

```text
VITE_AUTH_REDIRECT_URL=https://your-vercel-domain.vercel.app
```

## iPhone Safari test checklist

Use this before calling it “done.”

1. Open the Vercel URL in Safari.
2. Start email-link sign-in with an allowed email.
3. Tap the email link on iPhone.
4. Make sure it opens and completes sign-in on the deployed domain.
5. Go to `/`, `/porter`, `/votes`, `/events`, `/explore`, and `/me`.
6. Refresh each page and make sure there are no 404s.
7. Add the app to the Home Screen.
8. Launch it from the Home Screen icon.
9. Check the app icon, title, splash behavior, and routing.
10. Check `/votes` on mobile and desktop.
11. Make sure the globe, country chips, and intel card do not overlap.
12. Make sure the page still feels like a room, not a normal dashboard.

## Design direction

The app should not feel like a generic school portal.

The vibe is:

* Private cohort command center
* Luxury travel app
* Spy movie destination room
* Holographic globe
* Glass panels
* Champagne/gold details
* Wine, black, ember, and bronze tones
* Premium but not cheesy
* Cinematic but still usable

For `/votes`, the ideal feeling is:

You are inside a dark private room. There is a device/table in the center projecting a holographic globe. A few countries are highlighted. One country is selected. A holographic country card appears next to it with images, details, and voting info.

Basically, not a form. Not a survey. A destination recon room.

## Performance notes

The globe and cinematic effects can get heavy fast, so do not go insane with every possible animation.

Things to watch:

* Memoize filtered country and globe data.
* Keep globe animations subtle.
* Do not add a million rings, arcs, particles, and glows.
* Use fixed-height images so the layout does not jump around.
* Lazy-load non-active destination images.
* Eager-load the active country hero image.
* Keep mobile layouts simpler than desktop.
* Avoid stacking too many blurry glass panels.
* Make it fit on one screen when possible, especially `/votes`.

## License

MIT. See `LICENSE`.

