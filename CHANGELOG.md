# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-04-06

### Added
- **Compound Structure Images on Reaction Pages**: Reaction detail pages now display structure images for all compounds in the equation below the equation text. Images are clickable and link to compound detail pages. Missing images are gracefully hidden.
- **Comprehensive Troubleshooting Documentation**: Added `docs/TROUBLESHOOTING.md` with detailed solutions for common issues including SSH tunnel setup, backend connectivity, authentication, and data display problems.
- **Enhanced README Documentation**: Added SSH tunnel setup instructions, environment variable documentation, and common troubleshooting scenarios to main README.

### Changed
- **Version Bump**: Updated version from 0.1.0 to 3.0.0 per production requirements.
- **Version Display**: Updated About/Version page to display v3.0.0 instead of hardcoded v0.1.3.

### Fixed
- **Invalid Gapfill URL Handling**: Added URL validation in gapfill page to gracefully handle incomplete URLs (e.g., `/gapfill/user/modelseed`) by returning empty results instead of 404 errors.

### Documentation
- **SSH Tunnel Requirement**: Clearly documented that SSH tunnel to Poplar API server is required for local development and testing. The tunnel forwards `localhost:8000` to the backend API.
- **Environment Variables**: Documented all `NEXT_PUBLIC_*` environment variables with examples and usage.
- **Backend Connection Issues**: Added comprehensive troubleshooting for common connectivity issues (version page errors, empty media tab, authentication failures).
- **Account Separation Clarification**: Documented that different models/media lists between RAST and PATRIC accounts is **expected behavior**, not a bug. The two systems use separate workspace folders by design.

### Technical Details
- Added `extractCompoundIds()` utility function to parse compound IDs from reaction equations.
- Created `CompoundStructureGallery` component with hover effects, error handling, and responsive layout.
- Compound images served from: `https://minedatabase.mcs.anl.gov/compound_images/ModelSEED/{cpdID}.png`
- Added `isValidGapfillPath()` helper with comprehensive validation logic.

### Security
- ✅ No vulnerabilities found: `npm audit --omit=dev` confirms 0 vulnerabilities.

### Notes
- Media tab (`/list-media`) requires active SSH tunnel to populate. Code implementation is correct.
- RAST and PATRIC workspace separation is intentional system design.

---

## [Unreleased] - TBD

### Known Issues (Documented in issues.md)

- **RAST MS FBA not working**: FBA analysis fails for RAST-owned models
- **PATRIC-only model submission**: Model creation only works with PATRIC accounts
- **Workspace write operations limited**: Cannot save edits back to workspace

### Expected Behaviors (Not Bugs)

- **Models/Media differ between RAST and PATRIC**: This is **intentional system design**. RAST and PATRIC are separate systems with different workspace folders. A user with the same username on both systems will see different data because they point to different underlying directories. This is not a bug or limitation.

### Testing

- Added comprehensive E2E test suite (59 tests) covering all major workflows
- Added API test script for endpoint validation
- CI/CD pipeline with lint, typecheck, security audit, and tests

---

## [3] - 2026-03-27

Overview: ModelSEED-UI enhancements and bug fixes.

### Fixed

- Pop-up maintenance dialog on Plant Build page now displays without unnecessary title lines.
- Model landing page biomass tab now correctly displays data when available.
- User Data navigation tabs (My Models/My Media/My Jobs) now persist when navigating to model detail pages from user data section.

## [0.1.3] - 2026-03-25

Overview: Improved Build Model clarity and fixed reconstruction submission errors.

### Added

- Professional 2-sentence description to the "Build Model" page.

### Changed

- PlantSEED banner now correctly shows "v2.0 / v3.0" with requested double linebreak for clarity.
- Improved Reaction/Compound detail drawer with improved typography and monospace formatting for data values.
- Re-aligned Download Options menu to better match descriptive text on Model Landing page.
- Enhanced Biomass tab with auto-discovery fallback for models with missing biomass metadata.

### Fixed

- Version page now correctly displays v0.1.3 and loads changelog from project root.
- Removed prefixing from genome IDs in reconstruction jobs which was causing backend API failures.

## [0.1.2] - 2026-03-25

Overview: Final UI polish and parity fixes.

### Added

- Interactive pop-up for PlantSEED v2/v3 maintenance banner on Build Model page
- Expanded fallback discovery for biomass data in model objects

### Changed

- PlantSEED banner now correctly shows "v2.0 / v3.0" with requested linebreak
- Improved Reaction/Compound detail drawer with pretty-printed JSON and better array formatting
- Re-aligned Download Options menu to better match descriptive text

## [0.1.1] - 2026-03-24

### Changed

- PlantSEED banner now shows linebreak after "PlantSEED v2.0" text
- Download options link alignment fixed on model landing page
- Reaction details drawer now properly formatted with improved typography and scrolling
- Biomass data extraction improved to support multiple API response formats

### Fixed

- Version page now loads changelog from project root instead of legacy external directory

## [0.1.0] - 2026-03-24

Overview: Initial release of the ModelSEED-UI refactor. This version includes the new React/Next.js based user interface with key features for model building, viewing, and analysis.

### Added

- New Build Model pages with tabs for UPLOAD Plants FASTA, UPLOAD Microbes FASTA, PATRIC Microbes, and RAST Microbes
- Model detail pages with tabs for Reactions, Compounds, Genes, Compartments, Biomass, and Pathways
- FBA and Gapfilling job submission functionality
- Download options for models (SBML, JSON, TSV formats)
- Reference data pages for Biochemistry (Compounds, Reactions, Media)
- Version page with changelog
- Authentication and authorization guards

### Changed

- Migrated from legacy Angular/Flask application to Next.js 14 with Material-UI
- Implemented new API layer for ModelSEED backend communication
- Restructured project layout with app router and route groups

## Legacy Changelog

Below contains a summary of notable changes and deploy dates for each release from the legacy ModelSEED UI.

## [2.6.1] - 2020-07-31

- Addition of status and notes columns, with tooltips, for greater transparency

## [2.6.0] - 2020-06-10

- Rather significant release, making the entire reference data area as accessible as possible by not requiring a login

## [2.5.1] - 2019-07-02

- Several bug fixes related to biochemistry visualization and search

## [2.5.0] - 2019-06-06

- Major upgrade to biochemistry data and visualization

## [2.4.0] - 2018-11-12

- Fixed visualization of gapfilling results, they now can be seen in the Model reactions table

## [2.3.0] - 2018-09-23

- Fixed and restyled media choices when building a microbial model from file

## [2.2.0] - 2018-08-15

- Revamped Biochemistry tables including aliases and synonyms to search
- Improved "Reconstruct Model" behaviour for plant models
- Stylistic modifications and visual/search bugfixes for FBA and Gene tables

## [2.1.0] - 2018-01-02

- Minor stylistic modifications for major release
- Moved "Build Model" to main toolbar
- Improved media selection for Model Construction

## [2.0.0] - 2017-11-03

- Major refactor of ModelSEED.org interface and functionality

## [1.5.0-beta] - 2016-08-04

- Plants: tFBA, annotation, genome view, etc.

## [1.3.3-beta] - 2016-07-15

- Enable plants portion of app (pending service updates).
- Enable plant upload (pending service updates).

## [1.3.1-beta] - 2016-03-03

- Add permalink compound and reaction pages. e.g., [cpd00001](http://modelseed.org/biochem/compounds/cpd00001) and [rxn00001](http://modelseed.org/biochem/reactions/rxn00001)
- Add [Fusions](http://modelseed.org/projects/fusions) project
- Stylistic fixes

## [1.3.0-beta] - 2016-02-02

- Beta (early preview) version announced via email

## [1.2.1-alpha] - 2015-11-30

- Allow reconstruction from previously annotated genomes

## [1.2.0-alpha] - 2015-10-26

- Start public portion of site (researchers, publications, etc)
- Force login

## [1.1.4-alpha] - 2015-10-08

- URLs no longer require hashes

## [1.1.3-alpha]

- Temp fix for queries with spaces against public genome table
- Change columns in public genome table

## [1.1.2-alpha]

- Don't allow table for old model objects to avoid confusion in comparison of gapfilled data
- Fix |flux| button (default for heatmap)

## [1.1.1-alpha]

- Update model list after reconstruct
- Add gapfill data to model

## [1.1.0-alpha]

- Add media editor
- Add 'create new media' option
- Add delete, rename, 'can not overwrite' error message on media section
- Add ability to select custom media for reconstruct/fba/gapfilling
- Preserve last selected tab state on main pages
- Add gapfill page

## [1.0.0-alpha] - 2015-09-01

- Add comparison tools
- Remove sidebar
- Add hover-over main toolbar dropdown menus
- Add "About ModelSEED" page