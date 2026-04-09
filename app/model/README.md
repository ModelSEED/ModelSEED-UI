# Metabolism Model View (`/model`)

This directory contains the **Metabolic Model Detail View**. It allows users to browse the metabolic network of an organism.

## 🔗 Legacy Path Mapping
- **AngularJS Origin**: `/model`
- **Next.js Implementation**: `app/model/[...path]/page.tsx`
- **Pattern**: `[...path]` (Catch-all)

## 📁 Content breakdown
- `page.tsx`: A functional detail view that fetches model data (Reactions, Compounds, Genes) from the Workspace via `workspaceGet`.

### 🛡️ Access (WIP)
Accessing models stored in user workspaces requires a valid **KBase Auth token**. If not logged in, the view will only display public models.

## 🧪 Scientific data
- **Reactions**: All metabolic transformations in the model.
- **Compounds**: Metabolites and chemicals.
- **Genes**: Functional annotations associated with reactions.
- **Biomass**: The cellular objective function for modeling growth.
- **Gapfills**: List of gapfilling solutions applied to the model.
- **FBA**: Associated Flux Balance Analysis runs.

---
*Maintained at: `app/model/README.md`*

## Timestamp Log
- Updated: 2026-03-31 16:00:00 CDT - Reached 100% feature parity with legacy, including inline metadata editing and complete tab coverage.
