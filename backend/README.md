# Pawly backend

The backend is split into two services:

- `php-api` owns REST endpoints and MongoDB persistence. Cloudinary is configured as the media storage provider.
- `realtime-node` provides the Socket.IO transport for future live messaging and notifications.

## Local development

Install Docker Desktop, then copy the example environment files:

```sh
cp php-api/.env.example php-api/.env
cp realtime-node/.env.example realtime-node/.env
```

Edit `php-api/.env` before starting:

- Replace both occurrences of `URL_SAFE_APP_PASSWORD` with the same URL-safe random password; use only letters, numbers, `_`, and `-` so it can safely appear in the MongoDB URI.
- Replace `URL_SAFE_ROOT_PASSWORD` and the superadmin password with separate strong random values.
- Set `APP_ORIGIN` to the exact browser origin. For the Compose frontend this is `http://localhost:8081`; when using Vite directly it is `http://localhost:5173`.
- Configure Google OAuth and Cloudinary credentials if those features are enabled.

Start all services from this directory:

```sh
npm install
npm run dev:all
```

The frontend is at `http://localhost:8081`. The PHP API health endpoint is available locally at `http://127.0.0.1:8080/api/health`; it and the realtime service are bound to loopback for local development. When using Vite directly, its development proxy targets the PHP API on port 8080 and the realtime service on port 3001. Vite may use port 5174 (or another port) if its default 5173 port is occupied; the realtime service permits loopback origins only when `APP_ENV` is not `production`.

`npm run dev` starts MongoDB and the PHP API without the frontend container. `npm run dev:realtime` runs the realtime service directly in Node.

MongoDB requires authentication, creates a least-privilege application user on first initialization, and is not published on a host port. The PHP API connects with `MONGODB_URI`; for a managed MongoDB service, replace it with that provider's authenticated URI and configure network access there. Never commit `.env` or put secrets in frontend variables.

## Production deployment

Build and start the complete stack with `npm start` from `backend/`. It builds the frontend and services, then runs Compose in the background. The frontend container serves the Vite build and proxies `/api` to PHP and `/socket.io` to the realtime service on the private Compose network. The API is bound to loopback only, while MongoDB and realtime are not published to the host.

Before deploying:

1. Set `APP_ENV=production`, `APP_ORIGIN` to `https://petwebs.web.app`, `API_ORIGIN` to the public Render API origin, `GOOGLE_REDIRECT_URI` to `API_ORIGIN/api/auth/google/callback`, and `SESSION_SAME_SITE=None` because Firebase and Render are separate sites.
2. Generate three different passwords with `openssl rand -hex 32` (one each for `MONGODB_PASSWORD`, `MONGO_INITDB_ROOT_PASSWORD`, and `SUPERADMIN_PASSWORD`). The MongoDB passwords are URL-safe hex, so use the exact same application username and password in `MONGODB_URI` as in `MONGODB_USERNAME` and `MONGODB_PASSWORD`. Set every required value in `php-api/.env`, including real Google and Cloudinary credentials. The example intentionally leaves superadmin and Cloudinary credentials blank; admin sign-in and media uploads will not work until configured. Do not use example-file values as credentials.
3. Terminate TLS at a trusted load balancer or reverse proxy in front of the frontend container. Keep the PHP API's loopback-only host port, MongoDB, and realtime service inaccessible from the public internet.
4. Back up the MongoDB and PHP session volumes. The session volume preserves sign-ins across a container restart; run a single PHP API instance unless sessions are moved to shared storage.
5. For an existing MongoDB volume created before authentication was enabled, schedule a backed-up migration before using this Compose configuration: Mongo initialization scripts only run on a fresh data directory.

Run `npm run deploy:check` from `backend/` after configuring the file; it verifies the production origin, callback URL, credential strength/consistency, and loopback-only binding without printing secrets. `npm start` runs the same preflight before building and starting Compose. The check intentionally rejects local-development values until real production settings are supplied; it cannot verify the external DNS/TLS, OAuth console, Cloudinary account, firewall, or backup configuration.

Compose reads `php-api/.env` for interpolation through the npm scripts. If invoking Compose directly, pass it explicitly with `docker compose --env-file ./php-api/.env ...`. The `PAWLY_BIND_ADDRESS` variable defaults to `127.0.0.1`; keep it loopback-only when TLS terminates at a reverse proxy on the same host. The `PAWLY_PORT`, `PHP_API_PORT`, and `REALTIME_PORT` variables control the frontend, loopback-only API, and loopback-only realtime host ports, respectively. Defaults are 8081, 8080, and 3001.

## Service development without Docker

The PHP API requires PHP 8.2+, Composer, and the PHP MongoDB extension. From `php-api`, run `composer install` and `php -S 127.0.0.1:8080 -t public public/index.php`.

The realtime service requires Node.js 20+. The root npm workspace installs and runs it from `backend/`; alternatively, use `npm install` and `npm run dev` inside `realtime-node`.

The frontend reads public posts and active providers from the PHP API. It uses `/api` by default; Vite proxies this path during development and the production Nginx container proxies it to PHP. Never expose Cloudinary API secrets in frontend code.

## Google sign-in

Google sign-in uses the PHP API's OAuth authorization-code flow. In Google Cloud Console, configure an OAuth web client with the frontend origin (for local development, `http://localhost:5173`) and the exact redirect URI in `php-api/.env` (`GOOGLE_REDIRECT_URI`). Copy the client ID and client secret into the ignored `php-api/.env` file as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; do not put the client secret in frontend configuration or commit it. The callback saves/updates the user in the configured MongoDB `USERS_COLLECTION` and keeps the login in a server-side PHP session.

`APP_ORIGIN` must exactly match `https://petwebs.web.app`. `API_ORIGIN` is the Render API origin and must be used for the Google callback. Because Firebase and Render are separate sites, set `SESSION_SAME_SITE=None` and serve both over HTTPS so the browser will send the session cookie. The `/api/auth/me` route returns `{"user": null}` with HTTP 200 when signed out, or the current user when signed in. `/api/auth/logout` ends the session.

Email/password sign-up and sign-in use `/api/auth/register` and `/api/auth/signin`. Provider sign-up requires a care type and supported country, stored on the user account and as a pending provider application in `PROVIDERS_COLLECTION`; pet-owner sign-up does not require these fields. The application includes the provider's name, email, care type, and country, and remains hidden from the public directory until approved. Provider profile-picture uploads also update the associated provider listing. Passwords are stored as PHP password hashes, account emails are normalized and unique, and successful authentication uses the same server-side session as Google sign-in. Google sign-in links to an existing account with the same verified email.

Signed-in users can update their profile picture with a multipart `POST /api/auth/profile-picture` request containing an image file in the `picture` field. JPEG, PNG, WebP, and GIF files up to 2 MB are stored in Cloudinary and the account’s MongoDB record; user-selected pictures are preserved during later Google sign-ins.

Signed-in users can publish a post with a multipart `POST /api/posts` request containing `text`, an optional `pet`, and up to five `media[]` files. Captions are limited to 2,000 characters; supported JPEG, PNG, WebP, GIF, MP4, WebM, and MOV media is uploaded to Cloudinary (3 MB per file, 40 MB total). The published post and Cloudinary media URLs are saved to the configured MongoDB `POSTS_COLLECTION` and become available from `GET /api/posts`.

Pets are private to their owner. Authenticated `GET /api/pets` returns only the signed-in user's pets, and multipart `POST /api/pets` creates a pet owned by the authenticated account. Optional JPEG, PNG, WebP, or GIF pet photos up to 2 MB are stored in Cloudinary; pet documents are saved to `PETS_COLLECTION` (default `pets`) with the server-derived `userId`. Clients cannot choose or change the owner ID.

Authenticated `GET /api/account-data` and `PUT /api/account-data` read and save the signed-in user's provider favorites, followed accounts, notifications, conversations, and provider service drafts. The server derives ownership from the session, validates the record shapes, and limits updates to 1 MB. Account data is stored in `ACCOUNT_DATA_COLLECTION` (default `account_data`), separate from public posts and provider records. Provider service drafts are private to that account and are not yet published in the public provider directory. Appointment changes use the dedicated authenticated API described below.

Authenticated `GET /api/followers` returns both the signed-in user's followers and the accounts they follow for the matching Followers/Following tabs. `POST /api/follows` adds or removes a follow relationship using a target user ID and desired follow state. Relationships are stored in `FOLLOWS_COLLECTION` (default `follows`); profile responses contain only public profile details. Existing handle-based follow lists in account data are included when building both lists.

Appointments are stored in `APPOINTMENTS_COLLECTION` (default `appointments`). Authenticated `GET /api/appointments` lists appointments for the signed-in owner or provider; `POST /api/appointments` books a pet the owner owns with an active provider; and `PATCH /api/appointments/{id}` validates status changes by participant role and supports owner rescheduling. Providers publish dated time slots using `GET`/`PUT /api/providers/availability`; active provider slots are visible at `GET /api/providers/{providerId}/availability`. Booking, rescheduling, status changes, and availability edits serialize through `PROVIDER_BOOKING_LOCKS_COLLECTION` (default `provider_booking_locks`) to prevent concurrent overlap races. Booking and rescheduling must use a published slot; reserved slots are released when an appointment is rescheduled or reaches a terminal status. Legacy owner appointments are imported when this endpoint is first loaded. New appointments retain an ISO-8601 `scheduledAt` value.

Medical records are private to each pet's owner. `GET /api/pets/{petId}/medical-records` lists records; `POST` creates a vaccination, medication, allergy, or vet-visit record with an optional due date; and `DELETE /api/pets/{petId}/medical-records/{recordId}` removes one. Records are stored in `MEDICAL_RECORDS_COLLECTION` (default `medical_records`) and ownership is checked against the authenticated pet. The `reminder-worker` Compose service checks every minute and adds persistent in-app reminders for due medical care and confirmed appointments within 24 hours. Rescheduling or cancelling an appointment clears its stale reminder, and deleting a medical record clears its due-date reminder.

`GET /api/search?q=...` returns public people, active providers, and published public posts matching a 2–80 character query. People results contain only public profile fields. Provider reviews are appointment-verified: `POST /api/providers/{providerId}/reviews` requires the signed-in owner to have a completed appointment with that provider, and submitted reviews remain hidden pending moderation. `GET` on the same route returns approved reviews only. Admins can review the queue with `GET /api/admin/reviews` and approve or reject a review with `POST /api/admin/reviews`.

The Community hub provides public `GET /api/lost-found` and `GET /api/adoptions` search results, with authenticated creation for lost/found alerts and active provider adoption listings. Pet owners can submit an adoption application at `POST /api/adoptions/{listingId}/applications`. Authenticated `GET`, `POST`, and `DELETE /api/saved-posts` manage per-user post collections. `LOST_FOUND_COLLECTION`, `ADOPTIONS_COLLECTION`, `ADOPTION_APPLICATIONS_COLLECTION`, `SAVED_POSTS_COLLECTION`, and `PROVIDER_AVAILABILITY_COLLECTION` can override the corresponding default collection names. The community interface supports English, Spanish, and French, keyboard focus indicators, a skip link, and reduced-motion preferences.

## Public data contract

`GET /api/posts` reads the `posts` collection where `visibility` is `public` and `status` is `published`. Documents should include `name`, `handle`, `time`, `text`, `likes`, `comments`, and `avatar`; `pet`, `image`, `imageAlt`, `liked`, and `provider` are optional.

`GET /api/providers?countryCode=NG` reads the `providers` collection where `status` is `active`, optionally filtered by `countryCode`. Documents should include `name`, `type`, `rating`, `location`, `countryCode`, `image`, and `price`; `verified` is optional.

The API maps MongoDB `_id` to the string `id` field. Public posts remain shared with signed-out visitors; each published post is attributed to its author. Pet records and account data are returned only to their authenticated owner.

## Admin dashboard

Admin sign-in issues a random bearer token whose SHA-256 hash is stored in `admin_sessions`; tokens expire after eight hours. Every dashboard request is authenticated by that stored session, and suspended admin accounts cannot use existing sessions.

`GET /api/admin/dashboard` returns live users, admin projects, providers awaiting verification, open reports, and admin accounts from MongoDB. Pending reviews are fetched separately from `GET /api/admin/reviews` when the review moderation section is opened. Provider applications include their registered email, care type, country, and submitted license number when available. Approving an application publishes it to the public provider directory and marks it verified. Collections are `USERS_COLLECTION` (`users`), `PROJECTS_COLLECTION` (`admin_projects`), `PROVIDERS_COLLECTION` (`providers`), `REPORTS_COLLECTION` (`reports`), `REVIEWS_COLLECTION` (`provider_reviews`), and the `admin_accounts` collection. `GET /api/admin/data?resource={resource}&page={page}` provides authenticated, read-only, paginated access to the application records shown in the admin Database records section. Supported resources cover users, providers, pets, medical records, appointments, private account data, conversations and messages, follows, posts, reviews, reports, projects, lost-and-found alerts, adoptions and applications, saved posts, provider availability, and admin accounts. Page size is capped at 25 records (one for private account-data documents and ten for posts); each successful read is recorded in `ADMIN_DATA_ACCESS_AUDIT_COLLECTION` (default `admin_data_access_audit`). Responses use field allowlists and omit credentials, password hashes, session tokens, and secret fields. The configured superadmin is included in the team list without storing its password in MongoDB.

`POST /api/admin/profile/avatar` stores the authenticated administrator's profile picture in `admin_profiles`. Uploads must be valid PNG, JPEG, or WebP images no larger than 4 MB.

Authenticated admin actions persist project creation and status changes, user suspension/restoration, provider verification decisions, report dismissal/post removal, admin account creation, and admin account status changes. Project creation and admin account/team management require a superadmin session. New admin accounts must change their temporary password at first sign-in.

## Current scope

The PHP API includes a MongoDB-backed health check, public posts/providers/search/review reads, Google and email/password authentication with server-side sessions and MongoDB user records, private pet medical records and account-data storage, authenticated admin dashboard and review moderation endpoints, and a Cloudinary storage adapter. The Node service authenticates sockets through the PHP session and relays membership-checked message events; PHP remains authoritative for conversation persistence and notifications. Appointment and medical reminders are persisted by the Compose reminder worker and appear in the in-app notification center.
