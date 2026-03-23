'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import NextLink from 'next/link';
import { workspaceLs, workspaceDownloadUrl } from '@/lib/api/workspace';
import ShowMetadataDialog from '@/components/ui/ShowMetadataDialog';

interface WorkspaceItem {
    id: string;
    name: string;
    path: string;
    type: string;
    size: number;
    modDate: string;
    owner: string;
    isFolder: boolean;
    rawMeta: unknown[];
}

function parseWorkspaceLsEntry(entry: unknown[], parentPath: string): WorkspaceItem {
    // Workspace ls returns arrays: [name, type, path, timestamp, id, owner, size, user_meta, auto_meta, shocknode, ...]
    const name = String(entry[0] || '');
    const type = String(entry[1] || 'unknown');
    const path = String(entry[2] || `${parentPath}/${name}`);
    const timestamp = entry[3] ? new Date(String(entry[3])).toLocaleString() : '';
    const size = Number(entry[6]) || 0;
    const owner = String(entry[5] || '');
    const isFolder = type === 'folder' || type === 'modelfolder';

    return {
        id: path,
        name,
        path,
        type,
        size,
        modDate: timestamp,
        owner,
        isFolder,
        rawMeta: entry,
    };
}

function formatSize(bytes: number): string {
    if (bytes === 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function DataBrowserPage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const workspacePath = `/${resolvedParams.path.join('/')}`;

    const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
    const [selectedItemMeta, setSelectedItemMeta] = useState<WorkspaceItem | null>(null);

    // Fetch directory listing
    const { data, isLoading, error } = useQuery({
        queryKey: ['workspace-ls', workspacePath],
        queryFn: async () => {
            const result = await workspaceLs([workspacePath]);
            return result;
        },
    });

    // Parse the workspace listing into items
    const items = useMemo<WorkspaceItem[]>(() => {
        if (!data) return [];

        // Data structure: { "path": [[entry1], [entry2], ...] }
        const pathData = data[workspacePath];
        if (!Array.isArray(pathData)) return [];

        return pathData
            .map((entry) => {
                if (!Array.isArray(entry)) return null;
                return parseWorkspaceLsEntry(entry, workspacePath);
            })
            .filter((item): item is WorkspaceItem => item !== null)
            .sort((a, b) => {
                // Folders first, then alphabetical
                if (a.isFolder && !b.isFolder) return -1;
                if (!a.isFolder && b.isFolder) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [data, workspacePath]);

    // Build breadcrumb segments
    const breadcrumbs = useMemo(() => {
        const parts = workspacePath.split('/').filter(Boolean);
        return parts.map((part, index) => ({
            name: part,
            path: '/' + parts.slice(0, index + 1).join('/'),
        }));
    }, [workspacePath]);

    const handleRowClick = (item: WorkspaceItem) => {
        if (item.isFolder) {
            router.push(`/data${item.path}`);
        } else {
            // For files, determine route based on type
            const type = item.type.toLowerCase();
            if (type === 'model' || type === 'fbamodel') {
                router.push(`/model${item.path}`);
            } else if (type === 'genome') {
                router.push(`/genome${item.path}`);
            } else if (type === 'fba') {
                router.push(`/fba${item.path}`);
            } else if (type === 'gapfill' || type === 'gapfilling') {
                router.push(`/gapfill${item.path}`);
            } else if (type === 'media') {
                router.push(`/media${item.path}`);
            } else {
                // Show metadata for unknown types
                setSelectedItemMeta(item);
                setMetadataDialogOpen(true);
            }
        }
    };

    const handleShowMetadata = (item: WorkspaceItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedItemMeta(item);
        setMetadataDialogOpen(true);
    };

    const handleDownload = async (item: WorkspaceItem, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const result = await workspaceDownloadUrl({ objects: [item.path] });
            if (result && typeof result === 'object' && 'url' in result) {
                window.open(String(result.url), '_blank');
            }
        } catch (err) {
            console.error('Download failed:', err);
            alert('Download is currently unavailable. Please try again later.');
        }
    };

    const columns: GridColDef<WorkspaceItem>[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 200,
            renderCell: (params: GridRenderCellParams<WorkspaceItem>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {params.row.isFolder ? (
                        <FolderIcon sx={{ color: 'primary.main' }} />
                    ) : (
                        <InsertDriveFileIcon sx={{ color: 'text.secondary' }} />
                    )}
                    <span>{params.value}</span>
                </Box>
            ),
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params: GridRenderCellParams<WorkspaceItem>) => (
                <Chip
                    label={params.value}
                    size="small"
                    variant="outlined"
                    color={params.row.isFolder ? 'primary' : 'default'}
                />
            ),
        },
        {
            field: 'size',
            headerName: 'Size',
            width: 100,
            valueFormatter: (value: number) => formatSize(value),
        },
        {
            field: 'modDate',
            headerName: 'Modified',
            width: 160,
        },
        {
            field: 'owner',
            headerName: 'Owner',
            width: 120,
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 100,
            sortable: false,
            renderCell: (params: GridRenderCellParams<WorkspaceItem>) => (
                <Box>
                    <Tooltip title="Show metadata">
                        <IconButton size="small" onClick={(e) => handleShowMetadata(params.row, e)}>
                            <InfoOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {!params.row.isFolder && (
                        <Tooltip title="Download">
                            <IconButton size="small" onClick={(e) => handleDownload(params.row, e)}>
                                <DownloadIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            ),
        },
    ];

    // Convert raw metadata to displayable format
    const metadataEntries = useMemo(() => {
        if (!selectedItemMeta) return [];
        const entry = selectedItemMeta.rawMeta;
        return [
            { key: 'name', value: String(entry[0] ?? '') },
            { key: 'type', value: String(entry[1] ?? '') },
            { key: 'path', value: String(entry[2] ?? '') },
            { key: 'created', value: String(entry[3] ?? '') },
            { key: 'id', value: String(entry[4] ?? '') },
            { key: 'owner', value: String(entry[5] ?? '') },
            { key: 'size', value: formatSize(Number(entry[6]) || 0) },
            { key: 'userMetadata', value: entry[7] ? JSON.stringify(entry[7]) : null },
            { key: 'autoMetadata', value: entry[8] ? JSON.stringify(entry[8]) : null },
        ].filter((e) => e.value !== undefined && e.value !== null && e.value !== '');
    }, [selectedItemMeta]);

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
                    Data Browser
                </Typography>

                {/* Breadcrumbs */}
                <Breadcrumbs separator="›" sx={{ mb: 2 }}>
                    <Link
                        component={NextLink}
                        href="/data/home"
                        underline="hover"
                        color="inherit"
                    >
                        Home
                    </Link>
                    {breadcrumbs.map((crumb, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        return isLast ? (
                            <Typography key={crumb.path} color="text.primary">
                                {crumb.name}
                            </Typography>
                        ) : (
                            <Link
                                key={crumb.path}
                                component={NextLink}
                                href={`/data${crumb.path}`}
                                underline="hover"
                                color="inherit"
                            >
                                {crumb.name}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            </Box>

            {/* Loading state */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Error state */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load directory contents.{' '}
                    {error instanceof Error ? error.message : 'Please try again.'}
                </Alert>
            )}

            {/* Data grid */}
            {!isLoading && !error && (
                <DataGrid
                    rows={items}
                    columns={columns}
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                    }}
                    onRowClick={(params) => handleRowClick(params.row)}
                    autoHeight
                    disableRowSelectionOnClick
                    sx={{
                        cursor: 'pointer',
                        '& .MuiDataGrid-row:hover': {
                            backgroundColor: 'action.hover',
                        },
                    }}
                    slots={{
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <Typography color="text.secondary">
                                    This directory is empty
                                </Typography>
                            </Box>
                        ),
                    }}
                />
            )}

            {/* Metadata Dialog */}
            <ShowMetadataDialog
                open={metadataDialogOpen}
                onClose={() => setMetadataDialogOpen(false)}
                title={selectedItemMeta ? `Metadata: ${selectedItemMeta.name}` : 'Metadata'}
                metadata={metadataEntries}
            />
        </Container>
    );
}
