# Chore Monster

## Introduction

Chore Monster is a C4G CS-6150 project for managing household chores with a website and database. Features include:

- Authentication with email/password and Google (2 test accounts provided)
- CI/CD which will deploy the application and DB to the [c4g.dev](https://c4g.dev) server using your applications sub-domain.
- A user management page for `ADMIN` users. Base roles are `ADMIN` and `STAFF`.
- More to come as we add common features we find useful across applications. We welcome student pull requests to add features!

  Feedback to improve Chore Monster or this README is most welcome!

## Getting Started

1. Make sure you have the following setup and configured on your computer:
   - [git](https://docs.github.com/en/get-started/getting-started-with-git/set-up-git) or [Github Desktop](https://desktop.github.com/download/)
   - [NodeJS](https://nodejs.org/en/download) - version 24 or higher
   - [pnpm](https://pnpm.io/installation) - Fast, disk space efficient package manager
   - [Docker](https://www.docker.com/get-started/)
2. Clone the repo using either SSH, HTTPS, or Github Desktop

- SSH

```bash
git clone git@github.com:theNEXlevel/chore-monster.git
```

- HTTPS

```bash
git clone https://github.com/theNEXlevel/chore-monster.git
```

3. Copy `.env.example` to `.env` and fill in the values for your environment. Do not commit `.env`.
4. Install all of the node dependencies with the following command

```bash
pnpm install
```

5. Make sure you have docker running and run the following command to initialize the database, apply all database schema, and seed some test users:

```bash
pnpm run init
```

6. If all is well up to this point your terminal should look like this:
   ![Initialization Successful](/documentation/init_success.png?raw=true 'Initialization Successful')
7. Next, run the development server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

8. You may login with either of the accounts below or with your own gmail account

| Username              | Password         | Role  |
| --------------------- | ---------------- | ----- |
| c4gdevad@gmail.com    | EHdqcGJajTAnSy$8 | ADMIN |
| c4gdevstaff@gmail.com | JCbSk3&&JF!h#m@x | STAFF |

9. To access the database you can run the following command in a new terminal:

```bash
pnpm exec prisma studio
```

It should open the browser automatically or you can open [http://localhost:5555/](http://localhost:5555/) to see the database tables.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Configuration

1. Set the `COOLIFY_APP_UUID` repository variable to the Chore Monster Coolify application.
2. Set up OAuth settings in [GCP](https://console.cloud.google.com/apis/credentials).
3. Setup nginx configuration, and re-run SSL cert on [C4G Server](https://c4g.dev).
4. Generate VAPID keys for PWA setup [Generator](https://vapidkeys.com/)
5. Generate RESEND key [Resend](https://resend.com/emails)

## Technologies Used

- [Nextjs](https://nextjs.org/) - framework
- [Typescript](https://www.typescriptlang.org/)
- [Tailwind](https://tailwindcss.com/) - css atomic classes
- [Prisma](https://www.prisma.io/) - db type ORM system
- [Prettier](https://prettier.io/) - formatter
- [ESLint](https://eslint.org/) - enforce rules / policies for maintable code
- [Husky](https://typicode.github.io/husky/) - allows for code changes during local commit
- [Lint-Staged](https://github.com/lint-staged/lint-staged) - lints code on only staged files with auto-fix
- [Docker](https://www.docker.com/) - containers
- [Postgres](https://www.postgresql.org/) - database
- [Github Actions](https://github.com/features/actions) - ci/cd process
- [Nginx](https://nginx.org/) - server hosting configuration / routing
- [Shadcn](https://ui.shadcn.com/) - UI component library
- [RadixUI](https://www.radix-ui.com/) - UI component library
- [Lucide-React](https://lucide.dev/guide/packages/lucide-react) - UI icons
- [Better Auth](https://better-auth.com/) - authentication with email/password and google
- [Ag-Grid](https://www.ag-grid.com/) - grid / table component
- [Resend](https://resend.com) - emails

If you want to contribute to Chore Monster, please open an issue or pull request. We welcome technologies that improve the experience for its users.

## Production Deployment

The application uses Docker Compose for production deployments with an automated migration workflow:

### Architecture

- **Database**: PostgreSQL 17 with persistent volume storage
- **Backup**: Init container that `pg_dump`s the database before migrations run,
  from the same image as the database
- **Migrations**: Init container that runs database migrations before the app
  starts, from the same image as the app
- **Application**: Next.js standalone server with optimized production build

### Image Publishing (CD)

`.github/workflows/publish.yaml` runs on every push to `main` (and on manual
dispatch). It builds one image, pushes it to GHCR, and then triggers a Coolify
deployment:

- `ghcr.io/thenexlevel/chore-monster:latest` and `:<commit-sha>`

`docker-compose.yml` references that published image and has **no `build:`
keys**, which is what keeps the shared Coolify host from compiling the
application on every deploy — it only pulls and restarts. The deploy is
triggered from the workflow rather than by Coolify's git webhook so that
Coolify cannot pull `:latest` before the new image has finished uploading.

### One image, both services

`chore-monster-migrations` and `chore-monster-app` run the **same image** with different
commands. The image ships the Prisma CLI (the `migrator` stage in `Dockerfile`
installs it on its own), so the migration step needs nothing extra:

```yaml
chore-monster-migrations:
  image: ghcr.io/thenexlevel/chore-monster:${IMAGE_TAG:-latest}
  command: ['node', '/node_modules/prisma/build/index.js', 'migrate', 'deploy']
```

The ordering guarantee is unchanged — the app still waits on
`service_completed_successfully`, so it starts only after migrations exit 0.

### Pre-migration backup

`prisma migrate deploy` is forward-only, so a bad migration has no way back.
`chore-monster-backup` runs `pg_dump -Fc` before `chore-monster-migrations`, using the
same chaining the app already relies on:

```
chore-monster-db (healthy) → chore-monster-backup → chore-monster-migrations → chore-monster-app
```

It uses the `postgres:17` image rather than the app image, so `pg_dump` is
version-matched to the server by construction and there is no client to keep in
sync. Dumps are verified with `pg_restore --list` and moved into place only
after passing, so a truncated file can never look like a good backup. They land
on the `chore-monster-backups` volume, pruned to the newest `BACKUP_KEEP` (default 10).

`BACKUP_MODE` controls it:

| Value                | Behaviour                                              |
| -------------------- | ------------------------------------------------------ |
| `required` (default) | A failed dump blocks migrations — the app never starts |
| `best-effort`        | Dumps, but migrates anyway if the dump fails           |
| `off`                | Never dumps                                            |

`required` needs no scripting to enforce: `chore-monster-migrations` waits on
`service_completed_successfully`, so a non-zero backup stops the chain. An
unrecognised `BACKUP_MODE` fails rather than silently downgrading.

> These dumps sit on the same host and disk as `chore-monster-db`. They protect
> against a bad migration, **not** against losing the machine. Add off-box
> backups separately if the data warrants it.

The migration tooling is installed with **npm**, not pnpm, and lands at
`/node_modules` rather than `/app/node_modules`. Both details are load-bearing:
pnpm's symlink farm does not survive a `COPY` between stages, and the Next.js
standalone output contains symlinked packages, so copying a directory over
`/app/node_modules` fails with `cannot copy to non-directory`. `/node_modules`
is the last place Node looks when resolving from `/app`, so `prisma.config.ts`
still finds `dotenv` and `prisma/config` while the application's own resolution
is untouched.

A previous version built a second image from a `Dockerfile.migrations` that ran
`pnpm install --prod` — pulling Next, React and every other runtime dependency
in order to run one command. That image was 1.63 GB to carry 94 kB of
migrations. Publishing one image instead cut the total pulled per deploy from
about 2 GB to 685 MB, and halved the number of GHCR packages to keep public.

Required repository/organization configuration:

| Name               | Kind     | Purpose                                       |
| ------------------ | -------- | --------------------------------------------- |
| `COOLIFY_TOKEN`    | secret   | Coolify API token (organization-level secret) |
| `COOLIFY_APP_UUID` | variable | UUID of the Coolify application to redeploy   |

The deploy step skips itself when either Coolify value is missing, so a copy of
this project publishes images without redeploying its own app.

The build itself needs no application secrets — see below.

### One image, many environments

Nothing environment-specific is baked into the image, so the same build can back
several Coolify applications. `IMAGE_TAG` selects which build each one runs:
leave it unset to track `latest`, or pin it to a commit SHA in the application's
Coolify environment variables to promote a build that has already been verified
elsewhere. **Adding a test environment later is therefore just a second Coolify
application pointed at this same compose file** — no repository changes, no
second image.

This requires that no `NEXT_PUBLIC_*` variable is present during the build.
Next.js substitutes those into the bundle only when they exist at build time, so
leaving them unset keeps `process.env.NEXT_PUBLIC_*` in the compiled server
output as a real runtime lookup, and each environment supplies its own value
through Coolify.

It works for `NEXT_PUBLIC_VAPID_PUBLIC_KEY` because that value is read
server-side only (`src/lib/web-push.ts`); the browser fetches the key from
`GET /api/notifications/subscribe` rather than reading an inlined copy. If
client code ever needs a `NEXT_PUBLIC_*` value directly it will be `undefined`
in the browser, and baking it in to fix that would re-tie the image to a single
environment — serve it from an API route or a server component prop instead.

### Deployment Commands

Pull the published image and start all services:

```bash
docker compose --profile production up -d
```

Build the image from source instead (local verification, and what CI does):

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml \
  --profile production up -d --build
```

Check service status:

```bash
docker compose ps
```

View logs:

```bash
# All services
docker compose logs

# Specific service
docker compose logs chore-monster-app
docker compose logs chore-monster-migrations
```

Stop services:

```bash
docker compose --profile production down
```

Clean shutdown with volume and orphan container removal:

```bash
docker compose --profile production down --volumes --remove-orphans
```

### Migration Workflow

1. **Database starts** and waits for healthy status
2. **Migration container** runs `prisma migrate deploy` and exits
3. **Application starts** only after migrations complete successfully

The migration container (`chore-monster-migrations`) runs once per deployment and automatically exits after completion. Docker Compose handles cleanup of stopped containers on subsequent deployments.

### Environment Variables

All required environment variables must be set in your `.env` file before deployment. See `.env.example` for the complete list. Key variables:

- `DATABASE_*`: PostgreSQL connection settings
- `AUTH_*` / `BETTER_AUTH_URL`: Better Auth configuration
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: Push notification keys
- `RESEND_API_KEY`: Email service configuration
