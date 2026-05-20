# 🚨 Post-Mortem & Bug History

This file contains historical bugs and architectural decisions. ALWAYS check this file before writing complex logic to avoid repeating past mistakes.

## 1. Frontend: Modal Data Fetching Bug
- **The Bug:** The AI attempted to write `fetch()` or Server Action calls inside the `onClick` handler of the `clickLampBlue` modal trigger. This caused significant UI lag because the data was already available.
- **The Fix & Lesson:** Data for the dashboard (operators, reporters, device states) is strictly **pre-loaded** into the DOM before the page finishes loading. Modal triggers must ONLY append or display this existing data. NEVER write on-demand fetch logic for UI interactions.

## 2. Frontend: Device Identifier Mismatch
- **The Bug:** The AI generated lists and API payloads using `clientid` or `device_id`, causing undefined errors when mapping over the 10,000+ IoT devices.
- **The Fix & Lesson:** The system exclusively uses `SN` (Serial Number) as the primary key. If a schema or mock data contains `clientid`, it is incorrect. Always rewrite it to `SN`.

## 3. Backend: Lambda Deployment Script Fragmentation
- **The Bug:** The AI tried to refactor the Lambda deployment script into multiple modules and external config files, breaking the deployment pipeline.
- **The Fix & Lesson:** The Lambda deployment script must remain as a single file. It relies on the `.toString()` method to convert code to strings for deployment. Do NOT abstract or split this script, even if it exceeds 2,000 lines.

## 4. Backend: Volt Error Query Throttling
- **The Bug:** Querying for voltage errors across the entire 10,000-device database caused severe throttling and timeouts.
- **The Fix & Lesson:** When searching for specific hardware errors (like volt errors), ensure the query utilizes batch operations or index-based querying tied directly to the `SN`. Do not use full table scans.

## 5. Backend: Node.js Migration Failures
- **The Bug:** During the migration of 38 Lambda functions from Node.js 16/18 to Node.js 24, legacy packages and outdated AWS SDK v2 methods caused runtime crashes.
- **The Fix & Lesson:** All new Lambda code must be explicitly compatible with Node.js 24. Always use AWS SDK v3 syntax. Avoid any deprecated methods from older Node versions.