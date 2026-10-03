# Health Tracker

A small, mobile-first app for keeping blood pressure and blood sugar readings in one place.

I built it to make everyday health logging quick and simple: open the app, add a reading, save it, and come back to it whenever needed. The same data stays available across devices through Supabase.

**Status:** Finished and working  
**Live app:** https://health-tracker-zeta-gold.vercel.app/

## What it does

- Record blood pressure, blood sugar, or both
- Save the exact date and time automatically
- Add older readings by changing the date and time
- Compare a new reading with the previous reading of the same type
- View, filter, edit, and delete saved readings
- See weekly averages, highest, lowest, and latest values
- View simple BP and sugar trend charts
- Compare the current 7-day period with the previous one
- Download a weekly PDF report for a doctor
- Download readings as a CSV backup
- Share reports using the device share menu where supported
- Keep each user's data private with Supabase Row Level Security
- Install the site on a phone as a PWA

The app only summarizes recorded values. It does not diagnose readings or label them as normal, abnormal, good, or bad.

## Tech stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security
- Recharts
- jsPDF
- vite-plugin-pwa
- Vercel
- GitHub Actions

## Why I kept it simple

This project is meant to feel more like a personal health diary than a hospital dashboard.

The main flow is intentionally short:

```
Open app
   ↓
Add reading
   ↓
Save
   ↓
Done
```

That simplicity matters more here than adding a long list of health features.

## Run it locally

Clone the repository and install the dependencies:

```bash
git clone https://github.com/nityansh19/Health-tracker.git
cd Health-tracker
npm install
```

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Then run the database setup from:

```
supabase/schema.sql
```

Paste that file into the Supabase SQL Editor and run it once.

Start the app:

```bash
npm run dev
```

For a production build:

```bash
npm run build
```

## Database and privacy

Every reading is linked to the signed-in Supabase user. Row Level Security policies restrict accounts to their own readings and profile.

Only the Supabase publishable key is used in the frontend. Secret keys, service-role keys, and database passwords should never be committed to the repository.

## Deployment

The current version is deployed on Vercel:

**https://health-tracker-zeta-gold.vercel.app/**

The project is also configured as a Progressive Web App, so supported browsers can install it directly to the phone's home screen.

---

Built as a focused, practical tool for recording and reviewing BP and blood sugar without making the experience complicated.
