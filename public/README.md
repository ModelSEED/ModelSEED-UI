# Public Assets Directory (`/public`)

This directory contains **Static Assets** that are served by the application.

## 📁 Content Breakdown

| Folder/File | Description |
|-----------|-------------|
| `img/` | **Imagery**: Logos, scientific diagrams, and UI icons. |
| `data/` | **Static JSON**: Small, static reference files (e.g., icons, fonts). |
| `favicon.ico` | **UI Detail**: The ModelSEED bookmark and browser tab icon. |

## 🧬 Scientific Imagery
- **`ModelSEED-logo.png`**: The main purple/white project identity.
- **`KBase-logo.png`**: The identity of the KBase platform that powers the backend.
- **`about-biochem.png`**: Scientific visualization of metabolic networks for the About page.

## 🖼️ Usage in Code
Assets in this folder are accessible via the root path `/` in your components. For example:
```tsx
<Image src="/img/ModelSEED-logo.png" alt="Logo" width={174} height={44} />
```

--- 
*Last Updated: 2026-03-11*
