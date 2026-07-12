# Deploy the dashboard to Cloudflare Pages

The dashboard is built locally and deployed from `dashboard/`. A human must authenticate Cloudflare before the first deploy.

## Prerequisites

1. Confirm the repository has at least one Git commit. Wrangler reads Git metadata during a Pages deploy and can fail in a repository with no commits.
2. Authenticate interactively:

   ```sh
   npx wrangler login
   ```

3. Confirm `dashboard/.env.local` contains the live Convex deployment URL:

   ```text
   VITE_CONVEX_URL=https://fleet-alligator-631.eu-west-1.convex.cloud
   ```

## Build and deploy

Run these commands from the repository root:

```sh
cd dashboard
npm ci
npm run build
npx wrangler pages deploy dist --project-name=dentassist --branch=main
```

Do not run `wrangler login` in CI. Configure a Cloudflare API token and account ID there instead.

## Gotchas

### Repository with no commits

Wrangler inspects the current Git commit to attach deployment metadata. In a new local repository with no commits, create the initial commit before deploying. Do not work around this by disabling Git or copying `dist/` into an untracked temporary repository.

### Redirected configuration

Cloudflare may report that the Pages project's dashboard configuration is being redirected or downloaded for the deploy. The generated state belongs under `.wrangler/`, which is ignored by the repository. Do not commit redirected or generated Wrangler configuration. Continue to treat the Cloudflare Pages dashboard as the source of truth unless the project deliberately adopts a checked-in Wrangler configuration later.

### Uncommitted changes

A deploy can include a build from uncommitted source. Check `git status --short` before deploying and deploy only from the intended committed revision. The deploy command does not create a Git commit.
