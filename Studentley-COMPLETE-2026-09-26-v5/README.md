# Studentley

Studentley is a production-oriented personal school and study operating system. New accounts start completely clean: the application never inserts demo subjects, exams, tasks, files, scores, or study sessions.

## What is included

- Supabase email/password authentication, verification, password reset, sessions, protected routes, and account deletion
- Four-step personalised onboarding with subjects, grade, school system, goals, and study preferences
- Data-driven home dashboard with intentional empty states
- Manual subjects, tasks, study sessions, weekly timetable, and exams
- Private document upload and management for PDF, PowerPoint, Word, TXT, JPG, and PNG files up to 25 MB
- OpenAI-powered personal assistance, workspace actions, document analysis, summaries, timetable/exam extraction, quizzes, flashcards, mock exams, progress insights, and personalized study plans
- A multiplayer leaderboard, study streaks, and server-awarded Studentley Points for sessions, quizzes, and mock exams
- Light, dark, and system themes saved to the account
- Database-backed notifications, achievements structure, usage counters, and Free/Plus/Pro subscription records
- Stripe Checkout, signed/idempotent webhooks, immediate post-checkout sync, and a customer billing portal
- Responsive desktop, tablet, and mobile layouts

## Architecture

The React/Vite frontend is deployed to Vercel. Supabase provides PostgreSQL, authentication, Row Level Security, and a private Storage bucket. Vercel functions validate Supabase access tokens before handling account deletion, AI service requests, or Stripe Checkout.

All application records include a `user_id` (or use the auth user as the primary key). The included migration enables RLS and restricts every query to `auth.uid()`. Subscription changes are protected from browser updates and are written only by the server webhook.

AI entry points live in `src/services/ai.js` and `/api/ai.js`. The Vercel function authenticates the Studentley user, verifies ownership of selected records, creates short-lived private document URLs, and calls the OpenAI Responses API. Requests use structured outputs and set `store: false`, so the response is not retained as Responses API application state. Generated workspace records are written server-side.

## Local setup

1. Create a Supabase project.
2. Install the Supabase CLI and link the project, or run the migrations in filename order. Existing projects must run `supabase/migrations/202609260004_payments_points_leaderboard.sql` for billing persistence, points, streaks, and the leaderboard.
3. In Supabase Authentication, enable email/password sign-in and email confirmation.
4. Add local and production URLs to Authentication → URL Configuration:
   - Set **Site URL** to `https://www.studentley.com`
   - `http://localhost:5173/auth/verify`
   - `http://localhost:5173/reset-password`
   - `https://www.studentley.com/auth/verify`
   - `https://www.studentley.com/reset-password`
5. Copy `.env.example` to `.env.local` and fill in the Supabase values.
6. Install and run:

```bash
pnpm install
pnpm dev
```

Create a production build with:

```bash
pnpm build
```

## Vercel configuration

Set the Supabase and Stripe variables in the Vercel project. The AI function accepts `OPENAI_API_KEY` (recommended) and the existing `iStudent_Key_OpenAi` name. The key and `SUPABASE_SERVICE_ROLE_KEY` must remain server-only. `OPENAI_MODEL` is optional and defaults to `gpt-5-mini`.

For Stripe test or live mode:

1. Create Plus and Pro recurring prices and add their IDs.
2. Add a webhook endpoint at `https://www.studentley.com/api/stripe/webhook`.
3. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
4. Add the webhook signing secret from the same Stripe mode as the secret key and price IDs.
5. Optionally set `STRIPE_PORTAL_CONFIGURATION_ID`; otherwise Studentley creates and keeps its billing portal configuration current.

## Deployment status

The repository builds successfully and is Vercel-compatible. It is not deployed from this workspace because production Supabase and Stripe credentials/project access are intentionally not available here.
