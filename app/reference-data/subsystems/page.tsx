'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { workspaceGet } from '@/lib/api/workspace';

interface SubsystemItem {
    id: string; // role
    role: string;
    subsystems: string;
    classes: string;
    pathways: string;
    reactions: string;
    features: string;
}

const columns: GridColDef<SubsystemItem>[] = [
    { field: 'role', headerName: 'Role', width: 350 },
    { field: 'subsystems', headerName: 'Subsystems', width: 250 },
    { field: 'classes', headerName: 'Classes', width: 200 },
    { field: 'pathways', headerName: 'Pathways', width: 200 },
    { field: 'reactions', headerName: 'Reactions', width: 150 },
    { field: 'features', headerName: 'Features', width: 150 },
];

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
                subsystems: item.subsystems ? Object.keys(item.subsystems).join('; ') : 'N/A',
                classes: item.classes ? Object.keys(item.classes).join('; ') : 'N/A',
                pathways: item.pathways ? Object.keys(item.pathways).join('; ') : 'N/A',
                reactions: item.reactions ? Object.keys(item.reactions).join('; ') : 'N/A',
                features: item.features ? Object.keys(item.features).join('; ') : 'N/A',
            })) as SubsystemItem[];
        },
        staleTime: 5 * 60 * 1000,
    });

    const filteredRows = rows.filter((row) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (row.role.toLowerCase().includes(q) ||
            row.subsystems.toLowerCase().includes(q) ||
            row.classes.toLowerCase().includes(q) ||
            row.pathways.toLowerCase().includes(q));
    });

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
                autoHeight
                sx={{
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fff',
                }}
            />
        </>
    );
}
