# Developer Guide for `docs/` and the Index

This guide explains **how to use and extend** the documentation in the `docs/` directory, with `docs/README.md` acting as the index for the developer manual.

---

## 📚 How the Documentation Is Organized

- `docs/README.md` — the **index**. This is the entry point for developers and should always contain an up‑to‑date table of contents.
- One deep‑dive Markdown file per subsystem:
  - `ARCHITECTURE.md` — high‑level design and tech stack.
  - `AUTHENTICATION.md` — RAST/PATRIC auth flows and token handling.
  - `WORKSPACE.md` — Workspace JSON‑RPC and `modelseed-api` proxy behavior.
  - `BIOCHEMISTRY.md` — biochem search and equation formatting.
  - `ROUTING.md`, `LEGACY_TRANSITION.md` — URL parity and AngularJS migration notes.

When you introduce a new subsystem (e.g. **Jobs**, **FBA UI**, **GapFill tools**), it should get its own `XYZ.md` file here and an entry in the index.

---

## ✏️ Adding a New Documentation Page

1. **Create the file**
   - Place it directly under `docs/`, e.g. `docs/JOBS.md`.
   - Start with a clear H1 title (e.g. `# Jobs & Long‑Running Tasks (JOBS.md)`).
   - Include:
     - A short objective (“what this doc is for”).
     - Code references (paths to `app/` pages and `lib/api/` modules).
     - Any invariants or contracts other code must respect.

2. **Update the index (`docs/README.md`)**
   - Add a new row to the **Deep‑Dive Document Library** table:
     ```markdown
     | **[JOBS.md](./JOBS.md)** | **Jobs & Tasks**: How long‑running model operations are dispatched and monitored. |
     ```
   - Keep descriptions short but specific so new contributors can quickly choose the right document.

3. **Cross‑link from other docs**
   - If the new behavior affects auth, routing, or workspace behavior, add small “See also” links in `AUTHENTICATION.md`, `ROUTING.md`, or `WORKSPACE.md`.

---

## ✅ Style & Content Guidelines

- **Audience**: Assume the reader is a senior developer new to this codebase, not a beginner.
- **Tone**: Concise and factual. Show code paths and decisions; avoid prose that just restates the code.
- **File references**:
  - Use backticks for paths: `` `app/(user-data)/my-models/page.tsx` ``.
  - Prefer relative links between docs: `[Workspace](./WORKSPACE.md)`.
- **Keep behavior, not history**:
  - Summarize *current* behavior.
  - Use Git history and `.gsd/` docs for detailed change logs.

---

## 🔄 Keeping Docs in Sync with Code

Whenever you ship a non‑trivial change to one of these areas, **treat docs as part of the work**:

- **Auth changes** → update `AUTHENTICATION.md` (and index description if scope changes).
- **New backend integration** (e.g. new `modelseed-api` endpoints) → update `WORKSPACE.md` and `ARCHITECTURE.md`.
- **New user‑facing flows** → consider a short section in the relevant doc explaining where the flow starts (which `app/` page) and which APIs it depends on.

Commit messages for docs should explain *why* the behavior changed (e.g. `docs: document modelseed-api user data flows`).

---

## 🔍 Quick Checklist Before Merging

1. Does every new subsystem have a corresponding `docs/*.md` file?
2. Is `docs/README.md`’s table of contents up to date?
3. Do docs mention the correct services (PATRIC Workspace, `modelseed-api`) and URLs?
4. Have you removed or updated any statements that no longer match the code?

If all answers are “yes”, the documentation is in good shape for the next developer who lands here.

