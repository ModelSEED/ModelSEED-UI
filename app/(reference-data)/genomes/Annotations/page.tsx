'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { parseWorkspaceGetObject, workspaceGet } from '@/lib/api/workspace';
import { USE_NEW_PROXY } from '@/lib/api/config';
import DataControlHeader from '@/components/layout/DataControlHeader';
import { useToolbarGridFiltering } from '@/lib/hooks/useToolbarGridFiltering';

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
                    <Link href={`${PLANT_SUBSYSTEM_BASE}${name}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00acc1', textDecoration: 'none' }}>
                        {name.replace(/_/g, ' ')}
                    </Link>
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
                    <Link href={`${PLANT_PATHWAY_BASE}${name}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00acc1', textDecoration: 'none' }}>
                        {name}
                    </Link>
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
                    <Link href={`${PLANT_FEATURE_BASE}${id}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
                        {id}
                    </Link>
                    {idx < ids.length - 1 && <br />}
                </span>
            ))}
        </span>
    );
}

function ReactionLinks({ ids }: { ids: string[] }) {
    if (!ids || ids.length === 0) return <>-</>;
    return (
        <span style={{ display: 'inline-block', maxWidth: 260 }}>
            {ids.map((id, idx) => (
                <span key={`${id}-${idx}`}>
                    <Link href={`/biochem/reactions/${id}`} style={{ color: '#00acc1', textDecoration: 'none' }}>
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

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['subsystemsWorkspaceGet', USE_NEW_PROXY],
        queryFn: async () => {
            const data = await workspaceGet(['/plantseed/Data/annotation_overview']);
            const parsed = parseWorkspaceGetObject<unknown[]>(data);
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.map((item, idx) => {
                const row = item as {
                    role?: string;
                    subsystems?: Record<string, unknown>;
                    classes?: Record<string, unknown>;
                    pathways?: Record<string, unknown>;
                    reactions?: Record<string, unknown>;
                    features?: Record<string, unknown>;
                };
                return {
                    id: row.role || `subsystem-${idx}`,
                    role: row.role || 'N/A',
                    subsystems: row.subsystems ? Object.keys(row.subsystems) : [],
                    classes: row.classes ? Object.keys(row.classes) : [],
                    pathways: row.pathways ? Object.keys(row.pathways) : [],
                    reactions: row.reactions ? Object.keys(row.reactions) : [],
                    features: row.features ? Object.keys(row.features) : [],
                } as SubsystemItem;
            });
        },
        staleTime: 5 * 60 * 1000,
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
                renderCell: (params) => <ReactionLinks ids={params.row.reactions} />,
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

    const {
        filteredRows,
        handleFilterModelChange,
        handleToolbarApplyFilterModel,
    } = useToolbarGridFiltering<SubsystemItem>({
        rows,
        onFilterApplied: () => setPaginationModel((prev) => ({ ...prev, page: 0 })),
    });

    return (
        <>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Subsystems
            </Typography>
            <DataGrid<SubsystemItem>
                rows={filteredRows}
                columns={columns}
                loading={isLoading}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                filterMode="server"
                onFilterModelChange={handleFilterModelChange}
                showToolbar
                slots={{ toolbar: DataControlHeader }}
                slotProps={{
                    toolbar: {
                        showQuickFilter: true,
                        onApplyFilterModel: handleToolbarApplyFilterModel,
                    },
                }}
                hideFooter
                disableColumnMenu
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
