# Scripts Directory (`/scripts`)

This directory contains utility scripts for the ModelSEED-UI project. These scripts are typically used for local development, testing API connectivity, or performing maintenance tasks outside of the core application runtime.

## Directory Structure

| Folder/File | Description |
|-----------|-------------|
| `local/` | Directory for untracked, developer-specific local scripts. This directory is included in `.gitignore` to prevent committing experimental or temporary code to the repository. |
| `test-poplar-api.mjs` | A Node.js script used to verify connectivity and endpoint functionality against the new `modelseed-api` backend (Poplar server). Used for integration smoke testing. |

## Usage Guidelines

1. **Local Development**: Any scripts created for temporary debugging, data parsing, or personal environment setup should be placed inside the `local/` subdirectory.
2. **ESM Modules**: Scripts in this directory are typically written as ES Modules (using the `.mjs` extension) to support modern JavaScript imports natively in Node.js.
3. **Execution**: Run scripts directly using Node.js from the repository root:
   ```bash
   node scripts/test-poplar-api.mjs
   ```

## Best Practices

- Do not place production build scripts or core application logic in this directory.
- Ensure that any script intended for shared use (e.g., database seeding, broad API testing) is committed to version control and documented here.
- Remove obsolete or broken scripts to maintain a clean repository.
