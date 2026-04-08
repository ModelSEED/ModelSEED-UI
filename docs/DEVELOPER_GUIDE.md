# Documentation Editing Protocol (`DEVELOPER_GUIDE.md`)

> **🤖 AI Agent Instructions**
> When asked to create new features or architectural changes, you MUST update this documentation library before marking the task complete. Check `.gsd/STATE.md` to map new behavior documentation.

This guide acts as the strict standard operating procedure for how to use, write, and extend the ModelSEED-UI documentation located within `docs/`.

---

## 📖 The Architecture of Documentation

To ensure high-quality and search-ready text, follow this strict taxonomy:

1. **`docs/README.md`** — The Master Index. Defines the library of deep-dive manuals.
2. **Deep-Dive Manuals (`docs/XYZ.md`)** — Subsystem-specific invariants and guides:
    - `ARCHITECTURE.md`: High-level data and component rules.
    - `AUTHENTICATION.md`: Auth logic and state tracking rules.
    - `WORKSPACE.md`: External API connectivity constraints.
    - `BIOCHEMISTRY.md`: Scientific presentation formats.
    - `ROUTING.md`: URL and legacy parity mapping rules.
    - `LEGACY_TRANSITION.md`: Historical AngularJS context shift.

**Do Not Create Clutter.**
When building a new subsystem (e.g., FBA Runs, Custom Model Building), create a clear, dedicated `XYZ.md` file here rather than stuffing `ARCHITECTURE.md` with irrelevant edge-case logic.

---

## ✍️ Adding a New Document Protocol

Whenever a new subsystem or major component refactor occurs:

1. **Create the file**
    - Place the markdown document at the root of `docs/`.
    - Apply a strong title `# Subsystem Name (XYZ.md)`.
2. **Document the Constraints**
    - Define *What* this file controls.
    - Declare the *Why* (the business or scientific reason).
    - Map the *Code References* (exact file paths within `app/`, `components/`, and `lib/`).
    - Expose the *API or Component Contract* for future integration.
3. **Update the Index & Link Map**
    - Immediately add a row to the table in `docs/README.md`.
    - Provide a one-sentence, actionable description for the new entry.
    - Cross-link related systems (e.g., if it touches Auth, add "See also" in `AUTHENTICATION.md`).

---

## 🔥 Style & Content Principles

For human and AI scannability, execute the following writing standards:

- **Assume High-Context Readers**: Write for senior developers or specific AI agents. Skip introductory filler text.
- **Show Code Paths, Not Prose**: Factual and strict syntax. Use backticks for paths (`` `app/(user-data)/my-models/page.tsx` ``). Provide code architecture snippets if they establish a core pattern.
- **Document Current State, Not History**: `.gsd/STATE.md` tracks our daily history. This `docs/` library defines **how the system currently behaves**.
- **Actionable Callouts**: Use formatted blockquotes `> **Note**` to flag dangerous regressions or legacy invariants.

---

## ✅ The "Before Merge" Checklist

If you change the codebase layout, data fetching architecture, or add new APIs:

1. **[  ] Documentation File Exists**: Does the major feature have an isolated `docs/*.md` file?
2. **[  ] Table of Contents Updated**: Is it accessible from `docs/README.md`?
3. **[  ] URL Parity Verified**: If routing changed, did you document the legacy vs. modern path in `ROUTING.md`?
4. **[  ] Accuracy Check**: Did you remove definitions of removed dependencies, unused endpoints, or stale logic?

**Rule of Thumb:**
If a developer (or an AI agent) cannot press `Ctrl+Shift+F` across the workspace and immediately find the file responsible for an obscure scientific algorithm or legacy URL mapping via these documents, the documentation is incomplete.
