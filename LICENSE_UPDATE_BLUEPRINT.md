# Licensing and System Update Blueprint

This document is an implementation guide for this application. It is intentionally documentation-only: do not replace the existing license or update workflow until the adapter is tested.

## 1. Application identity

- Control-plane app key: use the canonical key in `config/app_adapters.php` in the licensing centre.
- Instance key: stable SHA-256 of the installation/device identity; never use a license key as an instance key.
- Platform: `php-web`, `android`, `desktop`, `browser-extension`, or `wordpress`.
- Current version: read from the application’s existing version constant/configuration.
- License key source: use the existing account/settings/subscription store; do not introduce a second source of truth.

## 2. Required workflow

### License verification

Call `POST /api/v1/control_plane.php/licenses/verify` with:

```json
{
  "app_key": "canonical-app-key",
  "license_key": "existing-license-key",
  "instance_key": "stable-installation-hash",
  "app_version": "1.0.0",
  "platform": "php-web",
  "domain_or_device": "host-or-device"
}
```

Treat `valid: true` as licensed. Preserve the existing account fields and UI mapping.

### Sync validation

Call `POST /api/v1/control_plane.php/apps/{app_key}/sync/validate` periodically with a unique `request_id` and UTC `client_timestamp`.

Use `sync_valid`, `next_sync_at`, and `grace_period_seconds` to control offline access. Do not mark a license expired merely because one request failed; use the configured grace period.

### Update discovery

Call `POST /api/v1/control_plane.php/apps/{app_key}/updates/check` with the license key, instance key, current version, channel, and platform. Display the returned release version, notes, checksum, and package metadata in the existing system-update screen.

### Authorized download

Use the licensing centre’s authorized download endpoint with the same license and instance context. Verify the returned SHA-256 checksum before extraction. Keep the existing blocked-path, backup, migration, and rollback safeguards.

## 3. Integration points by architecture

### PHP application

Use `ControlPlaneClient.php` beside the application bootstrap. Add a small adapter service beside the existing license/update service. Wire the existing license details page and update page to the adapter; do not replace the page or account schema.

### Laravel-style application

Add a service under `app/Services`, inject it into the existing update controller/service, and retain the current local history and migration code. Central update discovery may be enabled first; package application must remain behind checksum and path validation.

### Android application

Use the Kotlin client on a background dispatcher. Store the instance key in app storage, call verify on activation, call sync on the existing periodic worker, and show update availability in the existing settings/update screen. Never block startup on a network request.

### Desktop or JavaScript application

Use the JavaScript client from the main process/service layer. Keep update download and installation in the existing trusted updater, passing the central release checksum into that updater.

### Browser extension

Call verify and sync from the background/service worker. Show update state in the existing popup/options page. Do not download executable code directly from an untrusted page.

### WordPress plugin

Use the PHP client from the plugin admin service. Run sync through a scheduled event, show status in the existing plugin settings page, and use WordPress’s update/install APIs only after checksum validation.

## 4. Compatibility and safety rules

1. Keep the current workflow as fallback until central verification and update installation pass testing.
2. Never overwrite account expiry, tier, school, tenant, or entitlement fields with null values.
3. Do not disable TLS verification.
4. Do not install a package whose checksum or signature fails.
5. Support expired, suspended, revoked, clock-skew, offline-grace, activation-limit, and rollback cases.
6. Log request IDs and outcomes without logging full license keys.

## 5. Acceptance checklist

- Existing valid license remains valid after an update check.
- Renewal changes are reflected after the next successful sync.
- Temporary network failure uses grace-period behavior.
- Expired/revoked licenses stop protected actions after grace expires.
- Update metadata appears in the existing update interface.
- Package checksum failure prevents installation.
- Failed installation restores the previous version.
- Existing application-specific account fields remain unchanged unless explicitly supplied by entitlements.

## 6. Local project references

- Central API: `api/v1/control_plane.php`
- Package download: `api/v1/download.php`
- PHP client: `sdk/php/ControlPlaneClient.php`
- JavaScript client: `sdk/javascript/control-plane-client.js`
- Android client: `sdk/android/ControlPlaneClient.kt`
- App registry: `config/app_adapters.php`
- Database contract: `CONTROL_PLANE_MIGRATION.md`
