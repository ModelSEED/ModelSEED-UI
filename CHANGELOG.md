# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - TBD

### Known Issues
- RAST MS FBA not working
- PATRIC-only model submission
- Workspace write operations limited

### Expected Behaviors
- Models/Media differ between RAST and PATRIC (intentional system design)

---

## [3.4.0] - 2026-08-21

### Added
- Solr reaction, compound and structure lookups can now each use their own endpoint and core through separate environment variables, while retaining the shared Solr base when no per-corpus value is set
- An optional server-side proxy lets a deployment or local checkout serve Solr from its own origin

### Documentation
- Documented the full Solr environment surface and endpoint switching scenarios for legacy, Solr 9, temporary, and proxied instances

### Fixed
- Structure-core environment overrides now reach browser lookups instead of silently falling back to the shared endpoint

---

## [3.3.0] - 2026-08-21

### Added
- Reaction structure equations now resolve atom-mapping colours from raw InChI canonical order through the structures Solr core, rather than treating canonical `#N` references as SMILES or renderer positions
- Each mapped participant and the legend now disclose whether a highlight is an exact atom, a symmetry-equivalent orbit, a whole-element block, or unresolved, so researchers can see precisely what the mapping supports

### Fixed
- Atom-mapping highlights no longer assign chemically false colours when InChI canonical order diverges from stored-SMILES order

---

## [3.2.0] - 2026-08-20

### Added
- Reaction structure equations now use an open, continuous canvas with prominent common names, secondary IDs, formulas and charges; plain `+` and direction operators; and compound-page links
- Every reaction participant that has a structure is now drawn, including small species such as water, CO2 and ammonium; only heavy-atom-free species such as H+ stay textual, and they keep their name, formula, charge and compound link
- Reaction atom mappings now colour atoms and bonds by mapped group across reactants and products, with a legend that discloses mappings that cannot safely be coloured
- Atom mappings in which several compounds contribute the same element to one product are now coloured as one merged group, and the legend states plainly that individual atom pairing is not determined by the data; group members that are only partially covered are named as uncoloured rather than dropped
- Each participant shows a labelled colour-dot row naming its mapped elements, so colour is never the only carrier of meaning
- Mapping colours are applied only to fully covered, mutually mapped compound-element blocks, never by treating InChI canonical-order `#N` indices as renderer atom indices
- Compound and reaction detail pages now list every thermodynamics record returned by the upgraded Solr schema, one row per source with energy, error and (for reactions) direction operator
- Compound detail page now shows all pKa and pKb values instead of only the first
- Reaction detail page now shows an atom-mapping summary with per-compound element counts, a confidence indicator and an expandable raw list
- Reaction atom mappings now disclose symmetry-equivalent groups without claiming a specific atom correspondence
- All of the above is feature-detected, so pages render exactly as before against the current production Solr

### Fixed
- Reaction detail pages now read the live Solr `atom_mapping_data` field while retaining legacy `atom_mapping` fallback

### Changed
- Replaced the flat reaction atom-flow diagram with the structure canvas; the raw mapping list remains available as secondary detail
- Reaction thermodynamics direction agreement is now derived from the per-source direction operators rather than a single server flag, and reports three states: "Sources agree on direction" (all operators identical), "Sources could agree on direction" (only one angle-bracket direction, optionally mixed with `=`) and "Sources disagree on direction" (both `>` and `<` present)

### Known Issues
- RAST MS FBA not working
- PATRIC-only model submission
- Workspace write operations limited

### Expected Behaviors
- Models/Media differ between RAST and PATRIC (intentional system design)

---

## [3.1.0] - 2026-08-04

### Added
- User feedback FAB and dialog with `/api/feedback` proxy route and unit test
- GitHub issue templates, pull request template, and CODEOWNERS
- GitHub Issues link beside Contact us in the homepage support section

### Fixed
- Production `npm audit` findings resolved: Next.js upgraded to **16.3.0**,
  `eslint-config-next` upgraded to **16.3.0**, and `postcss` override bumped
  to **8.5.25** to close high-severity advisories

---

## [3.0.1] - 2026-05-12

### Added
- Find-in-page style search replacing the legacy search bar across the application
- Multiple filter rows with AND/OR logic in the DataControlHeader toolbar
- Case-insensitive Solr matching via case-variant filter clauses
- Hover tooltips and popup dialog for pathway visualization in the reactions table
- Reaction comments API route with modal UI integration
- PlantSEED copy functionality with editing restrictions for reconstructed models
- Branch name and upstream repository link displayed on the `/about/version` screen
- Compound synonym formatting with chemistry-aware scripts and improved list layout
- Gene reactions rendered as linked chips on model detail pages
- Production-quality polish applied to 8 secondary pages

### Changed
- Compound detail and reaction detail pages stabilized with improved metadata presentation
- Reaction structure cards fixed and compound detail refined

### Fixed
- Compounds Solr quick search repaired (was using invalid ontology field)
- DataControlHeader hardened across all grid consumers to prevent filter state loss
- Dual-backend filtering in search hardened
- Grid state preserved when using `onApplyFilterModel` for server-side pagination
- Toolbar filter intent preserved correctly across community grid constraint changes
- FBA detail data now loaded by `fba_id` instead of incorrect reference
- Model detail pages now use canonical model ref for both FBA and gapfill data
- Gapfill page fixed to properly parse solution data and handle incorrect API refs
- Explicit unavailable-image placeholders added to prevent broken image UI
- Filtered row count now used in CustomPagination for accurate display
- JSON parse error handling in the comments route returns 400 on malformed input
- Boolean parsing in the comments route fixed with explicit `typeof` check
- React key uniqueness enforced in ChemicalEquation token rendering
- Next.js upgraded to patched **16.2.6** to resolve high-severity advisories

---

## [3.0.0] - 2026-04-06

### Added
- Compound structure images on reaction pages with click-through to compound detail pages
- Comprehensive troubleshooting documentation and enhanced README with SSH tunnel setup instructions

### Changed
- Version display updated to show v{{VERSION}} from environment

### Fixed
- Invalid gapfill URL handling to gracefully return empty results instead of 404 errors
- Improved Reaction/Compound detail drawer with better typography and monospace formatting

---

## [3] - 2026-03-27

### Fixed
- Plant build maintenance dialog display
- Model landing page biomass tab display
- User data navigation tab persistence

## [0.1.3] - 2026-03-25

### Added
- Build Model page description

### Changed
- PlantSEED banner formatting and clarity
- Biomass tab with auto-discovery fallback

### Fixed
- Genome ID prefixing in reconstruction jobs

## [0.1.2] - 2026-03-25

### Added
- PlantSEED v2/v3 maintenance banner

### Changed
- Reaction/Compound detail drawer formatting

## [0.1.1] - 2026-03-24

### Changed
- PlantSEED banner and download options link alignment

### Fixed
- Version page changelog loading from project root

## [0.1.0] - 2026-03-24

### Added
- Build Model pages with FASTA upload, PATRIC, and RAST options
- Model detail pages (Reactions, Compounds, Genes, Compartments, Biomass, Pathways)
- FBA and Gapfilling job submission
- Model download options (SBML, JSON, TSV)
- Biochemistry reference pages (Compounds, Reactions, Media)
- Authentication and authorization

### Changed
- Migrated from Angular/Flask to Next.js 14 with Material-UI

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

- Add permalink compound and reaction pages
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