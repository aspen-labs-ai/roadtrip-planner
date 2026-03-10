# Roadtrip Planner

A mobile-first visual trip planner built with Next.js 15, TypeScript, Tailwind CSS, and the App Router.

## What it does

- Tue-Sun timeline view with hour markers from 6:00 AM to midnight
- Add, edit, and delete activities
- Drag activities to move/reorder by time and day
- Drag top/bottom handles to resize activity timing
- Color-coded activity types: travel, food, lodging, activity
- Auto-calculated drive time between consecutive locations
- Total drive time summary per day
- Local storage persistence (MVP, no backend)
- Preloaded Chicago -> Detroit -> Toronto -> Montreal sample itinerary

## Tech stack

- Next.js 15 (`next@15.1.6`)
- React 19 + TypeScript
- Tailwind CSS
- App Router

## Development

```bash
npm install
npm run dev
```

## Notes

- Drive-time estimation uses OpenStreetMap Nominatim (geocoding) and OSRM (routing), with distance-based fallback.
- Planner data is stored in browser local storage under `roadtrip-planner:v1`.
