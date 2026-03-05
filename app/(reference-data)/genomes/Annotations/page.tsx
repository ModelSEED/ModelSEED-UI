'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { workspaceGet } from '@/lib/api/workspace';

interface SubsystemItem {
    id: string; // role
    role: string;
    subsystems: string[];
    classes: string[];
    pathways: string[];
    reactions: string[];
    features: string[];
}

const PLANT_SUBSYSTEM_BASE = 'http://pubseed.theseed.org/SubsysEditor.cgi?page=ShowSubsystem&subsystem=';
const PLANT_PATHWAY_BASE = 'http://pmn.plantcyc.org/ARA/NEW-IMAGE?type=PATHWAY&object=';
const PLANT_FEATURE_BASE = '/feature/plantseed/Genomes/Athaliana-TAIR10/';

function MultiLineList({ items }: { items: string[] }) {
    if (!items || items.length === 0) return <>-</>;
    return (
        <span style={{ display: 'inline-block', maxWidth: 420 }}>
            {items.map((name, idx) => (
                <span key={`${name}-${idx}`}>
                    {name.replace(/_/g, ' ')}
                    {idx < items.length - 1 && <br />}
                </span>
            ))}
        </span>
    );
}

function SubsystemLinks({ names }: { names: string[] }) {
    if (!names || names.length === 0) return <>-</>;
    return (
        <span style={{ display: 'inline-block', maxWidth: 420 }}>
            {names.map((name, idx) => (
                <span key={`${name}-${idx}`}>
                    &middot;{' '}
                    <a
                        href={`${PLANT_SUBSYSTEM_BASE}${name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {name.replace(/_/g, ' ')}
                    </a>
                    {idx < names.length - 1 && <br />}
                </span>
            ))}
        </span>
    );
}

function PathwayLinks({ names }: { names: string[] }) {
    if (!names || names.length === 0) return <>-</>;
    return (
        <span style={{ display: 'inline-block', maxWidth: 420 }}>
            {names.map((name, idx) => (
                <span key={`${name}-${idx}`}>
                    <a
                        href={`${PLANT_PATHWAY_BASE}${name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {name}
                    </a>
                    {idx < names.length - 1 && <br />}
                </span>
            ))}
        </span>
    );
}

function FeatureLinks({ ids }: { ids: string[] }) {
    if (!ids || ids.length === 0) return <>-</>;
    return (
        <span style={{ display: 'inline-block', maxWidth: 260 }}>
            {ids.map((id, idx) => (
                <span key={`${id}-${idx}`}>
                    <Link href={`${PLANT_FEATURE_BASE}${id}`} style={{ color: '#1976d2' }}>
                        {id}
                    </Link>
                    {idx < ids.length - 1 && <br />}
                </span>
            ))}
        </span>
    );
}

export default function SubsystemsPage() {
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'role', sort: 'asc' }]);
    const [search, setSearch] = useState('');

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['subsystemsWorkspaceGet'],
        queryFn: async () => {
            const data = await workspaceGet(['/plantseed/Data/annotation_overview']);
            // Workspace API wraps "get" differently. result[0] is the main item, and result[0][0] has the payload.
            // Inside result[0][0][1], there's the stringified JSON or structured dict depending on python RPC. 
            // Often it's JSON string in data[0][1].
            let payloadStr = data[0]?.[1];
            if (!payloadStr) return [];

            let parsed: any[];
            try {
                parsed = JSON.parse(payloadStr);
            } catch (e) {
                console.error("Failed to parse subsystems JSON", e);
                return [];
            }

            return parsed.map((item: any, idx: number) => ({
                id: item.role || `subsystem-${idx}`,
                role: item.role || 'N/A',
                subsystems: item.subsystems ? Object.keys(item.subsystems) : [],
                classes: item.classes ? Object.keys(item.classes) : [],
                pathways: item.pathways ? Object.keys(item.pathways) : [],
                reactions: item.reactions ? Object.keys(item.reactions) : [],
                features: item.features ? Object.keys(item.features) : [],
            })) as SubsystemItem[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const filteredRows = rows.filter((row) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (row.role.toLowerCase().includes(q) ||
            row.subsystems.join(' ').toLowerCase().includes(q) ||
            row.classes.join(' ').toLowerCase().includes(q) ||
            row.pathways.join(' ').toLowerCase().includes(q));
    });

    const columns: GridColDef<SubsystemItem>[] = useMemo(
        () => [
            {
                field: 'role',
                headerName: 'Role',
                width: 360,
            },
            {
                field: 'subsystems',
                headerName: 'Subsystems',
                width: 260,
                renderCell: (params) => <SubsystemLinks names={params.row.subsystems} />,
                sortable: false,
            },
            {
                field: 'classes',
                headerName: 'Classes',
                width: 220,
                renderCell: (params) => <MultiLineList items={params.row.classes} />,
                sortable: false,
            },
            {
                field: 'pathways',
                headerName: 'Pathways',
                width: 260,
                renderCell: (params) => <PathwayLinks names={params.row.pathways} />,
                sortable: false,
            },
            {
                field: 'reactions',
                headerName: 'Reactions',
                width: 200,
                renderCell: (params) => <MultiLineList items={params.row.reactions} />,
                sortable: false,
            },
            {
                field: 'features',
                headerName: 'Features',
                width: 220,
                renderCell: (params) => <FeatureLinks ids={params.row.features} />,
                sortable: false,
            },
        ],
        [],
    );

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Subsystems
            </Typography>
            <Box sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Search subsystems..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ width: 400 }}
                />
            </Box>
            <DataGrid<SubsystemItem>
                rows={filteredRows}
                columns={columns}
                loading={isLoading}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                getRowHeight={() => 'auto'}
                autoHeight
                sx={{
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fff',
                    '& .MuiDataGrid-cell': {
                        py: 1,
                        alignItems: 'flex-start',
                    },
                }}
            />
        </>
    );
}
