// Runtime config — injected by CI on deploy (see .github/workflows/deploy.yml).
// To enable spin commits, add a GitHub PAT with actions:write scope as the
// GHP repository secret: Settings → Secrets & variables → Actions → New secret.
// When running locally this file is a safe placeholder with no token.
window.BITCOIN_CRUSHER_TOKEN = window.BITCOIN_CRUSHER_TOKEN || "";
// GitHub Pages site URL — injected by CI; used by the CLI and web app.
window.SITE_URL = window.SITE_URL || "";
