# CI/CD Documentation

## Overview

KidsKalender uses GitHub Actions for continuous integration. The CI pipeline runs automatically on:
- Pull requests to `master`
- Pushes to `master`

## CI Workflow

The CI workflow (`.github/workflows/ci.yml`) performs the following steps:

1. **Checkout code** - Retrieves the repository code
2. **Setup Node.js 20** - Installs Node.js matching our `engines` requirement
3. **Install dependencies** - Runs `npm ci` for clean, reproducible installs
4. **Lint** - Runs ESLint across all workspaces
5. **Typecheck** - Runs TypeScript compiler in noEmit mode
6. **Build** - Compiles all workspaces (shared → api → web)
7. **Test** - Runs Vitest test suites

## Test Behavior in CI

The test suite is designed to run in CI environments without external dependencies:

- **No database required**: Tests detect when `DATABASE_URL` is not set and skip database-dependent tests
- **Session secret**: Provided via `SESSION_SECRET` environment variable
- **Test isolation**: Each test suite cleans up its own test data

When you see "PostgreSQL niet beschikbaar — API-integratietests overgeslagen" in CI logs, this is expected behavior. Database integration tests require a running PostgreSQL instance and are skipped in CI.

### Running Tests Locally with Database

To run the full test suite including database tests:

```bash
# 1. Start the development database
docker compose -f docker-compose.dev.yml up -d

# 2. Run migrations
npm run db:migrate

# 3. Run tests
npm test
```

## Required Secrets

Currently, **no GitHub secrets are required** for the CI workflow to pass. All necessary environment variables are provided inline in the workflow file.

### Future Secrets (if needed)

If you add features requiring external services (e.g., email, cloud storage), you'll need to configure GitHub repository secrets:

**Setting secrets:**
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add the secret name and value

**Using secrets in workflows:**
```yaml
env:
  SECRET_NAME: ${{ secrets.SECRET_NAME }}
```

## Local Commands Mirroring CI

Run these commands locally to verify your changes before pushing:

```bash
# Install dependencies (clean install like CI)
npm ci

# Lint all workspaces
npm run lint

# Typecheck all workspaces
npm run typecheck

# Build all packages
npm run build

# Run tests
npm test
```

### Individual Workspace Commands

```bash
# Lint only the web app
npm run lint -w @kids-calendar/web

# Typecheck only the API
npm run typecheck -w @kids-calendar/api

# Test only the web app
npm run test -w @kids-calendar/web
```

## Fixing CI Failures

### Lint Errors
```bash
npm run lint
# Fix auto-fixable issues:
npm run lint -- --fix
```

### Type Errors
```bash
npm run typecheck
# Fix issues in the reported files
```

### Build Errors
```bash
npm run build
# Check for syntax errors or missing dependencies
```

### Test Failures
```bash
npm test
# Run with watch mode for debugging:
npm test -- --watch
```

## CI Workflow Maintenance

### Updating Node Version

If you update the Node.js version requirement:

1. Update `engines.node` in `package.json`
2. Update `node-version` in `.github/workflows/ci.yml`

### Adding New Workspaces

The CI workflow automatically includes new workspaces through the root-level `npm run lint`, `npm run typecheck`, etc. commands. Ensure new workspaces have these scripts defined in their `package.json`.

### Adding Database Tests to CI

To run full integration tests in CI, add a PostgreSQL service to the workflow:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: kidscalendar
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: kidscalendar_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

Then add to the test step:
```yaml
env:
  DATABASE_URL: postgresql://kidscalendar:test_password@localhost:5432/kidscalendar_test
```

## Troubleshooting

### "npm ci" fails with lockfile mismatch
Run `npm install` locally and commit the updated `package-lock.json`.

### Cache issues
GitHub Actions caches `node_modules` based on `package-lock.json`. If you suspect cache issues, manually clear the cache in repository Settings → Actions → Caches.

### Flaky tests
Tests that fail intermittently should be investigated and fixed. Consider increasing timeouts or improving test isolation.

## Future Enhancements

Potential CI improvements to consider:

1. **Parallel jobs** - Split lint/test/build into separate jobs for faster feedback
2. **Matrix testing** - Test against multiple Node versions
3. **Code coverage** - Add coverage reporting with tools like Codecov
4. **Deployment** - Add CD steps for automated deployment
5. **Docker builds** - Build and validate Docker images in CI
6. **E2E tests** - Add Playwright or Cypress for end-to-end testing
