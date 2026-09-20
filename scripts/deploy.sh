#!/usr/bin/env bash
# JSketcher post-reset deploy steps. Runs on the VPS after git fetch + reset,
# invoked by the shared family-deploy workflow during a release run.
set -euo pipefail

npm ci
node scripts/generate-changelog.mjs --root=. --format=md --output=docs/changelog.md
node scripts/generate-changelog.mjs --root=. --format=html --output=web/changelog-fragment.html
npx grunt
