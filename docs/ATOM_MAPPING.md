# Atom Mapping (`ATOM_MAPPING.md`)

> **🤖 AI Agent Quick-Start**
> The `#N` numbers in `atom_mapping_data` are **not** RDKit atom indices and **not** SMILES
> atom positions. Never pass one into an atom-index or highlight-index array. Colour may be
> asserted at **(compound, element) block** granularity only. If you think you have found a
> way to colour individual atoms, read "Why per-atom colouring is not possible" first.

This document describes the atom-mapping data the ModelSEED biochemistry Solr index
publishes, exactly what the UI can and cannot derive from it, and the precise server-side
contract that would be required to render true per-atom and per-bond mappings.

---

## 📦 The data as published

Source core: `reactions_staging` on the Poplar Solr host. Reaction documents that carry a
mapping have:

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `has_atom_mapping` | boolean | Whether a mapping exists (32,877 reactions at time of writing). |
| `atom_mapping_data` | multi-valued string | The mapping itself, one relationship per value. |
| `atom_mapping_confidence` | string | Exactly two observed values: `clean` (25,058) and `salvaged` (7,819). |
| `atom_mapping_has_symmetry_groups` | boolean | Whether any relationship involves a symmetry-equivalent set. |

### Grammar of an `atom_mapping_data` entry

```
<entry>    ::= <side> "=" <side>
<side>     ::= <cpdId> ":" <atomRef>
<atomRef>  ::= <single> | "(" <single> (";" <single>)* ")"
<single>   ::= <ElementSymbol> "#" <index>
```

`rxn00002` (urea-carboxylate hydrolase), verbatim from the index:

```
cpd00001:O#1=cpd00011:(O#1;O#2)
cpd00742:(O#2;O#3)=cpd00011:(O#1;O#2)
cpd00742:C#1=cpd00011:C#1
cpd00742:C#2=cpd00011:C#1
cpd00742:N#1=cpd00013:N#1
cpd00742:N#2=cpd00013:N#1
cpd00742:O#1=cpd00011:(O#1;O#2)
```

`rxn00001` (diphosphate phosphohydrolase):

```
cpd00001:O#1=cpd00009:(O#1;O#2;O#3;O#4)
cpd00012:(O#1;O#2;O#3;O#4;O#5;O#6)=cpd00009:(O#1;O#2;O#3;O#4)
cpd00012:(P#1;P#2)=cpd00009:P#1
cpd00012:O#7=cpd00009:(O#1;O#2;O#3;O#4)
```

Observed properties of the grammar:

- The relation is **symmetric** and **element-preserving**: the element symbol is always the
  same on both sides of `=`.
- A parenthesised set means "these atoms are interchangeable for the purpose of this
  relationship" — a symmetry group, not an ordered pairing.
- Relationships are **many-to-many across compounds**. Over the live corpus, only **75.5 %**
  of `(reaction, compound, element)` blocks map to exactly one counterpart compound; the
  remaining **24.5 %** map to several (e.g. `cpd00025:O` → `[cpd00001, cpd00007]`).

### What `#N` actually indexes

`#N` is a **1-based index, per element, per compound, in InChI canonical atom order**.
It is not a position in the compound's SMILES string, not an RDKit atom index, and not an
RDKit atom-map number. See `lib/utils/atomMapping.ts:15-21`.

---

## 🚫 Why per-atom colouring is not possible today

To paint atom `O#2` of `cpd00742` you must answer: *which atom of the rendered molecule is
the second oxygen in InChI canonical order?* Three independent facts make that unanswerable
in the browser:

1. **The index carries no geometry.** `atom_mapping_data` has no coordinates, no bonds, and
   no atom-order key. It is a pure relationship between abstract atom identities.
2. **The compound documents carry no canonical-order source.** `compounds_staging` publishes
   `id`, `name`, `abbreviation`, `formula`, `charge`, `mass`, `inchikey`, `smiles`,
   `aliases`, `atom_count_*` and `has_structure`. There is **no InChI string, no molfile, no
   structure block, and no atom-order field** in any core. An InChIKey is a hash and cannot
   be inverted.
3. **The client-side toolkit cannot recover the order.** `@rdkit/rdkit` 2025.3.4 exposes
   `JSMol.get_inchi()` with no parameters; `get_aux_info()` and `get_canonical_ranking()` do
   not exist, and `RDKit_minimal.js` contains zero occurrences of AuxInfo. The InChI
   `/AuxInfo` layer — the only thing that maps InChI canonical numbers back to input atom
   order — is therefore unreachable.

Any client-side guess (matching by element in SMILES order, or by RDKit's own canonical
ranking) produces a mapping that *looks* authoritative and is *silently wrong*. The UI
refuses to do this. This is enforced as a product invariant:

> **No atom is rendered with a colour that asserts an atom-level correspondence the data
> cannot justify.**

---

## ✅ What the UI does instead

`lib/utils/atomMappingColors.ts` implements a **(compound, element) block model**:

1. Every `atom_mapping_data` entry is parsed into a pair of `(compoundId, element, indices)`
   blocks (`lib/utils/atomMapping.ts`).
2. Blocks of the same element are joined into **connected components** across compounds via
   their counterpart relationships (BFS over the adjacency graph). A component that spans at
   least two blocks in at least two compounds is colourable.
3. A component is labelled **one-to-one** when it has exactly two blocks and each has a
   single counterpart compound; otherwise it is labelled **merged** — which is the honest
   description of the 24.5 % many-to-one case, and of every symmetry group.
4. A block is coloured only when the number of mapped indices equals the compound's actual
   structural atom count for that element (`lib/utils/atomMappingColors.ts:137`). If the
   mapping covers only part of an element block, the whole element is *not* coloured and the
   member is named in the legend as uncoloured. This is the safety gate that keeps the
   colour a claim about the whole element block rather than about particular atoms.
5. Colour is then applied by **element symbol** through `MoleculeRenderer`'s `elementColors`
   prop, which paints every atom of that element in that compound — never a chosen index.

`rxn00002` therefore renders three groups — **C**, **N**, and a **merged O** spanning
`cpd00001`, `cpd00011` and `cpd00742` — with the legend stating that individual atom pairing
is not determined by the data.

---

## 📜 Server-side contract required for true per-atom mapping

Per-atom and per-bond colouring becomes possible, with no change to the safety invariant,
if the biochemistry index publishes **any one** of the following. They are listed in
ascending order of server effort; the first is sufficient.

### Option A — publish the structure the indices refer to (preferred)

Add to each compound document in `compounds_staging`:

| Field | Type | Requirement |
| :--- | :--- | :--- |
| `inchi` | string | The full standard InChI, **including the `/AuxInfo=` layer**. |
| `molfile` | string | The exact molblock the InChI was generated from. |

The AuxInfo `/N:` component gives the permutation from InChI canonical numbering to molfile
atom order. The client then renders the molfile (not the SMILES), and `El#N` resolves to a
concrete molfile atom index. **Both fields must come from the same generation run** — an
AuxInfo string paired with a different molblock is worse than no data.

### Option B — publish the resolved index directly

Add to each compound document:

| Field | Type | Requirement |
| :--- | :--- | :--- |
| `atom_order_smiles` | string | The exact SMILES the indices are aligned to. |
| `atom_mapping_index_map` | string | For each element, the mapping from `#N` to the 0-based atom position in `atom_order_smiles`, e.g. `O:1>0,2>3,3>5;C:1>1`. |

The client then renders `atom_order_smiles` and indexes it directly. This is the smallest
payload, but it hard-couples the index to one SMILES serialisation, so the field must be
regenerated whenever the structure is.

### Option C — publish atom-mapped reaction SMILES

Add to each reaction document:

| Field | Type | Requirement |
| :--- | :--- | :--- |
| `reaction_smiles_mapped` | string | A reaction SMILES with RDKit atom-map numbers, e.g. `[OH2:1].[C:2](=[O:3])…>>…`. |

This is the industry-standard form and requires no per-compound alignment at all: RDKit
parses the atom-map numbers natively. It also encodes bond fate, which is the only one of
the three options that makes **bond**-level colouring exact rather than inferred.

### Additionally useful, independent of the option chosen

- `stoichiometry` on the reaction document. It is **absent** today, so coefficients must be
  re-parsed from the equation string.
- A per-relationship confidence, rather than one `atom_mapping_confidence` for the whole
  reaction, so a `salvaged` reaction does not have to be presented as uniformly uncertain.
- An explicit symmetry-group identifier, so equivalent atoms can be shown as a named
  equivalence class instead of being inferred from the parentheses.

Until one of A, B or C lands, the block model above is the most specific claim the data
supports, and the UI will not exceed it.

---

## 🔗 Where this lives in the code

| Concern | File |
| :--- | :--- |
| Parsing `atom_mapping_data`, and the `#N` warning | `lib/utils/atomMapping.ts` |
| Connected-component block model, legend, safety gate | `lib/utils/atomMappingColors.ts` |
| Element→colour application onto RDKit SVG output | `lib/utils/moleculeHighlights.ts` |
| Molecule rendering and the `elementColors` prop | `components/ui/MoleculeRenderer.tsx` |
| The reaction equation canvas and its legend | `components/ui/ReactionStructureEquation.tsx` |
| Formula → element inventory | `lib/utils/chemicalFormula.ts` |
| Solr field selection for reactions and compounds | `lib/api/biochem.ts` |
