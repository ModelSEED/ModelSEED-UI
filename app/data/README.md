# Data Browser & Workspace Manager (`/data`)

The **Data Browser** is the core metabolic data file manager for ModelSEED. It is based on the **KBase Workspace service**.

## 🔗 Legacy Path Mapping
- **AngularJS Origin**: `/data`
- **Next.js Implementation**: `app/data/[...path]/page.tsx`

## 📁 Content breakdown
- `page.tsx`: A functional catch-all router for the **Workspace**. In the legacy UI, it's used to navigate and manage private and public data collections.

### 🛡️ Access control
Authentication is required to view a user's private data. This app uses the **KBase Auth service** to verify session tokens.

---
*Maintained at: `app/data/README.md`*

## Timestamp Log
- Updated: 2026-03-31 16:00:00 CDT - Workspace wrapper integration stable with the new REST Proxy.
