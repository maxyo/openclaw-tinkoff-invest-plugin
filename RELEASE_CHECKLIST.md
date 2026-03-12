# Release Checklist

Before pushing this plugin to a public GitHub repository:

- [x] Remove hardcoded secrets/tokens
- [x] Ensure README explains config and safety defaults
- [x] Add license
- [x] Make package metadata public-repo friendly
- [x] Download OpenAPI YAML during type generation instead of storing it in git
- [x] Add GitHub Actions workflow for npm publishing
- [ ] Decide final repository URL and add `repository` / `homepage` / `bugs` fields to `package.json`
- [ ] Decide whether to keep trading tools in the initial public release or ship read-only first
- [ ] Review copyright/author attribution if you want a specific holder instead of `Contributors`
- [ ] Add `NPM_TOKEN` secret in GitHub repository settings
- [x] Run `npm run typecheck`
- [ ] Final smoke test inside OpenClaw after cloning into a clean workspace
