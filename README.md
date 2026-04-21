# Safety Culture Reflection Assistant

Safety Culture Reflection Assistant is a presentation activity web app for internship seminars on OHS safety culture. Students scan a QR code, submit anonymised workplace observations, and the app turns them into structured discussion points for a shared class wall and presenter dashboard.

This project is built with Next.js App Router, TypeScript, Tailwind CSS, Supabase, the OpenAI JavaScript SDK, `qrcode.react`, and `lucide-react`. It is ready to deploy to Vercel as a standard Next.js app.

## What the app includes

- Student submission page at `/submit/[sessionCode]`
- Projector-friendly response wall at `/wall/[sessionCode]`
- Presenter dashboard at `/admin/[sessionCode]`
- Presentation Mode toggle on the presenter dashboard for a cleaner projector view
- Analysis route at `POST /api/analyse` with optional OpenAI support
- Admin moderation routes for hide/show, pin/unpin, delete, clear session, and demo data
- Supabase Realtime updates for the wall and presenter dashboard

## Scripts

The project uses the standard Next.js scripts expected by Vercel and by the Next.js deployment guide:

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`

Current `package.json` scripts are already suitable for Vercel. No extra deployment script is required.

## Environment Variables

Create a local `.env.local` file from `.env.local.example`. In Vercel, add the same variables in Project Settings > Environment Variables.

Only variables prefixed with `NEXT_PUBLIC_` are safe for browser code. `SUPABASE_SERVICE_ROLE_KEY` must stay server-side. `OPENAI_API_KEY`, when used, must also stay server-side.

| Variable | Required | Used by | Where it comes from |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Optional | Server only | OpenAI dashboard > API keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and server | Supabase project settings > Data API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser and server | Supabase project settings > API keys > anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Supabase project settings > API keys > service_role key |
| `NEXT_PUBLIC_APP_URL` | Yes | Browser and server | Your local URL for development and your public Vercel URL for deployment |

### Important notes

- `OPENAI_API_KEY` is optional. If it is missing, the app uses a built-in manual seminar analysis mode instead of calling the OpenAI API.
- If you do use `OPENAI_API_KEY`, it is read through `src/lib/server-env.ts` in server-only code paths. Do not prefix it with `NEXT_PUBLIC_`.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It must only be used in server route handlers and server-side helpers such as `src/lib/supabase/admin.ts`.
- `NEXT_PUBLIC_APP_URL` is used to generate QR links. Because `NEXT_PUBLIC_` variables are inlined at build time in Next.js, set it correctly in Vercel before each environment builds.
- `.env` files belong in the project root, not inside `src/`.
- In local development only, the app includes a fallback demo backend when the Supabase variables are missing. For a real seminar deployment, set the Supabase variables above. OpenAI is optional.

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create a Supabase project

1. Create a new project in Supabase.
2. Open Project Settings.
3. Copy the Project URL, anon key, and service role key.
4. Keep the service role key private.

### 3. Run `supabase-schema.sql`

1. Open the Supabase SQL Editor.
2. Paste the contents of `supabase-schema.sql`.
3. Run the script once.

This creates the `public.safety_responses` table, indexes, Row Level Security policies, and the SQL needed for Realtime publication.

### 4. Enable Supabase Realtime for `safety_responses`

The schema file already includes the SQL to add `public.safety_responses` to the `supabase_realtime` publication:

```sql
alter table public.safety_responses replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'safety_responses'
  ) then
    alter publication supabase_realtime add table public.safety_responses;
  end if;
end $$;
```

You can also confirm it in the Supabase dashboard by enabling Realtime for `public.safety_responses`.

### 5. Optional: Create an OpenAI API key

1. Open the OpenAI dashboard.
2. Create an API key.
3. Save it for `OPENAI_API_KEY` if you want real OpenAI analysis.

If you want a zero-cost presentation, skip this step and leave `OPENAI_API_KEY` unset. The app will use its built-in manual analysis mode instead.

### 6. Add `.env.local`

Copy `.env.local.example` to `.env.local` and replace the placeholder values:

```bash
cp .env.local.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

Use these values locally:

```env
OPENAI_API_KEY=sk-your-openai-api-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For a no-cost presentation setup, you can omit `OPENAI_API_KEY`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Run locally

```bash
pnpm dev
```

Open `http://localhost:3000`.

Before deploying, it is worth checking the production build locally too:

```bash
pnpm build
pnpm start
```

### 8. Deploy to Vercel

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. Import the project into Vercel.
3. Keep the framework preset as `Next.js`.
4. Set the root directory to the project root if prompted.
5. Add environment variables before the first production deploy.
6. Deploy.

This app should be deployed as a standard Next.js Node.js application. No static export is needed.

### 9. Add Vercel environment variables

In Vercel, go to Project Settings > Environment Variables and add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Add `OPENAI_API_KEY` only if you want live OpenAI analysis. Leave it unset to use the no-cost manual analysis mode.

Recommended values:

- `NEXT_PUBLIC_APP_URL` in Production: `https://your-project.vercel.app` or your custom domain
- `NEXT_PUBLIC_APP_URL` in Preview: your preview deployment URL if you want QR codes to point at previews
- `NEXT_PUBLIC_APP_URL` in Development: `http://localhost:3000`

## Seminar Workflow

### How to create a session code

There is no separate session-creation screen in this MVP. Pick a short, memorable code such as `OHS2026`, `WEEK8`, or `SEMINAR-A`.

Recommended format:

- uppercase letters
- numbers
- short hyphenated codes if needed

The session starts as soon as you open a route that includes that code, for example `/admin/OHS2026`.

### How to open the admin dashboard

Open:

```txt
/admin/[sessionCode]
```

Example:

```txt
http://localhost:3000/admin/OHS2026
```

The admin dashboard shows the QR code, presenter timer, response summary, moderation controls, and session tools such as `Load demo responses` and `Clear session`.

Use `Presentation mode` on the dashboard when you want a cleaner projector view with a larger QR code, response count, timer, and wall shortcut.

### How students use the QR code

1. Open the admin dashboard for your chosen session code.
2. Show the QR code on the projector.
3. Students scan the QR code on their phones.
4. They land on `/submit/[sessionCode]`.
5. They enter one anonymised observation and submit it.
6. The analysed response appears on the shared wall and presenter dashboard.

You can also share the plain student link shown under the QR code.

### How to clear responses after the seminar

From the admin dashboard:

1. Open `/admin/[sessionCode]`
2. Click `Clear session`
3. Confirm the dialog

This removes all responses for that session.

You can also clear a session through the API:

```txt
DELETE /api/sessions/[sessionCode]/clear
```

## Operational Notes

- The public wall never displays `original_observation`.
- The student flow warns users not to include names, company names, exact locations, or confidential details.
- This app is for educational discussion only. It is not a formal safety reporting channel.
- If `OPENAI_API_KEY` is not configured, the app still works in manual seminar mode using a built-in heuristic analysis.
- For this MVP, keep the admin URL private. The presenter dashboard and moderation routes are not yet authenticated.
