# Changelog

> **v0.10.4.1** — 34 fork commits · 1818 total commits · HEAD 3caf5a27

> Only commits unique to this fork are listed. Upstream history is excluded.
> Generated from conventional commits using `git cherry upstream/main HEAD`.

_Last generated: 2026-08-03_

---

## Features

### Restore persisted light and dark themes

**v0.2.0** · c7f6bcb0 · 2026-07-27

### Add view cube and plane highlight grid

**v0.3.0** · 79fb0900 · 2026-07-27

### Add origin floor grid

**v0.4.0** · 29d01a5a · 2026-07-27

### Add turntable/trackball orbit mode toggle

**v0.5.0** · b08de976 · 2026-08-02

- add OrbitMode enum and persisted orbitMode\$ state to Viewer with localStorage persistence
- add toggleOrbitMode action and apply turntable/trackball rotation mode to CADTrackballControls
- add orbit mode icon helper in coreActions and reflect active mode on the ToggleOrbitMode button via uiConfigBundle
- add CameraControl component and cameraControlRenderer wiring for the orbit mode UI
- guard zoomIn, zoomOut, lookAt, dispose, and orbit mode init against missing renderer/trackballControls so the viewer stays safe when WebGL is unavailable

### Refresh light theme and site shell

**v0.6.0** · 6b91f4ce · 2026-08-02

- refresh light theme tokens and styles
- add site-shell.css for Structured Chaos family chrome
- wire View3d, WebApplication, and MenuHolder to the refreshed theme

### Generate changelog HTML fragment matching KS pattern

**v0.7.0** · 557de613 · 2026-08-02

- add --format=html to generate-changelog.mjs producing panels, chips, and sidebar blocks (Change Types, Versions) matching the KnitStitch changelog structure
- update changelog.html to fetch the pre-generated HTML fragment instead of rendering markdown client-side with marked.js
- add gen-changelog grunt task that generates both md and html during build
- update npm changelog script and webhook deploy commands to generate both formats

### Add shared site footer and build info generation

**v0.8.0** · 0f0af365 · 2026-08-02

- generate-changelog.mjs now writes web/js/buildInfo.js with version and commit metadata alongside the changelog output
- index.html and changelog.html load the shared site-footer script and render it via window.SITE_FOOTER config
- roadmap.html updated to match the shared footer pattern
- site-shell.css allows the site-footer to flex-shrink like the global bar and site header
- changelog.md regenerated with latest fork commits

### Save and load account projects

**v0.9.0** · 73af5e59 · 2026-08-02

### Separate account and browser projects

**v0.10.0** · 7986d853 · 2026-08-02

---

## Fixes

### Handle WebGL unavailable gracefully

**v0.4.1** · de7e5485 · 2026-08-02

- check WebGL support in SceneSetUp before initialising renderer, controls, and animation loop
- show a warning overlay with troubleshooting steps when WebGL context creation fails
- guard renderer-dependent methods (render, updateClearColor, updateViewportSize, domElement) with null checks
- activate DomBundle and SceneBundle first inside the startReact callback so the viewer container exists and WebGL availability can be checked before activating dependent bundles
- skip WebGL-dependent bundles (MouseEventSystem, Marker, PickControl, EntityContext, ViewSync, Highlight, Assembly, Debug, Preview, UIConfig) when WebGL is not available
- provide dummy highlightService, cadScene, pickControl, and modelMouseEventSystem in SceneBundle so non-WebGL bundles and React components do not crash
- guard MouseEventSystemBundle against missing domElement and trackballControls
- guard PickControlBundle and DomBundle tab switch against a missing renderer
- guard ExportBundle image/png export against a missing renderer or cadScene
- guard Viewer dispose against a missing renderer

### Always seed origin geometry after pipeline completes

**v0.7.1** · 1c83eed8 · 2026-08-02

- the origin datum and base planes were only added for new projects with no saved data, so they never appeared on the live site where users have persisted projects in localStorage
- load() now always attaches a one-time listener to craftService.update$ (emitted by the pipeline interceptor on completion) and adds the origin geometry regardless of saved state
- duplicate check prevents re-adding if the origin datum (id D:0) already exists in the model set
- delete body operation now protects all origin geometry (datum + planes) via originatingOperation === -1 sentinel check

### Seed origin geometry during project load

**v0.10.1** · 4d6e4b7a · 2026-08-02

### Guard optional cad services

**v0.10.2** · 8121dc5f · 2026-08-02

### Import icons from set entrypoints

**v0.10.3** · a09f9899 · 2026-08-02

### Copy regenerated changelog into dist

**v0.10.4** · a921b246 · 2026-08-02

---

## Interface

### Replace modeler ribbon icons

**v0.2.0.1** · a51f38a1 · 2026-07-27

### Refine slate chrome and view cube controls

**v0.3.0.1** · 23ce306e · 2026-07-27

### Migrate action icons to lucide-react

**v0.5.0.1** · 04ca86dc · 2026-08-02

- replace react-icons and FontAwesome css icons with lucide-react footer icons in usabilityActions
- add modelerRibbonIcon and sketcherRibbonIcon components
- update menuConfig to use the new icon components

### Restyle view cube and heads-up toolbar

**v0.5.0.2** · 3ed0bd1e · 2026-08-02

- restyle view cube faces, home button, and hover states with a lighter palette
- update ViewCube component to match the new styling
- refresh heads-up toolbar layout and styles
- adjust control bar and bottom stack spacing

### Move theme toggle to toolbar

**v0.10.3.1** · 1a27faff · 2026-08-02

---

## Documentation

### Add jsketcher commit scopes

**v0.1.0.1** · 0b36ded4 · 2026-07-27

### Move developer guide into docs

**v0.1.0.2** · 38c2e873 · 2026-07-27

### Add architecture, roadmap, and maintainer notes

**v0.6.0.1** · bcd89ccf · 2026-08-02

- add architecture, code-style, feature-preservation, and roadmap docs
- expand maintainer notes with system maps and fork-specific decisions
- add changelog and roadmap html pages
- update README, AGENTS, git-scopes, and docs index

### Add nginx config and VPS setup scripts

**v0.6.0.5** · 15ebfdc0 · 2026-08-02

- add www.jsketcher.structuredchaos.dev nginx config (root dist/, /webhook proxy to 3004)
- add www.auth.structuredchaos.dev nginx config (root BetterAuth, /webhook proxy to 3002, / proxy to 3000)
- add setup scripts for nvm, SSH keys, and git credentials used during VPS provisioning

### Add project persistence and touch workflow plans

**v0.10.0.2** · e9049ef9 · 2026-08-02

### Rewrite for fork, drop backer and tutorial references

**v0.10.4.1** · 3caf5a27 · 2026-08-03

- reframe intro as the Structured Chaos fork with production URL
- link to fork-specific docs (architecture, code-style, roadmap, changelog)
- remove YouTube tutorial, sample images, and live demo link
- remove commercial licencing and OpenCollective backer section
- mark contributing section as TBC

---

## Refactors

### Misc model, workbench, and craft cleanup

**v0.6.0.3** · 5bfcf0f6 · 2026-08-02

- tidy deleteBody operation and modeler index
- adjust mdatum and mopenFace model handling
- update openFaceView and sketcherUIContrib
- minor craftBundle and Wizard tweaks
- extend projectBundle load handling

---

## Tests

### Add project name conflict coverage

**v0.10.0.1** · c782d314 · 2026-08-02

---

## Maintenance

### Remove standalone sketcher entry and update config

**v0.6.0.2** · e2ece5c9 · 2026-08-02

- remove standalone sketcher.html 2D entry (app index is now the 3D CAD page)
- remove .vscode/launch.json
- update webpack, grunt, and package config for the consolidated entry
- add scripts and shared shell fallback js
- update index.html shell wiring

### Add GitHub webhook server for VPS auto-deploy

**v0.6.0.4** · b7522ef2 · 2026-08-02

- add scripts/webhook-server.mjs (no-dep Node.js server, verifies HMAC-SHA256, deploys on push to main)
- add ecosystem.config.cjs for PM2 (jsketcher-webhook on port 3004)
- add .env.example with GITHUB_WEBHOOK_SECRET template
- add .env to .gitignore
- document setup, nginx config, and manual fallback in AGENTS.md

### Add jsketcher deploy test helper

**v0.10.0.3** · c0ba36be · 2026-08-02

### Stop tracking generated build info

**v0.10.0.4** · 0eef9491 · 2026-08-02

### Update package metadata

**v0.10.3.2** · c202709a · 2026-08-02

---

## Other Changes

### Fix PR #219 build: implement missing functions and remove dead imports

**v0.1.0** · fd047e3e · 2026-07-24

PR #219 added imports for SketchStartBundle and DirectEditBundle but never uploaded those files, causing build failures. Removed the dead imports. Implemented the missing camera functions (fitFaceToOrthoCamera, animateSketchEntry, fitSceneToCamera, fitSceneToCameraAnimated) in usabilityActions.js and getDeflection() in craft/e0/common.js that were referenced but never defined.

---
