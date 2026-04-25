# Minerva

Minerva is a local AI app builder built on Electron, React, and TypeScript. It gives you a desktop workspace for generating, editing, previewing, versioning, and deploying apps with your own model and platform credentials.

Unlike a hosted SaaS workflow, Minerva keeps the editor on your machine and lets you bring your own API keys for providers such as OpenAI, Anthropic, Google, GitHub, and Vercel.

## Highlights

- Desktop-first app building workflow for Windows and macOS
- Local project editing, file management, and live preview
- Multi-provider AI model support
- GitHub integration for repository sync and auth flows
- Vercel deployment support
- Visual editing and agent-assisted development workflows

## Stack

- Electron
- React 19
- TypeScript
- TanStack Router
- TanStack Query
- Drizzle ORM
- SQLite
- Vite

## Getting Started

### Requirements

- Node.js `>=24`
- npm

### Install dependencies

```sh
npm install
```

### Set up environment variables

Copy `.env.example` to `.env` and fill in only the keys you need.

Typical variables include:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SERPER_API_KEY`
- `JINA_API_KEY`

`.env` is ignored by git and should never be committed.

### Run in development

```sh
npm start
```

If you want a standard development launch with `NODE_ENV=development`, you can also run:

```sh
npm run dev
```

## Common Commands

```sh
# format
npm run fmt

# lint
npm run lint

# type-check
npm run ts

# unit tests
npm test

# package the app
npm run package

# create installers / distributables
npm run make

# build packaged app for e2e
npm run build
```

## Testing

### Unit tests

```sh
npm test
```

### E2E tests

E2E runs against the packaged app, so rebuild first whenever application code changes:

```sh
npm run build
npm run e2e
```

Run a single test file:

```sh
npm run e2e e2e-tests/context_manage.spec.ts
```

## Development Notes

- Use your own GitHub OAuth app if you want GitHub authorization screens and app ownership to reflect your own branding.
- Web search and web fetch tool credentials are loaded from environment variables instead of hardcoded secrets.
- Branding assets such as the app icon, installer icon, and scaffold favicon live under `assets/` and `scaffold/public/`.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md) before making changes.

To enable local pre-commit hooks once:

```sh
npm run init-precommit
```

Recommended checks before committing:

```sh
npm run fmt
npm run lint
npm run ts
```

## License

- Code outside [`src/pro`](./src/pro) is licensed under Apache 2.0. See [LICENSE](./LICENSE).
- Code inside [`src/pro`](./src/pro) is licensed under the Functional Source License. See [src/pro/LICENSE](./src/pro/LICENSE).
