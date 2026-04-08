# Genomic Data & Features (`/genome` & `/feature`)

This view provide users with insight into the **Genome Sequence and Annotations** associated with their models.

## 🔗 Legacy Path Mapping
- **AngularJS Origin**: `/genome`, `/feature`
- **Next.js Implementation**: `app/genome/[...path]/page.tsx`, `app/feature/[...path]/page.tsx`

## 📁 Content breakdown
- `app/genome/[...path]/page.tsx`: Displays high-level genome annotation, contigs, and metadata.
- `app/feature/[...path]/page.tsx`: A focused view on a specific **Gene (Feature)** within a genome.

### 🧬 Scientific importance
Accurate genome annotation is the foundation for any metabolic model. These views help researchers identify the genomic evidence for individual metabolic reactions.

--- 
*Maintained at: `app/genome/README.md` & `app/feature/README.md`*

## Timestamp Log
- Updated: 2026-03-31 16:00:00 CDT - Integration with modelseed-api and Workspace parity completed.
