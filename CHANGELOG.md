# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-03-24

Overview: UI fixes and improvements for Phase 33.

### Added

- Media selection dialog for FBA and Gapfilling job submission
- Pop-up dialog for PlantSEED maintenance message when clicking disabled "UPLOAD Plants FASTA" tab

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