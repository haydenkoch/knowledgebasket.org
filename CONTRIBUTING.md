# Contributing

## Local setup

```sh
nvm use
pnpm install --frozen-lockfile
cp .env.local.example .env
pnpm dev
```

Use Node `24.14.0` and pnpm `10.32.1`.

## Quality gates

Before opening a pull request, run:

```sh
pnpm check
pnpm lint
pnpm build
```

Run targeted test commands when you touch the corresponding area, and prefer the full CI matrix before merging release-sensitive changes.

## Database changes

- Use `pnpm db:push` only for local iteration.
- Commit generated migrations for any schema-affecting change.
- Production and staging deploys must use committed migrations via `pnpm db:deploy`.

## Branch and PR workflow

- Open changes through pull requests.
- Expect protected branches to require review and passing CI.
- Keep PRs scoped so required checks stay readable and actionable.

## Repository conventions

- `.vscode/*`, `.cursor/mcp.json`, and similar workspace files are intentionally tracked to document the supported editor and MCP setup.
- Avoid committing real secrets or environment files.
- Do not force-push protected branches.
