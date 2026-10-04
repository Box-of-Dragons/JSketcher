JSketcher
===========
![JSketcher Logo](./web/img/JSketcher-logo.svg)

A fork of [xibyte/jsketcher](https://github.com/xibyte/jsketcher) that I'm working on as a personal challenge. The original project appears to no longer be actively maintained, so I'm experimenting with UI and workflow improvements to see what I can achieve.

**Expect changes, breaks, and eventual fixes.** This is a personal project that happens to be open source. I'm building this for myself and sharing it publicly. Things will break, APIs will change, and features will appear and disappear as I figure out what works.

---

## What It Is

JSketcher is a **parametric** 3D CAD modeler written in pure JavaScript. It uses a 2D constraint solver for sketches and the feature/history metaphor to build models. The constraint solver is completely written in JavaScript/TypeScript and powers the 3D CAD workflow, with OpenCascade handling solid modeling operations.

**Hosted at:** [jsketcher.structuredchaos.dev](https://jsketcher.structuredchaos.dev/)

This fork serves the 3D CAD app at `/`; the old standalone `sketcher.html` 2D entry has been removed to focus on the core 3D experience.

The public pages use the shared Structured Chaos chrome (`css/shared.css`, `global-bar.js`, `site-header.js`). See [AGENTS.md](./AGENTS.md) and [docs/maintainer-notes.md](./docs/maintainer-notes.md) for fork-specific conventions and the runtime shape.

* [Workbench Dev Guide](./docs/index.md)
* [Architecture Overview](./docs/architecture.md)
* [Maintainer Notes](./docs/maintainer-notes.md)
* [Code Style](./docs/code-style.md)
* [Roadmap](./docs/roadmap.md)
* [Changelog](./docs/changelog.md)

---

## Current Focus

I'm working on making the UI more intuitive and consistent:

- **Modern icon system** — Replaced custom SVGs with `lucide-react` icons for a cleaner, more consistent look
- **Better visual feedback** — View cube, plane highlight grids, and improved theme support
- **Touch and pen support** — Making the tools work better on tablets and pen input devices
- **Action previews** — Live previews of operations before you commit them
- **Local-first persistence** — Projects saved locally in browser storage (with plans for optional cloud sync)

See the [Roadmap](./docs/roadmap.md) for what's planned and what's shipped. 

## Core Features

- **Geometric Constraint Solver** — Solves systems of geometric constraints applied to sketches (see supported constraints below)
- **Sketch constraint tools** — Design 2D profiles inside the 3D CAD workflow
- **3D Boolean engine** — OpenCascade performs booleans on BREP objects
- **Feature History** — Builds 3D models step-by-step with stable edge/face ID propagation
- **Export formats** — STL, DWG, and SVG
- **Local project storage** — Save projects in browser localStorage (no cloud required)
- **Dimension repository** — Named dimensions that can be referenced across constraints and updated globally
- **2D measurement tools** — Linear, vertical, horizontal, and arc/circle dimensions
- **Client-side only** — No server needed, just JavaScript and WebAssembly   

Supported Constraints
=====================

* Coincident
* Vertical
* Horizontal
* Parallel
* Perpendicular
* Point to Line Distance
* Point to Object Distance
* Entity Equality(radius/length)
* Tangent
* Radius
* Point On Line
* Point On Arc / Ellipse
* Point In Middle
* Angle
* Symmetry
* Lock Convexity
* Fillet Meta Constraint

## Get Started With the Code

```bash
# Install node.js if you don't have it

cd <jsketcher folder>
npm install
npm start
```

Local development runs on `http://localhost:3001`.

Production is static output from `dist/`, produced by `npm run build` (Grunt). The deployed version is served as static files — no Node app process needed.

---

## Contributing

Contributions are welcome! Just keep in mind that this is a personal project and the codebase will change frequently as I experiment with different approaches.

**Requirements:**
- All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format
- See the git scopes reference in the project docs for area-specific conventions

If you want to contribute, feel free to open an issue or submit a pull request. I'll do my best to review and merge things that align with the project direction.

---

## AI-Assisted Development

This project uses AI-assisted coding tools including:
- **Devin** (Cognition's AI coding assistant)
- **Codex** (OpenAI's code generation model)

These tools help with code generation, debugging, and exploring the codebase more efficiently. All AI-assisted code is reviewed and tested before being committed.
