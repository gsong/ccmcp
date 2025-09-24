# Project Instructions

## Package Management

- This project uses **pnpm** as the package manager
- Use `pnpm install`, `pnpm run`, `pnpm add`, etc. instead of npm or yarn commands

## Agent Usage

- Always use the **github-project-manager** agent when working with `gh project` commands

## Important Scripts

### Development & Testing

- `pnpm run dev` - Run the CLI in development mode using tsx
- `pnpm run test` - Run all test files in src/**tests**

### Code Quality

- `pnpm run fix` - Run all fixes (lint:fix, format, type-check) in sequence

### Building & Publishing

- `pnpm run build` - Build the project (lint, type-check, compile)

### Release Management

- `pnpm run release:patch` - Create a patch release (x.x.1)
- `pnpm run release:minor` - Create a minor release (x.1.0)
- `pnpm run release:major` - Create a major release (1.0.0)
