P0 – CORE MVP ISSUES & FIXES (not done)

Fix hero and drift backdrop responsiveness on small screens

Regression test hero on desktop

Acceptance:

No horizontal scroll on mobile

Drift backdrop looks intentional

CTAs are tap-friendly and not cramped

Mobile-first UX pass across core flows

Check spacing, hit targets, and font sizes on each flow

Fix scroll-jank or horizontal overflow

Ensure forms work well with mobile keyboard

Confirm success states and redirects are clear

Acceptance:

All flows usable one-handed

No clipped UI or hidden buttons

User always knows what happened after actions

Friendly empty states across all list/detail pages

Create empty state component

Wire empty states for:

No events

No builds

No tickets

No sightings

No likes

Confirm tone matches ROC/RRXNG vibe

Acceptance:

No blank pages

Clear next action

No console errors when lists are empty

ROC-styled error states & inline feedback

Wrap key async actions with error handling:

RSVP create

Build create/update

Sighting create

Auth/sign-in flows

Show toast/inline error + retry

Standardize error format

Log technical details to console only

Acceptance:

No raw Supabase errors shown

Retry path exists where possible

Sign-in & promoter flow consistency

Standardize “Sign in” button text/placement across pages

Ensure promoter-only views gated

Configure post-login redirect

Add UX copy explaining promoter benefits/access

Acceptance:

No dead ends after login

Promoter-only routes protected

User understands where they landed

Update login, password handling & email verification

Review password handling (validation, reset flows)

Fix login edge cases

Implement/clean up email verification flow

Ensure Google-based verification behaves as expected

Confirm protected features blocked without verification (if intended)

Acceptance:

Stable login/password flows

Email verification end-to-end with clear UI

No obvious basic auth gaps

Hero “Events” button → All Events page

Update hero CTA link to All Events route

Confirm mobile + desktop

Ensure deep-linking works signed-in/out

Acceptance:

Always opens All Events

No broken links/loops

All Events page – show full event history + ticket option

Fetch and display all events (past + upcoming) with sensible ordering

Show essential info (name/date/location/type/status)

Provide Buy/Reserve option where applicable

Visually distinguish past vs upcoming

Acceptance:

All events appear

Ticket option available for ticketed events

Upcoming vs past is clear

P1 – HIGH-IMPACT UX & VISUAL POLISH (not done)

Improve button readability across the app

Add loading page with racing GIF

Rename “Highlights” to “News” and redesign layout

Background overlays & per-page backgrounds

Add reddish glow gradient at bottom of page

Store “Coming Soon” banner for merch

Racing section in hero (teams, event types, local racers)

Types of events info page

Configure ticket payments (debit/credit/cash at event) (you’re pausing online payments, but the “cash at gate/free” option still belongs here)

Pop-up headline banner for announcements

Copy & microcopy polish (ROC/RRXNG voice)

SEO/meta descriptions/link previews

“Please add watermark to your sightings” prompt

Verified driver tag system

Email notifications to promoters before events

P2 – ADD-ONS & NEW FEATURES (not done)

Enable Vercel Analytics + basic pageview tracking

Track “RSVP created” / “Build created” events

About page – max 3D imagery & car-part collage

Clubs/teams section with external links & apply forms

Marketplace for cars and car parts

Email section for custom requests

v2 – 3D generation & visual upgrades

v2 – Vendor & parts system

v2 – Messaging/follow system

P3 – STRATEGY, CONTENT & INTERNAL DEV NOTES (not done)

Launch & marketing strategy

Portfolio-ready polish

Refine tagline “Rok Racer — jamrock meets speed”

3D models config improvement note (this is just a note, not a task block)