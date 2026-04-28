# Public Assets Directory (`/public`)

This directory stores static assets necessary for the ModelSEED-UI application.

## Directory Structure

| Location | Description |
|-----------|-------------|
| `img/` | Images, application logos, and scientific diagrams. |
| `data/` | Static reference JSON files. |
| `favicon.ico` | Application browser tab icon. |

## Notable Assets

- `ModelSEED-logo.png`: Primary platform identity.
- `KBase-logo.png`: Backend provider identity.
- `about-biochem.png`: Educational diagram for the About page.

## Asset Resolution

Files residing here are hosted at the URL root `/`. When referencing inside Next.js components, format paths relative to root:

```tsx
<Image src="/img/ModelSEED-logo.png" alt="ModelSEED Logo" width={174} height={44} />
```
