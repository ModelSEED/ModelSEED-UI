# Atom Mapping (`ATOM_MAPPING.md`)

> **🤖 AI Agent Quick-Start**
> The `#N` numbers in `atom_mapping_data` are **not** RDKit atom indices and **not** SMILES
> atom positions. They are 1-based positions within an element in InChI canonical (Hill)
> order. Resolve them through the InChI structure method described below; never use them as
> renderer indices directly.

This document describes the atom-mapping data published by the ModelSEED biochemistry
Solr index, the precise claims the UI can now make, and the remaining server-side contract
needed to identify a unique atom in every case.

---

## 📦 The data as published

Reaction mappings come from `reactions_staging` on the Poplar Solr host. A mapped reaction
has `has_atom_mapping`, multi-valued `atom_mapping_data`, `atom_mapping_confidence`, and
`atom_mapping_has_symmetry_groups` fields. An entry has this grammar:

```
<entry>    ::= <side> "=" <side>
<side>     ::= <cpdId> ":" <atomRef>
<atomRef>  ::= <single> | "(" <single> (";" <single>)* ")"
<single>   ::= <ElementSymbol> "#" <index>
```

For example, `cpd00009:P#1` and `cpd00012:(O#1;O#2)` refer to one phosphorus and an
interchangeable oxygen set. Relations are symmetric and element-preserving; parenthesised
sets are symmetry groups, not ordered pairings. Relationships may also be many-to-many
across compounds.

`#N` is a **1-based index, per element, per compound, in InChI canonical (Hill) order**.
It is not a SMILES position, RDKit atom index, or RDKit atom-map number. This distinction is
material: for `cpd00009` (H3O4P), RDKit built from stored SMILES orders heavy atoms as
`[O,P,O,O,O]`, while the InChI Hill order is `[O,O,O,O,P]`. Treating `P#1` as a renderer
index would colour a chemically false atom.

The `structures_staging` core at `http://poplar:8983/solr` is the only published raw-InChI
source. Its 45,708 documents expose `id`, `inchi`, `inchikey`, `smiles`, and `svg`; the
compound core exposes only SMILES and InChIKey. Coverage is incomplete: this is about 25% of
180,050 compounds, 15,330 structure documents have no `inchi`, and 8,765 have no `smiles`.
The core is not currently reachable through the public `https://<site>/solr` proxy: both
staging.modelseed.org and modelseed.org return 404. That deployment gap blocks this method
outside a direct Poplar-backed environment.

The stored `svg` is a plain, unhighlighted RDKit depiction. It carries no mapping
information and is used only as a fallback picture when local RDKit cannot render; highlights
are always drawn locally.

---

## ✅ What the UI can resolve

The UI uses the structures core to make a conservative correspondence between canonical atom
references and the RDKit heavy-atom graph built from stored SMILES:

1. It parses the InChI formula layer in Hill order to map each canonical number to an element,
   then parses the `/c` connection layer into a canonical-numbered edge list.
2. It enumerates **all** element-preserving isomorphisms from that canonical graph onto the
   RDKit graph. If an enumeration cap is reached, the result is discarded rather than returned.
3. For canonical atom `i`, `orbit(i)` is the union of every RDKit target of `i` over all
   isomorphisms. It therefore contains the true rendered atom, but can contain
   symmetry-equivalent atoms.
4. For rendered atom `a`, `candidates(a) = { i : a ∈ orbit(i) }`. A mapping group colours
   `a` only when `candidates(a)` is non-empty and is a subset of that group's canonical
   indices. A bond is coloured only when both endpoints are coloured for the same group.

This is deliberately not a guess from SMILES order. In the live sample, 69 of 76 compounds
resolve; only 8 resolve uniquely, with mean orbit size 2.40 and maximum 6. A
symmetry-equivalent result is therefore the common, honest outcome.

### Precision disclosed for every participant

The reaction equation and legend disclose one of four levels per participant:

| Precision | Meaning |
| :--- | :--- |
| `exact-atom` | The safe candidate rule identifies the drawn atom(s) without ambiguity. |
| `symmetry-orbit` | The highlight is restricted to a symmetry-equivalent orbit that contains the true atom, but does not identify one unique atom. |
| `element-block` | The UI can make only a whole-element claim: every reference for that element is in one group and mapped indices are exactly the contiguous set `1..count`. |
| `unresolved` | No safe highlight is made; the UI reports a machine-readable reason. |

No level claims an ordered atom-to-atom pairing that `atom_mapping_data` does not publish.

---

## 📜 Remaining gap: server-side contract for unique identity

The orbit method proves containment, not unique identity: two or more graph-symmetric atoms
can remain indistinguishable. A server-published canonical atom-index map (**Option B**) or
mapped reaction SMILES (**Option C**) is required to collapse that ambiguity.

### Option B — publish a canonical-to-renderer index map

For each structure, backend owners must publish the exact structure string the client is to
render and an atom-index map whose semantics are unambiguous: for every InChI canonical
`Element#N`, it must name the corresponding **0-based atom index in that exact structure
string**. The structure string and map must be generated together and remain paired whenever
the structure changes. A field such as `atom_mapping_index_map` is sufficient only after those
field semantics, indexing base, canonical-order source, and renderer structure are confirmed.

### Option C — publish mapped reaction SMILES

Alternatively, each reaction can publish `reaction_smiles_mapped`: reaction SMILES whose
atoms have stable RDKit atom-map numbers and whose reactant/product map numbers identify the
same atom. Backend owners must confirm that those numbers are authoritative for the displayed
structures and preserve the mapping semantics. This form also publishes bond fate directly.

Until either contract is available, the four-level disclosure above is the most precise claim
the UI makes. The structures-core method safely narrows highlights; it does not convert a
symmetry class into a unique identity.

---

## 🔗 Where this lives in the code

| Concern | File |
| :--- | :--- |
| Structures-core client | `lib/api/structures.ts` |
| Structures collection configuration | `lib/api/config.ts` |
| InChI Hill-order and connection parsing | `lib/utils/inchiAtomOrder.ts` |
| Isomorphism orbits and safe mapping colours | `lib/utils/atomOrbitColors.ts` |
| Local highlights, bonds, graph disclosure, and SVG fallback | `components/ui/MoleculeRenderer.tsx` |
| Structures query, precision disclosure, legend, and error notice | `components/ui/ReactionStructureEquation.tsx` |
