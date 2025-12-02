# GitHub Actions Workflows

This directory contains automated workflows for the Universal Auth SDK monorepo.

## Workflows

### 📦 Publish (`publish.yml`)

**Trigger**: Automatically runs when a GitHub release is published

**What it does**:
1. Builds all packages in dependency order
2. Runs all tests
3. Publishes all packages to npm with public access
4. Uses `continue-on-error` to skip packages that haven't changed

**Packages published**:
- `@nightmar3/uauth-core`
- `@nightmar3/uauth-server`
- `@nightmar3/uauth-react`
- `@nightmar3/uauth-next`
- `@nightmar3/uauth-tanstack-start`

**Requirements**:
- `NPM_TOKEN` secret must be set in repository settings

### 🚀 Release (`release.yml`)

**Trigger**: Manual workflow dispatch from GitHub Actions tab

**What it does**:
1. Bumps package version (patch/minor/major)
2. Updates CHANGELOG.md automatically
3. Commits changes to main branch
4. Creates a GitHub release with tag

**Usage**:
1. Go to Actions tab in GitHub
2. Select "Release" workflow
3. Click "Run workflow"
4. Choose:
   - Version bump type (patch/minor/major)
   - Package to release
5. Click "Run workflow"

**Example**:
- Package: `tanstack-start`
- Version: `minor`
- Result: `1.0.0` → `1.1.0`

## Setup Instructions

### 1. Add NPM Token

1. Generate an npm access token:
   ```bash
   npm login
   npm token create
   ```

2. Add to GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Your npm token

### 2. Enable GitHub Actions

1. Go to Settings → Actions → General
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

## Manual Publishing

If you need to publish manually:

```bash
# Build the package
npm run build --workspace=packages/tanstack-start

# Run tests
npm test --workspace=packages/tanstack-start

# Publish
npm publish --workspace=packages/tanstack-start --access public
```

## Versioning Strategy

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

## Troubleshooting

### Publish fails with "version already exists"

This is normal if the version hasn't changed. The workflow uses `continue-on-error: true` to handle this gracefully.

### NPM_TOKEN expired

Generate a new token and update the GitHub secret:

```bash
npm token create
```

### Build fails

Check the build logs in the Actions tab. Common issues:
- TypeScript errors
- Missing dependencies
- Test failures

## Best Practices

1. **Always run tests locally** before creating a release
2. **Update CHANGELOG.md** with meaningful changes
3. **Use semantic versioning** correctly
4. **Test the published package** in a separate project
5. **Create GitHub releases** with detailed release notes
