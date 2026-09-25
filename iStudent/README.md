# iStudent

iStudent is a production-oriented personal school and study operating system. New accounts start completely clean: the application never inserts demo subjects, exams, tasks, files, scores, or study sessions.

## What is included

- Supabase email/password authentication, verification, password reset, sessions, protected routes, and account deletion
- Four-step personalised onboarding with subjects, grade, school system, goals, and study preferences
- Data-driven home dashboard with intentional empty states
- Manual subjects, tasks, study sessions, weekly timetable, and exams
- Private document upload and management for PDF, PowerPoint, Word, TXT, JPG, and PNG files up to 25 MB
- Quiz, flashcard, mock-exam, summary, study-plan, and tutor configuration experiences with an explicit disabled-AI state
- Light, dark, and system themes saved to the account
- Database-backed notifications, achievements structure, usage counters, and Free/Plus/Pro subscription records
- Stripe test-mode Checkout and webhook architecture
- Responsive desktop, tablet, and mobile layouts

## Architecture

The React/Vite frontend is deployed to Vercel. Supabase provides PostgreSQL, authentication, Row Level Security, and a private Storage bucket. Vercel functions validate Supabase access tokens before handling account deletion, AI service requests, or Stripe Checkout.

All application records include a `user_id` (or use the auth user as the primary key). The included migration enables RLS and restricts every query to `auth.uid()`. Subscription changes are protected from browser updates and are written only by the server webhook.

AI entry points live in `src/services/ai.js` and `/api/ai.js`. The API currently returns `AI_NOT_ENABLED` and makes no OpenAI request. `OPENAI_API_KEY` is a server-only placeholder for the next phase.

## Local setup

1. Create a Supabase project.
2. Install the Supabase CLI and link the project, or run the SQL in `supabase/migrations/202609250001_initial.sql` from the Supabase SQL editor.
3. In Supabase Authentication, enable email/password sign-in and email confirmation.
4. Add local and production URLs to Authentication → URL Configuration:
   - `http://localhost:5173/auth/verify`
   - `http://localhost:5173/auth/reset`
   - the equivalent production URLs
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

Set all variables from `.env.example` in the Vercel project. `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, and the future `OPENAI_API_KEY` must remain server-only.

For Stripe test mode:

1. Create Plus and Pro recurring test prices and add their IDs.
2. Add a webhook endpoint at `https://YOUR_DOMAIN/api/stripe/webhook`.
3. Subscribe to `checkout.session.completed` and `customer.subscription.*` events.
4. Add the test webhook signing secret.
5. Keep `STRIPE_SECRET_KEY` on an `sk_test_` key. Checkout refuses non-test keys in this build.

## Deployment status

The repository builds successfully and is Vercel-compatible. It is not deployed from this workspace because production Supabase and Stripe credentials/project access are intentionally not available here.
