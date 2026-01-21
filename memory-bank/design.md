# MTG Codex - Design

## Overview
This project provides a web app that generates shareable "codex" pages from a pasted Magic: The Gathering decklist. Each codex summarizes Scryfall keywords across the list and highlights interactions from a static rules file. Codices are public by default, but creation requires login.

## Product Goals
- Generate a keyword cheat sheet from a pasted decklist.
- Persist codices with public, shareable URLs.
- Provide a "My Codices" page for logged-in users.
- Keep Scryfall usage within rate and caching policies. Policies can be found here: https://scryfall.com/docs/api
- Enable future multi-language support without changing logic.

## Key Decisions
- Ingest method: paste-only decklist (no Archidekt/Moxfield URL parsing).
- Terminology: generated pages are called "codices" (not decks).
- Auth: Google OAuth; login required to create codices. Implement via Better Auth with the TanStack Start cookies plugin.
- Visibility: codices are public and readable without login.
- Storage: SQLite for minimal overhead; Bun runtime.
- Expiration: codices expire after 30 days of inactivity; visiting refreshes the timer. This threshold value should be configurable by the site owner, not the users.
- Keywords source: trust Scryfall's keywords field.
- Keyword data: static JSON file in `keywords/keywords.json`.
- UI: TanStack Start fullstack app; default route is "My Codices" with a modal create flow.

## Data Model (SQLite)

### users
- id (PK, text, uuid)
- provider (text, "google")
- provider_user_id (text, unique)
- email (text)
- name (text)
- avatar_url (text)
- username (text, unique, max 32, allowed: [A-Za-z0-9_-])
- created_at (datetime)

### cards
- id (PK, text) - Scryfall ID
- name (text)
- data_json (text) - raw Scryfall payload
- updated_at (datetime)

### codices
- id (PK, text, short id)
- owner_id (FK users.id)
- title (text)
- canonical_list (text) - normalized list JSON
- summary_json (text) - computed keywords + interactions JSON
- created_at (datetime)
- last_accessed_at (datetime)
- expires_at (datetime)

Indexes
- cards(name)
- codices(owner_id)
- codices(expires_at)

## API Contract

Auth
- Routes follow TanStack Start conventions (no `/api` prefix).

Codices
- POST /codices
  - Auth required
  - Body: {"title":"My Codex","list":"4 Lightning Bolt\n..."}
  - Response: {"id":"abc123"}
- GET /codices/:id
  - Public
  - Refreshes last_accessed_at and expires_at
- GET /me/codices
  - Auth required

Codex response shape
- id
- title
- cards[] { name, qty, scryfall_id }
- keywords[] { keyword, count, cards[] }
- interactions[] { title, body }
- created_by { username }
- created_at
- last_accessed_at

## Decklist Normalization
- Accept lines matching: ^\s*(\d+)\s+(.+)$
- Trim whitespace, ignore blanks.
- Merge duplicates by case-insensitive card name.

## Scryfall Integration
- Use /cards/collection for bulk named lookups.
- Cache results in cards table; reuse cached payloads.

## Keyword Extraction
- Use Scryfall `keywords` array.
- Build a keyword index with counts and card references.

## Keyword data
- This static file maps keywords to their descriptions to be used in the codex: keywords/keyword-descriptions.json 
- Format TBD

## Expiration Policy
- On codex GET, update:
  - last_accessed_at = now
  - expires_at = now + 30 days
- Cleanup: on-the-fly deletion of expired codices.

## Frontend UX
- TanStack Start default route: "My Codices" list.
- "New Codex" button opens modal form (title + decklist).
- After creation, close modal and add codex to list; user can navigate to public codex page.
- Login screen available at `/login` and used for the current landing route; includes Google sign-in CTA.

## Frontend Guidelines
- React for UI components and pages.
- Styling via vanilla-extract (no CSS-in-JS runtime).
- Component base behavior/accessibility via react-aria (headless, no component libraries).
- Establish a design system with shared tokens (typography, color, spacing, radii, shadows, motion).
- Support mobile browsers; define breakpoints once initial screens inform them.
- Browser support: most recent major versions of Chrome, Firefox, Safari, Chrome Mobile, and Safari Mobile.

## Internationalization
- UI strings stored in a single locale file (English), structured for future locales.

## Framework and Deployment
- Framework: TanStack Start.
- Auth: Better Auth.
- Deployment: Nitro.
- Project layout: `src/` contains all frontend and backend code.
