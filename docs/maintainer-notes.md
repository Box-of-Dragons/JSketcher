# Maintainer Notes

This file is a practical map for working on this fork. It records where the main systems live, how recent UI/theme changes are wired, and the conventions that are easy to miss when moving around the codebase.

For a full top-down architecture overview (subsystems, data flow, how everything interlinks), see [architecture.md](./architecture.md). For code style baselines (formatting, naming, functions, classes, streams, operations, actions, views), see [code-style.md](./code-style.md). For the workbench/feature author guide, see [index.md](./index.md).

## Runtime Shape

JSketcher is a browser-only CAD app. There is no application server in normal use.

- `web/app/index.js` starts the full CAD app.
- `web/index.html` is the CAD app entry page.
- The old standalone `web/sketcher.html` 2D page has been removed from this fork.
- `webpack.config.js` builds the `index` entry into `dist/static/index.bundle.js`.
- `web/` is also served as static content by webpack-dev-server.
- OpenCascade functionality is provided through `jsketcher-occ-engine` and browser-loaded wasm assets.
- Local development runs on `http://localhost:3001`.
- Production is static output from `dist/`; use a static site/document root in CloudPanel, not a Node app.

## Shared Structured Chaos Shell

The public pages use the shared Structured Chaos chrome.

- `web/index.html` and `web/changelog.html` load `css/shared.css`, `global-bar.js`, and `site-header.js` from StructuredChaos.
- The loader uses `http://localhost:4000` in local development and `https://structuredchaos.dev` in production.
- `web/css/site-shell.css` must stay layout-only for JSketcher app/content sizing. Do not restyle the global bar, title header, nav, project links, or collapse tab there.
- `web/js/shared-shell-fallback.js` only renders matching shared-class fallback markup when the shared scripts fail to load.
- If static output is edited manually, mirror shell changes into the matching files under `dist/`.

## Application Startup

The CAD app is assembled through bundles in `web/app/cad/init/startApplication.js`.

- `preUIBundles` define and activate services that must exist before React renders.
- React starts through `web/app/cad/dom/startReact`.
- The remaining bundles activate after React has mounted.
- `context` from `web/app/cad/context` is the shared application object passed through services, streams, and React context.
- `LegacyStructureBundle` still creates some old-style context shape. Do not remove it casually.

When adding a new cross-cutting service, follow the bundle pattern:

1. Define streams, if the service exposes reactive state.
2. Attach the service to `ctx`.
3. Activate it in `startApplication.js` in the right phase.
4. Keep UI-only registration out of domain services.

## Default Project Seeding

All projects (new and saved) start with construction geometry at the origin, mirroring Fusion 360 and most other CAD tools: an origin datum and the three base planes (XY, XZ, ZY).

- `web/app/cad/projectBundle.ts` — `DEFAULT_PROJECT_HISTORY` is empty (the datum and planes are not in history). `load()` always calls `loadData()` (with saved data or empty defaults), then attaches a one-time listener to `craftService.update$` that adds the origin geometry after the pipeline completes.
- `createOriginGeometry()` creates the origin datum (id `D:0`, `originatingOperation = -1`) and three base planes as `MOpenFaceShell` instances with `{ width: 100, height: 100 }` bounds. All have `originatingOperation = -1` (sentinel: not from history).
- `web/app/cad/craft/craftBundle.ts` — the pipeline interceptor emits on `update$` after the pipeline completes (both success and failure). This signals that models are settled and ready for the origin geometry to be added.
- `modules/workbenches/modeler/features/deleteBody/deleteBody.operation.ts` — the delete body operation checks if any tool has `originatingOperation === -1` and throws an error if so, preventing deletion of the origin datum and base planes.
- The origin geometry is always added regardless of whether there's a saved project. Duplicates are avoided by checking if a model with id `D:0` already exists in the model set.
- `empty()` (used by the import flow to wipe before loading) is intentionally not changed; it still loads a truly empty `{history: [], expressions: ''}` so imports aren't polluted with seed operations.
- The datum and planes cannot be undone or deleted via the history timeline (they're not in history). They are protected from deletion via the delete body action.

The `DATUM_CREATE` operation is registered by `WorkbenchesLoaderBundle` (core operations) before `projectService.load()` runs, so the seed history is always materializable at load time.

## Major Directories

- `modules/brep` - BRep/topological geometry primitives and helpers.
- `modules/geom` - geometry algorithms and lower-level geometry types.
- `modules/math` - math primitives and solvers.
- `modules/scene` - Three.js scene setup, controls, scene graph helpers, object metadata.
- `modules/ui` - reusable UI components and global/theme styles.
- `modules/workbenches` - workbench definitions and feature registrations.
- `web/app/cad` - the main CAD application shell, services, model layer, scene views, craft/history, storage, workbench UI.
- `web/app/sketcher` - standalone sketcher tools, constraints, shapes, and sketcher UI.
- `web/css` - JSketcher page-layout CSS for entry pages outside CSS modules. Shared chrome styling comes from StructuredChaos `css/shared.css`.
- `docs` - maintainer and feature author documentation.
- `test` - small repo-specific Node tests.

## Workbenches And Ribbon

Workbench registration starts in `modules/workbenches/registry.ts`.

- Add workbenches by exporting a `WorkbenchConfig` and including it in `WorkbenchRegistry`.
- The default workbench is currently hard-coded as `modeler` in `web/app/cad/workbench/workbenchService.ts`.
- Workbench feature commands live under `modules/workbenches/<workbench>/features`.
- Each feature should have its operation file, optional icon asset, and docs folder.
- The modeler ribbon is defined in `modules/workbenches/modeler/index.ts`.

The top ribbon is not owned by the generic toolbar component. The generic toolbar only renders action refs. Change the top ribbon by editing the active workbench's `ui.toolbar` list.

Action refs can be:

- `'ActionId'` for a normal action.
- `'-'` for a splitter.
- `'|'` for a toolbar breaker.
- `['ActionId', overrides]` for per-toolbar label/icon overrides.
- Nested arrays for grouped buttons.

`web/app/cad/dom/components/PlugableToolbar.jsx` renders those refs. Keep this component generic; do not hard-code specific CAD commands here.

## Actions

Actions are registered through `ctx.actionService`.

- Core/global actions live in `web/app/cad/actions`.
- Workbench-specific actions can be registered through a workbench config.
- Operation-backed feature actions are registered by `web/app/cad/craft/operationBundle.ts`.
- Toolbar/menu entries should refer to action ids, not directly call operation code.

An action generally has:

- `id`
- `appearance`
- `invoke`
- optional state/enablement streams

Prefer adding behavior to the action or operation layer, then exposing it through toolbar/menu config.

## UI Layout

The main CAD viewport composition lives in `web/app/cad/dom/components/View3d.jsx`.

Important overlays:

- `HeadsUpToolbar` - top ribbon/quick controls.
- `HeadsUpHelper` - contextual helper prompt.
- `ViewCube` - top-right orientation cube.
- `FloatView` - floating panels such as explorer/history/expressions.
- `WizardManager` - operation dialogs.
- `BottomStack` - bottom-mounted history timeline and footer control bar.
- Sketcher overlays are only active inside `SketcherMode`.

The bottom camera widget is replaced by `ViewCube`, but the bottom history timeline and footer controls are currently mounted for feature parity while the fork layout is still being evaluated.

## Icons

This fork uses simple flat ribbon icons through `lucide-react`.

- Ribbon icons in the modeler workbench are configured in `modules/workbenches/modeler/index.ts` using `ribbonIcon(id)` from `cad/workbench/modelerRibbonIcon`.
- Ribbon icons in the sketcher workbench are configured in `web/app/cad/sketch/sketcherUIContrib.ts` using `sketcherRibbonIcon(id)` from `cad/workbench/sketcherRibbonIcon`.
- Global quick-action icons are configured in `web/app/cad/workbench/uiConfigBundle.js`.
- Use `getSizeInPx` from `cad/icons/DeclarativeIcon` so icon sizing follows the existing toolbar size model.
- Use thin, readable strokes. Current ribbon helpers use `strokeWidth: 1.8`.
- Keep icon choices descriptive rather than decorative.

### Modeler ribbon icons

`web/app/cad/workbench/modelerRibbonIcon.tsx` owns the `modelerRibbonIcons` map (action id → lucide component) and the `ribbonIcon(id)` helper that returns a `{ icon }` override for toolbar entries. Shared actions like `LookAtFace` live here so both workbenches can reference them.

### Sketcher ribbon icons

`web/app/cad/workbench/sketcherRibbonIcon.tsx` owns the `sketcherRibbonIcons` map (unprefixed sketcher action id → lucide component) and the `sketcherRibbonIcon(id)` helper. The sketcher toolbar in `sketcherUIContrib.ts` applies these as per-entry overrides using the same `[id, ribbonIcon(id)]` pattern as the modeler ribbon, so both ribbons use a consistent icon family.

The sketcher actions themselves still carry their original custom icons in `appearance.icon` (used in the 2D sketcher tab and elsewhere). The ribbon overrides only change what the top toolbar shows.

Avoid replacing the generic toolbar renderer to change an icon. Prefer action appearance or per-toolbar overrides.

## Theme System

The theme system is CSS-custom-property based.

- `modules/ui/styles/theme.less` defines the default dark theme in `:root`.
- `modules/ui/styles/theme-light.less` defines the light override under `body.theme-light`.
- `modules/ui/styles/global/index.less` imports both theme files.
- `modules/ui/styles/theme.ts` exposes runtime CSS variable reads to JavaScript.
- `test/theme.test.js` checks that dark/light variables stay structurally aligned.

Theme persistence:

- `web/app/cad/actions/coreActions.js` defines `ToggleTheme`.
- The selected theme is saved as `localStorage['jsketcher.theme']`.
- `web/app/cad/dom/components/WebApplication.jsx` restores `body.theme-light` on startup when the saved value is `light`.

The Three.js renderer background does not update automatically from CSS. It is synced through:

- `modules/scene/sceneSetup.ts` - `updateClearColor()`
- `web/app/cad/scene/viewer.ts` - `updateClearColor()`

Any new theme toggle must call `viewer.updateClearColor()` after changing body classes.

See `docs/theme/theme-system.md` for the full theme documentation.

## View Cube

The orientation cube is a DOM overlay, not a Three.js object.

- Component: `web/app/cad/dom/components/ViewCube.tsx`
- Styles: `web/app/cad/dom/components/ViewCube.less`
- Mounted by: `web/app/cad/dom/components/View3d.jsx`

It listens to `sceneSetup.sceneRendered$` and derives a CSS transform from the active camera. Face clicks run existing standard view actions such as `StandardViewFront` and `StandardViewTop`.

Keep the cube as a lightweight UI control. Camera math and view changes should stay in existing viewer/action services.

## Camera And Orbit Controls

The viewport camera is orbited by `CADTrackballControls` (a fork of the Three.js trackball controls with orthographic support). It supports two rotation modes, toggled from the bottom-right footer control bar:

- **trackball** (default) — free orbit. The camera rotates around an axis perpendicular to the drag direction, so the model tumbles freely in any orientation. This is the original JSketcher behavior.
- **turntable** — Fusion 360 style. Horizontal drag yaws the camera around the world up axis, vertical drag pitches around the camera's right axis, and the up vector is held to world up so the horizon stays level.

Where the pieces live:

- `modules/scene/controls/CADTrackballControls.js` — the controls themselves. `rotationMode` (`'trackball'` | `'turntable'`) selects the active rotation; `rotateCamera()` branches to `rotateCameraTurntable()` when in turntable mode. `setRotationMode(mode)` is the setter. Turntable uses a `turntableSpeedMultiplier` (default `2.5`) on top of `rotateSpeed` because split-axis yaw/pitch feels less direct than free tumble; tune that property if the drag feels too slow or too fast.
- `web/app/cad/scene/viewer.ts` — owns the orbit mode state. `OrbitMode` enum (`TRACKBALL` | `TURNTABLE`), `orbitMode$` stream (an `externalState` mirroring the `cameraMode$` pattern), `getOrbitMode`/`setOrbitMode`/`toggleOrbitMode`/`applyOrbitMode`. The mode persists to `localStorage['jsketcher.orbitMode']` (same approach as the theme toggle) and is applied on startup in the `Viewer` constructor.
- `web/app/cad/actions/coreActions.js` — the `ToggleOrbitMode` action. Exports `orbitModeIcon(mode)` which resolves the footer icon per mode (`Orbit` for trackball, `Disc` for turntable).
- `web/app/cad/workbench/uiConfigBundle.js` — registers `ToggleOrbitMode` in `streams.ui.controlBars.right` (next to `ToggleCameraMode`) and attaches to `viewer.orbitMode$` to mutate the action's appearance stream so the button icon swaps live with the active mode. `attach()` fires immediately with the persisted mode, so the correct icon shows on load.

The bottom-right control bar order (right group) is: `Info`, `RefreshSketches`, `ShowSketches`, `DeselectAll`, `ToggleOrbitMode`, `ToggleCameraMode`.

Keep camera math in `CADTrackballControls`/`viewer` and expose switching through the action layer. Do not add orbit logic to the ViewCube or toolbar components.

## Plane Highlight Grid

The Fusion-style floor grid is only displayed while a plane-based face is highlighted.

- Factory: `web/app/cad/scene/views/planeGridView.js`
- Hook: `web/app/cad/scene/views/faceView.js`

`SketchingView.mark('highlight')` shows the grid when `model.isPlaneBased` is true. `withdraw('highlight')` hides it. `dispose()` removes and disposes the grid.

Keep this behavior highlight-scoped. Do not make permanent construction grids part of `FaceView` unless the product decision changes.

## Styling Conventions

- Global theme tokens belong in `modules/ui/styles/theme.less` and `modules/ui/styles/theme-light.less`.
- Reusable Less variables should map to CSS variables in `theme.less`.
- CSS modules are used for app/components under `modules` and `web/app`.
- Global, non-module CSS is used under `web/css` and `modules/ui/styles/global`.
- Avoid Less color functions such as `darken(var(...))`; Less cannot compute on runtime CSS variables.
- Define explicit token variants instead, such as `--color-accent` and `--color-accent-dark`.

## TypeScript And JavaScript

This repo is mixed JS/JSX/TS/TSX.

- `tsconfig.json` has `allowJs: true`.
- Path aliases resolve from `modules`, `web/app`, and `node_modules`.
- Prefer existing aliases such as `cad/...`, `scene/...`, `ui/...`, and `workbenches/...` over deep relative imports when nearby code already uses them.
- React is currently React 16. Do not introduce React 18-only APIs.
- Existing class components are common. Do not rewrite to hooks unless the change needs it.

Code style:

- 2-space indentation.
- 120-column target from `.editorconfig`.
- No `var`; use `const` or `let`.
- Prefer `const` where possible.
- No underscore prefix for private members unless a getter/setter collision forces it.
- Keep generic renderers generic. Put feature-specific decisions in config, actions, or operations.

## Validation

Useful commands:

```bash
npm start
node test/theme.test.js
node ./node_modules/eslint/bin/eslint.js web/app modules
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/webpack/bin/webpack.js --config webpack.config.js --progress --profile
```

Notes:

- `npm run pack` currently includes `--colors`, which may fail with the installed webpack CLI. Use the direct webpack command above if that happens.
- Full TypeScript checking may surface dependency or legacy-code issues unrelated to a UI change. Use targeted checks when working in a dirty branch, but still run the broader checks before a clean merge.
- Avoid importing from `react-icons/all` — its star re-exports collide across icon sets and trigger Webpack "conflicting star exports" warnings. Import each icon from its own set subpath (e.g. `react-icons/gr`, `react-icons/bi`) instead.

## Git Hygiene For This Fork

- Keep this fork based on upstream JSketcher.
- Do not copy source from unrelated forks into this fork.
- Similar UI ideas are acceptable, but implement them with this repo's own components, actions, and styles.
- Avoid broad branch checkouts from experimental branches. Copy specific files or patch specific hunks.
- The worktree may contain staged and unstaged changes at the same time. Check `git status --short` before editing and do not revert unrelated user work.

## Where To Put New Notes

- Add feature-author docs to the feature's `docs/index.md`.
- Add theme details to `docs/theme/theme-system.md`.
- Add broad maintainer/process notes here.
- Add future architecture proposals to `DESIGN.md`.
- Add agent-facing style rules to `AGENTS.md`.
- Add commit scope guidance to `docs/git-scopes.md`.
- Add roadmap items to `docs/roadmap.md`.

## Roadmap Page

`web/roadmap.html` is a static page that fetches `docs/roadmap.md` from the GitHub raw URL and renders it client-side with `marked.js`, matching the KnitStitch roadmap page pattern.

- The markdown source lives in `docs/roadmap.md` and is the single source of truth for the public roadmap.
- `web/js/md-page.js` handles fetching, rendering, link rewriting, TOC building, and wrapping content into `.panel` sections.
- The page uses the same shared shell loader pattern as `web/index.html` and `web/changelog.html`.
- The `data-md-src` attribute on `<body>` points to the `main` branch raw URL on GitHub.
- The roadmap is linked in the `SITE_HEADER` nav on all JSketcher pages.

Do not edit `web/roadmap.html` to change roadmap content — only edit it to change the page chrome. Edit `docs/roadmap.md` instead.

## Changelog Page And Generation

`web/changelog.html` fetches `docs/changelog.md` from the GitHub raw URL and renders it client-side with `marked.js`, using the same `md-page.js` renderer as the roadmap page.

- The markdown source is generated by `scripts/generate-changelog.mjs` from fork-only commits.
- The script uses `git cherry upstream/main HEAD` to identify commits unique to this fork (by patch ID, so it works even with rebased history).
- Only commits not in upstream are listed. The upstream `xibyte/jsketcher` history is excluded.
- Commits are grouped by conventional commit type (Features, Fixes, Interface, Documentation, etc.).
- The latest version tag on HEAD is shown in the changelog snapshot line.
- Run `npm run changelog` to regenerate `docs/changelog.md`.
- The `data-md-src` attribute on `<body>` points to the `main` branch raw URL on GitHub.
- The changelog is linked in the `SITE_HEADER` nav on all JSketcher pages.

Do not edit `web/changelog.html` to change changelog content — run `npm run changelog` to regenerate `docs/changelog.md` instead. Only edit `web/changelog.html` to change the page chrome.

## Versioning

This fork versions independently from upstream, starting at `v0.1.0`.

- `v0.1.0` is tagged at the first fork commit (`fd047e3e` — fix PR #219 build), the fork baseline.
- Each subsequent fork commit bumps the version per conventional commit rules:
  - `feat:` → minor bump (e.g. `v0.1.0` → `v0.2.0`)
  - `fix:` → patch bump (e.g. `v0.2.0` → `v0.2.1`)
  - `BREAKING CHANGE` or `!:` → major bump
  - everything else (`docs:`, `ui:`, `refactor:`, `chore:`, etc.) → revision increment (4th number, e.g. `v0.2.0.1`)
- The changelog script (`scripts/generate-changelog.mjs`) computes the current version by walking fork commits from the `v0.1.0` baseline and applying these rules.
- `package.json` `version` tracks the computed version at HEAD.
- Follow the Structured Chaos conventional commit rules for version bumps (see `docs/git-rules.md` in the StructuredChaos umbrella repo).
- The old upstream-era `v1.0.0-dev.1` tag exists in history but is not part of the fork's versioning scheme.

### Prerequisites

The `upstream` remote must exist and be fetched for `git cherry` to work:

```bash
git remote add upstream https://github.com/xibyte/jsketcher.git  # if not already present
git fetch upstream
```
