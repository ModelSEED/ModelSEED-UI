'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { exportModelFromApi } from '@/lib/api/modelseed';

interface DownloadModelMenuProps {
    modelRef: string;
    modelId: string;
}

const EXPORT_OPTIONS = [
    { label: 'SBML', format: 'sbml', extension: 'xml' },
    { label: 'JSON', format: 'json', extension: 'json' },
    { label: 'TSV', format: 'tsv', extension: 'tsv' },
] as const;

function triggerBrowserDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export default function DownloadModelMenu({ modelRef, modelId }: DownloadModelMenuProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const open = Boolean(anchorEl);

    const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        if (!downloadingFormat) {
            setAnchorEl(null);
        }
    };

    const handleDownload = async (format: string, extension: string) => {
        setError(null);
        setDownloadingFormat(format);
        try {
            const blob = await exportModelFromApi(modelRef, format);
            triggerBrowserDownload(blob, `${modelId}.${extension}`);
            setAnchorEl(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to export model';
            setError(message);
        } finally {
            setDownloadingFormat(null);
        }
    };

    return (
        <>
            <Button
                variant="text"
                size="small"
                onClick={handleOpen}
                sx={{ textTransform: 'none', minWidth: 0 }}
            >
                Download
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                {EXPORT_OPTIONS.map((option) => (
                    <MenuItem
                        key={option.format}
                        disabled={Boolean(downloadingFormat)}
                        onClick={() => handleDownload(option.format, option.extension)}
                    >
                        {downloadingFormat === option.format ? (
                            <>
                                <CircularProgress size={14} sx={{ mr: 1 }} />
                                Exporting {option.label}...
                            </>
                        ) : (
                            option.label
                        )}
                    </MenuItem>
                ))}
            </Menu>
            {error && (
                <Typography variant="caption" color="error" sx={{ display: 'block', ml: 0.5 }}>
                    {error}
                </Typography>
            )}
        </>
    );
}
