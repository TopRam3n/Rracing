# ROK Racers JA – Structured Backlog (Issues, Fixes, Add-Ons, To-Dos)

Priority scale:
- P0 – Launch blocker / critical MVP
- P1 – High impact for launch polish
- P2 – Nice-to-have add-on / v2
- P3 – Strategy / internal notes


## ─────────────────────────────
## P0 – CORE MVP ISSUES & FIXES
## ─────────────────────────────

### [P0][Issue] Fix hero and drift backdrop responsiveness on small screens

**Category:** Issue (frontend/responsive)  
**Priority:** P0  

**Description:**  
The landing hero and drift backdrop need tighter, intentional behavior on mobile and tablet. Text, CTAs, and visual elements must be readable and cinematic across breakpoints.

**Tasks:**
- [ ] Adjust hero padding/margins on small screens to bring content closer to edges without breaking layout
- [ ] Ensure hero text scales (font-size, line-height) for < 400px width devices
- [ ] Fix drift backdrop alignment/overflow on mobile (no scrollbars or clipping)
- [ ] Verify layout on common breakpoints (320, 375, 414, 768, 1024)
- [ ] Regression test hero on desktop

**Acceptance Criteria:**
- [ ] No horizontal scroll on mobile
- [ ] Drift backdrop looks intentional (no awkward gaps)
- [ ] CTAs are tap-friendly and not cramped

**Labels:** `frontend` `responsive` `mvp-polish` `P0`


### [P0][Issue] Mobile-first UX pass across core flows

**Category:** Issue (UX)  
**Priority:** P0  

**Description:**  
Ensure all primary flows feel smooth and intentional on mobile, since most users will be on phones.

**Flows to test:**
- Landing → Events → Event detail → RSVP
- Landing → Garage → Build detail → Like
- Create build → Redirect to build detail
- Create sighting → Sightings list → Sighting detail
- Tickets page → Open event

**Tasks:**
- [ ] Check spacing, hit targets, and font sizes on each flow
- [ ] Fix any scroll-jank or horizontal overflow
- [ ] Ensure forms work well with mobile keyboard
- [ ] Confirm success states and redirects are clear

**Acceptance Criteria:**
- [ ] All flows are usable one-handed on a typical phone
- [ ] No clipped UI or hidden buttons
- [ ] User always knows “what just happened” after actions

**Labels:** `ux` `mobile` `mvp-polish` `P0`


### [P0][Fix] Implement friendly empty states across all list/detail pages

**Category:** Fix (UX/visual)  
**Priority:** P0  

**Description:**  
All list and related detail views should show clear, on-brand empty states when there is no data (events, builds, tickets, sightings, likes).

**Scopes/Pages:**
- Events list
- Garage / builds list
- Tickets page
- Sightings list
- Likes (e.g., user liked builds)

**Tasks:**
- [ ] Create empty state component with icon, short message, and primary CTA
- [ ] Wire empty states for:
  - [ ] No events
  - [ ] No builds
  - [ ] No tickets
  - [ ] No sightings
  - [ ] No likes
- [ ] Confirm tone matches ROC/RRXNG vibe

**Acceptance Criteria:**
- [ ] No plain “blank” pages when lists are empty
- [ ] Each empty state suggests one clear next action
- [ ] No console errors when lists are empty

**Labels:** `frontend` `ux` `mvp-polish` `P0`


### [P0][Fix] ROC-styled error states & inline feedback

**Category:** Fix (error handling)  
**Priority:** P0  

**Description:**  
Replace generic or missing error messages with short, readable ROC-themed messages, and ensure key flows are wrapped with proper error handling.

**Tasks:**
- [ ] Wrap key async actions with error handling:
  - [ ] RSVP create
  - [ ] Build create/update
  - [ ] Sighting create
  - [ ] Auth/sign-in flows
- [ ] Show toast/inline error with clear message + retry where possible
- [ ] Standardize error message format (title + one-line description)
- [ ] Log technical details to console only

**Acceptance Criteria:**
- [ ] User always sees a non-technical error message
- [ ] Actions provide a visible retry path where appropriate
- [ ] No raw Supabase errors or stack traces shown in UI

**Labels:** `frontend` `ux` `error-handling` `P0`


### [P0][Issue] Sign-in & promoter flow consistency

**Category:** Issue (auth/UX)  
**Priority:** P0  

**Description:**  
Sign-in and promoter flows must be predictable. Buttons, redirects, and permissions should behave the same everywhere.

**Tasks:**
- [ ] Standardize “Sign in” button text and placement across pages
- [ ] Ensure promoter-only views are properly gated
- [ ] Configure post-login redirect (previous page or promoter dashboard)
- [ ] Add small UX copy explaining promoter benefits/access where relevant

**Acceptance Criteria:**
- [ ] No dead ends or confusing redirects after login
- [ ] Promoter-only routes are correctly protected
- [ ] User always understands where they landed after sign-in

**Labels:** `auth` `ux` `mvp-polish` `P0`


### [P0][Fix] Update login, password handling & email verification

**Category:** Fix (auth/security)  
**Priority:** P0  

**Description:**  
Improve account handling for reliability and security, including integration with Google/email verification where required.

**Tasks:**
- [ ] Review password handling (validation, error states, reset flows)
- [ ] Fix any login edge cases (failure loops, unclear errors)
- [ ] Implement/clean up email verification flow
- [ ] Ensure Google-based email verification behaves as expected
- [ ] Confirm users cannot access protected features without verification (where intended)

**Acceptance Criteria:**
- [ ] Login and password flows feel stable and predictable
- [ ] Email verification works end-to-end with clear UI feedback
- [ ] No obvious security gaps for basic auth

**Labels:** `auth` `backend` `security` `P0`


### [P0][Issue] Hero “Events” button → All Events page

**Category:** Issue (navigation)  
**Priority:** P0  

**Description:**  
The primary Events CTA in the hero should always send users to the main All Events page.

**Tasks:**
- [ ] Update hero CTA link to All Events route
- [ ] Confirm behavior on mobile + desktop
- [ ] Ensure deep-linking works when user is signed in/out

**Acceptance Criteria:**
- [ ] Clicking hero Events CTA always opens All Events
- [ ] No broken links or redirect loops

**Labels:** `frontend` `routing` `mvp-polish` `P0`


### [P0][Issue] All Events page – show full event history + ticket option

**Category:** Issue (core events UX)  
**Priority:** P0  

**Description:**  
The All Events page should show all events ever posted, with key details and a clear path to buy/reserve tickets.

**Tasks:**
- [ ] Fetch and display all events (past + upcoming) with sensible ordering
- [ ] Show essential info (name, date, location, type, status)
- [ ] Provide a “Buy ticket” / “Reserve spot” option where applicable
- [ ] Indicate past vs upcoming events visually

**Acceptance Criteria:**
- [ ] All events appear with legible info
- [ ] Ticket option is available for ticketed events
- [ ] UX clearly distinguishes upcoming vs past events

**Labels:** `frontend` `events` `mvp-polish` `P0`


---

## ─────────────────────────────
## P1 – HIGH-IMPACT UX & VISUAL POLISH
## ─────────────────────────────

### [P1][Fix] Improve button readability across the app

**Category:** Fix (UI)  
**Priority:** P1  

**Description:**  
Buttons should be visually clear and easy to read, with proper contrast, font size, and spacing.

**Tasks:**
- [ ] Audit button styles on primary pages (landing, events, garage, sightings, auth)
- [ ] Increase contrast where text is hard to read
- [ ] Adjust font size/weight for legibility
- [ ] Ensure focus/hover/tap states are consistent

**Labels:** `frontend` `ui` `mvp-polish` `P1`


### [P1][Add-On] Add loading page with racing GIF

**Category:** Add-on (UX flair)  
**Priority:** P1  

**Description:**  
Show a short loading state with a racing GIF when the app is first loading or during heavier transitions, reinforcing the brand.

**Tasks:**
- [ ] Design/choose on-brand racing GIF
- [ ] Implement loading overlay/page
- [ ] Hook into initial load / important transitions only
- [ ] Ensure it doesn’t feel slow or intrusive

**Labels:** `frontend` `ux` `animation` `P1`


### [P1][Fix] Rename “Highlights” to “News” and redesign layout

**Category:** Fix/Add-on (content & layout)  
**Priority:** P1  

**Description:**  
Rename Highlights → News.  
Use a fan-style social layout on the homepage and a more structured grid layout on the News page (inspired by Lando Norris socials).

**Tasks:**
- [ ] Rename route and navigation labels to “News”
- [ ] Adjust homepage “News/Highlights” section to a fan-style social layout
- [ ] Build dedicated News page with grid layout
- [ ] Confirm URLs, SEO tags, and links all updated

**Labels:** `frontend` `ux` `copywriting` `P1`


### [P1][Add-On] Background overlays & per-page backgrounds

**Category:** Add-on (visual design)  
**Priority:** P1  

**Description:**  
Add an overlay background for navbar/hero and define unique background treatments per page (e.g., drift tire marks, Kingston lookout, gas station).

**Tasks:**
- [ ] Implement subtle background overlay beneath navbar and hero for readability
- [ ] Define background variants per major page (Landing, Garage, Events, News, About, etc.)
- [ ] Ensure performance is acceptable on mobile

**Labels:** `frontend` `ui` `branding` `P1`


### [P1][Add-On] Add reddish glow gradient at bottom of page

**Category:** Add-on (visual design)  
**Priority:** P1  

**Description:**  
Add a red glow gradient at the bottom of pages: soft red highlight at top, quickly dropping to a dark base and ending in `#141414`.

**Tasks:**
- [ ] Design CSS gradient and apply it to global layout or key pages
- [ ] Ensure it doesn’t interfere with content legibility or footer
- [ ] Test on dark/light monitors and mobile

**Labels:** `frontend` `ui` `branding` `P1`


### [P1][Add-On] Store “Coming Soon” banner for merch

**Category:** Add-on (UX + future commerce)  
**Priority:** P1  

**Description:**  
Show a small but visible “Store — Coming Soon” banner teasing upcoming merch: helmets, sunglasses, jackets, T-shirts, sweatpants with ROK label.

**Tasks:**
- [ ] Design banner component
- [ ] Place in an appropriate global area (nav, hero, or near footer)
- [ ] Add short copy teasing merch categories
- [ ] Allow easy future upgrade to real Store link

**Labels:** `frontend` `commerce` `marketing` `P1`


### [P1][Add-On] Racing section in hero (teams, event types, local racers)

**Category:** Add-on (navigation/content)  
**Priority:** P1  

**Description:**  
Add a racing-focused section tied to the hero that can expand/dropdown to show:
- Teams page
- Info on event types
- “Apply to teams”
- Articles about local racers

**Tasks:**
- [ ] Design dropdown or expandable hero section
- [ ] Add links/anchors to Teams, Event Types info, and Racer Articles
- [ ] Ensure mobile behavior is intuitive

**Labels:** `frontend` `ux` `content` `P1`


### [P1][Add-On] Types of events info page

**Category:** Add-on (content)  
**Priority:** P1  

**Description:**  
Create a page that explains the different event types (drift, time attack, meets, etc.) and suggests pages or accounts to follow.

**Tasks:**
- [ ] Define event types and copy
- [ ] Build info page and link it from All Events + hero racing section
- [ ] Add a few external/internal links for “learn more” or “follow”

**Labels:** `frontend` `content` `education` `P1`


### [P1][Fix] Configure ticket payments (debit/credit/cash at event)

**Category:** Fix/Add-on (commerce)  
**Priority:** P1  

**Description:**  
When users reserve tickets, they should be able to choose payment options: debit, credit, or “cash at event”.

**Tasks:**
- [ ] Add payment option field to ticket/reservation flow
- [ ] Reflect choice in promoter/event summary
- [ ] Ensure UX clearly explains what “cash at event” means

**Labels:** `frontend` `backend` `events` `commerce` `P1`


### [P1][Add-On] Pop-up headline banner for announcements

**Category:** Add-on (UX/comms)  
**Priority:** P1  

**Description:**  
Create a headline banner that can run across the page for major announcements (e.g., big meet, weather changes, drops).

**Tasks:**
- [ ] Implement dismissible headline banner component
- [ ] Allow dynamic text/config via config/env or DB
- [ ] Ensure it works well on mobile and doesn’t hide nav

**Labels:** `frontend` `ux` `marketing` `P1`


### [P1][Fix/Add-On] Copy & microcopy polish (ROC/RRXNG voice)

**Category:** Fix (copy)  
**Priority:** P1  

**Description:**  
Update UI text to be consistent, confident, and motorsport-flavored. Clean up generic SaaS language.

**Tasks:**
- [ ] Audit primary buttons and convert to ROC voice
- [ ] Audit labels and helper texts
- [ ] Add/adjust tooltips where actions might be confusing
- [ ] Standardize capitalization (title vs sentence case)

**Labels:** `ux` `copywriting` `mvp-polish` `P1`


### [P1][Fix] SEO, meta descriptions & link previews

**Category:** Fix (SEO)  
**Priority:** P1  

**Description:**  
Configure per-route `<title>`, `<meta name="description">` and OG tags for main pages to improve sharing and discoverability.

**Tasks:**
- [ ] Add unique titles/descriptions to main routes
- [ ] Configure OG image/title/description for key pages
- [ ] Verify previews on WhatsApp/Twitter/IG manually

**Labels:** `seo` `frontend` `mvp-polish` `P1`


### [P1][Add-On] “Please add watermark to your sightings” prompt

**Category:** Add-on (UGC protection)  
**Priority:** P1  

**Description:**  
When users upload sightings, prompt them to add a watermark to their photos.

**Tasks:**
- [ ] Add UX prompt in sightings upload flow
- [ ] Explain briefly why watermark is recommended
- [ ] Ensure prompt is noticeable but not blocking

**Labels:** `ux` `content` `P1`


### [P1][Add-On] Verified driver tag system

**Category:** Add-on (trust/safety)  
**Priority:** P1  

**Description:**  
Create a system to mark certain users/builds as “Verified drivers” to reduce spam/fake builds.

**Tasks:**
- [ ] Define criteria & process for verification (manual, invite-only, etc.)
- [ ] Add visual “Verified” tag on profile/build where applicable
- [ ] Ensure backend schema can store verification status
- [ ] Consider reporting/abuse tools later

**Labels:** `auth` `community` `trust` `P1`


### [P1][Add-On] Email notifications to promoters before events

**Category:** Add-on (ops/communication)  
**Priority:** P1  

**Description:**  
Send promoters an email one day before their event with a summary:

- Total tickets bought
- Total RSVPs
- List of attached builds

**Tasks:**
- [ ] Add scheduled job or cron-like logic
- [ ] Generate summary from DB
- [ ] Send email via configured provider
- [ ] Add simple on/off toggle for promoters

**Labels:** `backend` `email` `events` `P1`


---

## ─────────────────────────────
## P2 – ADD-ONS & NEW FEATURES (v2-ish)
## ─────────────────────────────

### [P2][Add-On] Enable Vercel Analytics + basic pageview tracking

**Category:** Add-on (analytics)  
**Priority:** P2  

**Description:**  
Turn on baseline observability: Vercel Analytics plus simple pageview tracking.

**Tasks:**
- [ ] Enable Vercel Analytics in project settings
- [ ] Implement lightweight pageview tracking on route change
- [ ] Verify events appear in dashboard

**Labels:** `analytics` `infrastructure` `P2`


### [P2][Add-On] Track “RSVP created” / “Build created” events

**Category:** Add-on (analytics)  
**Priority:** P2  

**Description:**  
Add simple custom analytics for key actions to support sponsor decks and growth decisions.

**Tasks:**
- [ ] Emit `RSVP_CREATED` on successful RSVP
- [ ] Emit `BUILD_CREATED` on new build
- [ ] (Optional) Emit `SIGHTING_CREATED`
- [ ] Confirm visibility in chosen analytics tool

**Labels:** `analytics` `events` `P2`


### [P2][Add-On] About page – max 3D imagery & car-part collage

**Category:** Add-on (visual/content)  
**Priority:** P2  

**Description:**  
Redesign About page to be very visual: heavy 3D, car parts scattered like a disassembled car, red glow cursor effect, and social CTA.

**Tasks:**
- [ ] Layout design with car-part collage aesthetic
- [ ] Integrate 3D elements
- [ ] Implement red “glow light” cursor on scroll or hover
- [ ] Add section linking to socials: “Explore more Jamaican racing and culture with us!”

**Labels:** `frontend` `ui` `branding` `P2`


### [P2][Add-On] Clubs/teams section with external links & apply forms

**Category:** Add-on (community)  
**Priority:** P2  

**Description:**  
Add a clubs/teams section featuring teams like TeamStreetz, RunRoadCo, classic car clubs, with links and apply forms.

**Tasks:**
- [ ] Design clubs/teams section
- [ ] Show logos/photos + short descriptions
- [ ] Add “Apply to team” links to team-provided Google Forms
- [ ] Ensure responsive layout

**Labels:** `frontend` `community` `content` `P2`


### [P2][Add-On] Marketplace for cars and car parts

**Category:** Add-on (commerce/community)  
**Priority:** P2  

**Description:**  
Introduce a marketplace where users can list cars and car parts for sale.

**Tasks:**
- [ ] Define schema for listings (type, price, location, contact, photos)
- [ ] Build basic listing UI + detail pages
- [ ] Add filters (category, price range, parish)
- [ ] Consider moderation/reporting later

**Labels:** `v2` `marketplace` `commerce` `P2`


### [P2][Add-On] Email section for custom requests

**Category:** Add-on (comms)  
**Priority:** P2  

**Description:**  
Add a section where users can send special requests (sponsor, collaboration, feature requests, etc.).

**Tasks:**
- [ ] Simple request form (topic, message, contact)
- [ ] Wire up to email or DB
- [ ] Add link from footer/Contact

**Labels:** `frontend` `email` `ux` `P2`


### [P2][Add-On] v2 – 3D generation & visual upgrades

**Category:** Add-on (3D/v2)  
**Priority:** P2  

**Description:**  
Once MVP is stable, expand the 3D experience with more models and tighter integration with builds.

**Tasks:**
- [ ] Research performance constraints and techniques
- [ ] Add more GLB models/body styles
- [ ] Optionally integrate 3D viewer with build detail pages
- [ ] Optimize load times on mobile

**Labels:** `v2` `3d` `P2`


### [P2][Add-On] v2 – Vendor & parts system

**Category:** Add-on (vendor ecosystem)  
**Priority:** P2  

**Description:**  
Build vendor/parts subsystem with listings, fitment info, and hooks for discounts.

**Tasks:**
- [ ] Vendor profiles (name, logo, parish, contact)
- [ ] Parts listings (make/model, category, price range)
- [ ] Search/filter UI
- [ ] Admin/promoter UI for managing parts

**Labels:** `v2` `vendors` `parts` `P2`


### [P2][Add-On] v2 – Messaging/follow system

**Category:** Add-on (social/community)  
**Priority:** P2  

**Description:**  
Allow users to follow builds/drivers and possibly message or request contact.

**Tasks:**
- [ ] Follow/unfollow system for users/builds
- [ ] “My feed” page (v2+)
- [ ] Simple messaging or contact-request mechanism
- [ ] Basic privacy & abuse mitigations

**Labels:** `v2` `social` `community` `P2`


---

## ─────────────────────────────
## P3 – STRATEGY, CONTENT & INTERNAL DEV NOTES
## ─────────────────────────────

### [P3][To-Do] Launch & marketing strategy

**Category:** To-Do (strategy)  
**Priority:** P3  

**Description:**  
Define how ROK Racers JA will be launched to the Jamaican car community and sponsors.

**Tasks:**
- [ ] Write marketing plan (channels, content pillars, cadence)
- [ ] Social content plan for RRXNG + ROC (IG/TikTok/Twitter)
- [ ] Define sponsor tiers/benefits
- [ ] Plan first official meet via the platform
- [ ] Create sponsor deck v1

**Labels:** `marketing` `growth` `launch` `P3`


### [P3][To-Do] Portfolio-ready polish

**Category:** To-Do (presentation)  
**Priority:** P3  

**Description:**  
Make ROK Racers JA ready as a portfolio centerpiece for jobs.

**Tasks:**
- [ ] Fix any obvious rough edges
- [ ] Add clean README (tech stack, features, screenshots)
- [ ] Capture demo screenshots and/or Loom
- [ ] Highlight key engineering/design decisions

**Labels:** `portfolio` `documentation` `P3`


### [P3][To-Do] Refine tagline “Rok Racer — jamrock meets speed”

**Category:** To-Do (branding)  
**Priority:** P3  

**Description:**  
Explore versions and placements of the tagline to best represent brand tone.

**Tasks:**
- [ ] Brainstorm tagline variants/placement
- [ ] Test in hero, About, meta description
- [ ] Finalize one primary tagline

**Labels:** `branding` `copywriting` `P3`


### [P3][Dev Note] 3D models config improvement

**Category:** Dev Note  
**Priority:** P3  

**Description:**  
Standard pattern for adding new 3D models.

**Notes:**
- Drop GLBs into `/Assets/models/...`
- Add entries to `BASE_MODEL_GLBS` map
- Ensure dropdown in `build-edit.html` uses matching keys

**Labels:** `3d` `dev-notes` `P3`
