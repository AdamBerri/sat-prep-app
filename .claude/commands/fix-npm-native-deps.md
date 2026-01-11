# Fix npm Native Dependencies

Fix issues with missing native binaries (darwin-arm64, linux-x64-gnu) after npm install.

## When to Use

Use this command when you see errors like:
- `Cannot find module '../lightningcss.darwin-arm64.node'`
- `Cannot find module '@rollup/rollup-darwin-arm64'`
- `Cannot find module '@tailwindcss/oxide-darwin-arm64'`
- Similar errors for linux-x64-gnu variants

## Instructions

1. **Identify the missing packages** from the error message

2. **Check if packages are in optionalDependencies** in package.json
   - Native binaries often get listed as optional deps
   - npm sometimes skips installing these, causing runtime failures

3. **Move packages from optionalDependencies to dependencies**:
   ```json
   {
     "dependencies": {
       "lightningcss-darwin-arm64": "^1.30.2",
       "@tailwindcss/oxide-darwin-arm64": "^4.1.18"
     }
   }
   ```

4. **Clean and reinstall**:
   ```bash
   rm -rf node_modules package-lock.json .next
   npm install
   ```

5. **Verify the fix**:
   ```bash
   npm run dev
   ```

## Common Native Packages

| Package | Platform | Purpose |
|---------|----------|---------|
| `lightningcss-darwin-arm64` | macOS ARM | CSS processing |
| `lightningcss-linux-x64-gnu` | Linux x64 | CSS processing |
| `@tailwindcss/oxide-darwin-arm64` | macOS ARM | Tailwind CSS |
| `@tailwindcss/oxide-linux-x64-gnu` | Linux x64 | Tailwind CSS |
| `@rollup/rollup-darwin-arm64` | macOS ARM | Bundling |
| `@rollup/rollup-linux-x64-gnu` | Linux x64 | Bundling |

## Root Cause

npm's optional dependency handling is inconsistent. When a package is in `optionalDependencies`:
- npm may skip it if the platform doesn't match (expected)
- npm may also skip it due to caching/resolution bugs (unexpected)

Moving to `dependencies` forces npm to always install the package.
