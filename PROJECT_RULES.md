# Mission Control Rules — GSD Methodology

> **Get Shit Done (GSD)**: A spec-driven, context-engineered development methodology for autonomous agents.
> These rules enforce disciplined, high-quality development and are the source of truth for all agents.

---

## 1. Core Principles

1. **Plan Before You Build** — No code without a finalized `SPEC.md` or approved `implementation_plan.md`.
2. **State Is Sacred** — Every significant action must update persistent memory in `.agent`, `.gemini`, or `.gsd`.
3. **Context Is Expensive** — Search before you read. Avoid loading large files blindly. Use `grep_search` and `find_by_name`.
4. **Verify Empirically** — No "trust me, it works". Every change requires proof (logs, screenshots, or test results).

---

## 2. Directory Hierarchy

- `.agent/`: Contains agent skills (instructions) and workflows.
- `.gemini/`: Gemini-specific adapters and `GEMINI.md`.
- `.gsd/`: Templates for SPEC, ROADMAP, STATE, etc.
- `PROJECT_RULES.md`: This file. The canonical source of truth.

---

## 3. Workflow Protocol

### Phase 1: Planning (/plan)
- Analyze requirements and decompose into executable phases in `ROADMAP.md`.
- Identify dependencies and risks.
- Update `SPEC.md` to reflect the technical design.

### Phase 2: Execution (/execute)
- Atomic commits for each task.
- Update `STATE.md` after every task completion.
- Maintain context hygiene.

### Phase 3: Verification (/verify)
- Run automated tests.
- Provide empirical evidence of success.
- Update `WALKTHROUGH.md` with results.

---

## 4. Agent Configuration

### For Cursor
- Cursor should reference this file and the `.agent` skills for behavior.
- Use `@SKILL.md` for specific domain knowledge.

### For Antigravity / Windsurf
- Antigravity must follow instructions in `.windsurfrules`.
- Use the slash commands defined in `.opencode/commands`.
- Workflows are located in `.agent/workflows`.

### For Claude Code
- Claude should follow the `CLAUDE.md` adapter (if present) and adhere to GSD workflows.

---

*Mission Control: ACTIVE*
*Rules Version: 1.0.0*
