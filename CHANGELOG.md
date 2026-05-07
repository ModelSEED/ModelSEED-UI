# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [{{VERSION}}] - 2026-04-06

### Added
- Compound structure images on reaction pages with click-through to compound detail pages
- Comprehensive troubleshooting documentation and enhanced README with SSH tunnel setup instructions

### Changed
- Version display updated to show v{{VERSION}} from environment

### Fixed
- Invalid gapfill URL handling to gracefully return empty results instead of 404 errors
- Improved Reaction/Compound detail drawer with better typography and monospace formatting

### Documentation
- SSH tunnel requirements, environment variables, and account separation expectations

---

## [Unreleased] - TBD

### Known Issues
- RAST MS FBA not working
- PATRIC-only model submission
- Workspace write operations limited

### Expected Behaviors
- Models/Media differ between RAST and PATRIC (intentional system design)

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