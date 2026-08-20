'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { summarizeAtomFlows, type AtomMappingPair } from '@/lib/utils/atomMapping';

export interface AtomFlowDiagramProps {
    pairs: readonly AtomMappingPair[];
}

const LEFT_X = 120;
const RIGHT_X = 420;
const TOP_Y = 36;
const ROW_HEIGHT = 44;

export default function AtomFlowDiagram({ pairs }: AtomFlowDiagramProps): React.ReactElement | null {
    const flows = useMemo(() => summarizeAtomFlows(pairs), [pairs]);
    const groupedEdges = useMemo(
        () => new Set(
            pairs
                .filter((pair) => pair.hasSymmetryGroup)
                .map((pair) => `${pair.left.compoundId}>${pair.right.compoundId}`),
        ),
        [pairs],
    );

    if (flows.length === 0) return null;

    const fromIds = Array.from(new Set(flows.map((flow) => flow.from)));
    const toIds = Array.from(new Set(flows.map((flow) => flow.to)));
    const fromY = new Map(fromIds.map((id, index) => [id, TOP_Y + index * ROW_HEIGHT]));
    const toY = new Map(toIds.map((id, index) => [id, TOP_Y + index * ROW_HEIGHT]));
    const height = TOP_Y * 2 + (Math.max(fromIds.length, toIds.length) - 1) * ROW_HEIGHT;
    const largestTotal = Math.max(...flows.map((flow) => flow.total));
    const strokeWidth = (total: number) =>
        largestTotal === 0 ? 1.5 : 1.5 + ((total / largestTotal) * 6.5);

    return (
        <div>
            <svg
                role="img"
                aria-label="Reactant-to-product atom flow"
                viewBox={`0 0 540 ${height}`}
                width="100%"
                height={height}
            >
                {flows.map((flow) => {
                    const breakdown = Array.from(flow.byElement.entries())
                        .map(([element, count]) => `${element} ${count}`)
                        .join(', ');
                    return (
                        <line
                            key={`${flow.from}>${flow.to}`}
                            x1={LEFT_X}
                            y1={fromY.get(flow.from)}
                            x2={RIGHT_X}
                            y2={toY.get(flow.to)}
                            stroke="#00838f"
                            strokeOpacity="0.65"
                            strokeWidth={strokeWidth(flow.total)}
                            strokeDasharray={groupedEdges.has(`${flow.from}>${flow.to}`) ? '6 4' : undefined}
                        >
                            <title>{`${flow.from} to ${flow.to}: ${flow.total} atoms (${breakdown})`}</title>
                        </line>
                    );
                })}
                {fromIds.map((id) => (
                    <Link key={`from-${id}`} href={`/biochem/compounds/${id}`}>
                        <text x={LEFT_X} y={fromY.get(id)} textAnchor="end" dominantBaseline="middle">
                            {id}
                        </text>
                    </Link>
                ))}
                {toIds.map((id) => (
                    <Link key={`to-${id}`} href={`/biochem/compounds/${id}`}>
                        <text x={RIGHT_X} y={toY.get(id)} dominantBaseline="middle">
                            {id}
                        </text>
                    </Link>
                ))}
            </svg>
            <small>Counts are mapped atoms per compound pair; individual atom positions are not shown.</small>
            {groupedEdges.size > 0 && <small>A dashed edge carries at least one symmetry-grouped mapping.</small>}
        </div>
    );
}
