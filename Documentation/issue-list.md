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



LOOK INTO SECUIRTY FEATURES:!!!!!!!!

You’ve got a solid page, but there are some real security foot-guns here. I’ll split it into **“what’s risky in this file”** vs **“what to fix in Supabase/hosting”**, then answer the framework question.

## Security issues in this file

### 1) Public Supabase anon key in the frontend (not automatically “bad”, but dangerous if rules are weak)

Putting the **anon key** in client code is normal for Supabase. The security problem happens if your **Row Level Security (RLS)** policies are missing or too permissive, because anyone can use that key to call your tables directly from their own script.

**High risk tables in your page:**

* `comments` (insert + select)
* `build_likes` (insert + delete + select)
* `build_images` (select)
* `builds` (select for owner fallback)
* `profiles` (select + upsert role during signup)

✅ **What to do:** make sure **RLS is ON** for all these tables and that your policies are strict (examples below).

---

### 2) Role escalation risk: users can set their own role to “promoter”

This is the biggest logic/security issue I see.

You do this on signup:

```js
upsertProfileRole(uid, chosenRole)
```

That means any random person can choose “promoter” in the UI and your client will write it to `profiles.role`.

Even if you “hide” admin links in the UI, an attacker can still:

* set their role to promoter
* visit `/admin-events.html` directly
* call any promoter-only queries if your RLS trusts `profiles.role`

✅ **Fix (strongly recommended):**

* Don’t let the client assign privileged roles.
* Use one of these patterns:

  1. **All users default to “racer”** on signup, and you manually upgrade promoters in the DB.
  2. Use a **server-side** process (Supabase Edge Function / backend) that verifies and assigns promoter role.
  3. Use **Supabase auth “custom claims”** for roles (server-set), not a writable `profiles.role`.

At minimum, lock down `profiles` so users can’t write `role`.

---

### 3) Stored XSS risk (you do escape, but be consistent)

You render user content (build descriptions, comments) using `innerHTML`. You do escape with `esc()` first, which is good.

However, stored XSS usually sneaks in when one place forgets to escape, or when you later add richer formatting.

✅ Safer pattern:

* Use `textContent` for plain text.
* If you want line breaks, create DOM nodes (or do the escape + `<br>` carefully like you’re doing now).

Right now your comment rendering is *mostly okay* because you do:

```js
esc(c.body).replace(/\n/g,'<br>')
```

Just keep that rule everywhere, always.

---

### 4) External scripts without Subresource Integrity (SRI)

You load:

* `https://unpkg.com/@google/model-viewer/...`
* `https://unpkg.com/@supabase/supabase-js@2`

If a CDN account or route gets compromised, your site could serve malicious JS.

✅ Fix options:

* Pin exact versions (you already do for Supabase, not for model-viewer).
* Prefer hosting the JS yourself (best).
* Add **SRI** hashes (harder with some CDNs that vary content).

---

### 5) Missing CSP and other security headers

Your HTML has inline scripts/styles, and no `Content-Security-Policy`. Without CSP, one XSS mistake becomes “game over”.

✅ Add headers (via your host: Netlify/Vercel/Cloudflare/etc):

* `Content-Security-Policy` (even a basic one helps a lot)
* `X-Content-Type-Options: nosniff`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy` (lock down camera/mic/etc if unused)

Because you use inline `<script>` and `<style>`, CSP is trickier. A framework/build tool helps here.

---

### 6) Privacy / ID enumeration

You load builds by `?id=...`. If IDs are guessable (or someone shares links), attackers can scrape public builds and comments. That’s not always “wrong”, but it’s a real consideration.

✅ If you want to reduce scraping:

* rate-limit (hard client-only)
* use “public slug” ids
* rely on RLS + only expose what’s meant to be public

---

## What to fix in Supabase (this is where most security actually lives)

### A) RLS policies you almost certainly want

**comments**

* Allow `SELECT` for public builds (or for owners), and allow `INSERT` only for authenticated users, with `user_id = auth.uid()`.
* Prevent posting on private builds unless owner.

**build_likes**

* Allow `INSERT/DELETE` only when `user_id = auth.uid()`.
* Unique constraint on `(build_id, user_id)` to prevent spam duplicates.

**profiles**

* Users can update *their own* profile fields (display_name, handle)…
* …but **NOT `role`**.

**builds**

* Public reads only for `is_public=true`
* Owner can read their own private builds

If any of these are missing/loose, the anon key becomes an open door.

---

### B) Database constraints that help a lot

* `comments.body` max length (prevents spam payloads)
* `comments.target_type` check constraint (only allowed values)
* `build_likes` unique `(build_id, user_id)`
* `profiles.handle` unique, normalized

---

## Should you use a framework?

### If this stays a small static site

You *can* keep it “vanilla HTML + JS” **if** you:

* implement strict RLS and constraints in Supabase
* stop client-side role assignment
* add security headers (CSP etc.)
* pin/host dependencies

### If you’re building a real app with auth + roles + admin features

Yes, a framework is worth it because it makes the **secure-by-default stuff** easier:

* safer routing + state handling
* environment variables and build-time config
* easier CSP (less inline JS)
* server-side checks for privileged actions (role assignment, moderation, etc.)

**Good “not too heavy” options:**

* **Next.js** (or similar) if you want server/API routes + Edge Functions style behavior
* **SvelteKit** if you want a cleaner UI + easy server endpoints
* Even just **Vite** (no big framework) improves structure and lets you move inline JS into files, which helps CSP

---

## The 3 most important changes to make now

1. **Block role escalation:** remove `role` upsert from the client; lock `profiles.role` in RLS.
2. **Audit RLS on every table used here** (`comments`, `build_likes`, `build_images`, `builds`, `profiles`) and add constraints.
3. **Add security headers** (especially CSP) and pin/host external scripts.

If you want, paste your **current RLS policies** (or screenshots of the Supabase “Policies” page for those tables) and I’ll tell you exactly what’s too open and what policies to add.
