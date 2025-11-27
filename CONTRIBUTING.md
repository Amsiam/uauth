# Contributing to Universal Auth SDK

Thank you for your interest in contributing to Universal Auth SDK!

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+ (for backend development)
- Git

### Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/amsiam/@uauth/core.git
cd @uauth/core
```

2. Install dependencies:

```bash
npm install
```

3. Build packages:

```bash
npm run build
```

## Project Structure

```
@uauth/core/
├── packages/
│   ├── core/           # Core SDK (TypeScript)
│   ├── react/          # React hooks & components
│   └── server/         # Server-side utilities
├── backends/
│   └── fastapi/        # FastAPI reference implementation
├── examples/
│   └── react-vite/     # Example applications
└── tests/              # Test suites
```

## Development Workflow

### Working on Core SDK

```bash
cd packages/core
npm run dev  # Watch mode
```

### Working on React Package

```bash
cd packages/react
npm run dev  # Watch mode
```

### Testing the Backend

```bash
cd backends/fastapi
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

### Running the Example

```bash
cd examples/react-vite
npm run dev
```

## Making Changes

### Code Style

- Use TypeScript for all JavaScript/TypeScript code
- Follow the existing code style
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code

### Commit Messages

Use conventional commits:

```
feat: add OAuth2 plugin
fix: resolve token refresh race condition
docs: update API documentation
test: add unit tests for storage adapter
```

### Testing

Before submitting a PR:

```bash
# Run tests
npm test

# Run linter
npm run lint

# Build all packages
npm run build
```

## Types of Contributions

### Bug Reports

Use GitHub Issues with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, versions)

### Feature Requests

Use GitHub Issues with:
- Clear description of the feature
- Use case / problem it solves
- Proposed API (if applicable)

### Code Contributions

1. Check existing issues or create one
2. Fork the repository
3. Create a feature branch: `git checkout -b feat/my-feature`
4. Make your changes
5. Add tests if applicable
6. Update documentation
7. Commit with conventional commit messages
8. Push and create a Pull Request

### Documentation

- Fix typos, clarify examples
- Add new examples or tutorials
- Improve API documentation
- Translate documentation

### Backend Implementations

We welcome reference implementations in other frameworks:

- Django (Python)
- Express (Node.js)
- Go (net/http)
- Rails (Ruby)
- Laravel (PHP)

Follow the REST contract specification in `agen.md`.

## Pull Request Process

1. Update the README.md if needed
2. Update documentation for API changes
3. Add tests for new features
4. Ensure all tests pass
5. Request review from maintainers

### PR Checklist

- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No breaking changes (or clearly documented)
- [ ] Builds successfully

## Backend Contribution Guidelines

When implementing a new backend:

1. Implement all 5 required endpoints
2. Follow the standard response format
3. Include security best practices
4. Provide comprehensive README
5. Include Docker setup (optional but recommended)
6. Add to the main README comparison table

## Plugin Development

To create a plugin:

1. Follow the plugin interface in `packages/core/src/types.ts`
2. Add documentation
3. Include usage examples
4. Submit to `packages/plugins/`

Example:

```typescript
export const myPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  install({ client, core, sdk }) {
    // Add functionality
  }
}
```

## Questions?

- Open a GitHub Discussion
- Join our Discord (coming soon)
- Check existing issues

## Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Focus on constructive feedback
- No harassment or discrimination

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Universal Auth SDK! 🎉
