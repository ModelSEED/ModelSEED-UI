'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { exportModelFromApi } from '@/lib/api/modelseed';
import { buildCompoundsTsv, buildReactionsTsv, type ModelExportJson } from '@/lib/utils/modelTsv';

interface DownloadModelMenuProps {
    modelRef: string;
    modelId: string;
    buttonLabel?: string;
    helperText?: string;
}

type ExportOption =
    | { key: string; label: string; kind: 'api'; format: 'sbml' | 'json'; extension: string }
    | { key: string; label: string; kind: 'derived-tsv'; table: 'reactions' | 'compounds' };

export const EXPORT_OPTIONS: readonly ExportOption[] = [
    { key: 'sbml', label: 'SBML', kind: 'api', format: 'sbml', extension: 'xml' },
    { key: 'json', label: 'JSON', kind: 'api', format: 'json', extension: 'json' },
    { key: 'reactions-tsv', label: 'Reactions (TSV)', kind: 'derived-tsv', table: 'reactions' },
    { key: 'compounds-tsv', label: 'Compounds (TSV)', kind: 'derived-tsv', table: 'compounds' },
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

export default function DownloadModelMenu({
    modelRef,
    modelId,
    buttonLabel = 'Download',
    helperText,
}: DownloadModelMenuProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const open = Boolean(anchorEl);

    const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setError(null);
        setSuccessMessage(null);
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        if (!downloadingKey) {
            setAnchorEl(null);
        }
    };

    const handleDownload = async (option: ExportOption) => {
        setError(null);
        setSuccessMessage(null);
        setDownloadingKey(option.key);
        try {
            let blob: Blob;
            let filename: string;

            if (option.kind === 'api') {
                blob = await exportModelFromApi(modelRef, option.format);
                filename = `${modelId}.${option.extension}`;
            } else {
                const jsonBlob = await exportModelFromApi(modelRef, 'json');
                const text = await jsonBlob.text();
                let model: ModelExportJson;
                try {
                    model = JSON.parse(text);
                } catch {
                    throw new Error('The model export did not return valid JSON, so the TSV table could not be built.');
                }
                const tsv = option.table === 'reactions' ? buildReactionsTsv(model) : buildCompoundsTsv(model);
                blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
                filename = `${modelId}.${option.table}.tsv`;
            }

            triggerBrowserDownload(blob, filename);
            setAnchorEl(null);
            setSuccessMessage(`Downloaded ${filename}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to export model';
            setError(message);
        } finally {
            setDownloadingKey(null);
        }
    };

    return (
        <>
            <Button
                variant="text"
                size="small"
                onClick={handleOpen}
                sx={{ textTransform: 'none', minWidth: 0, verticalAlign: 'baseline' }}
            >
                {buttonLabel}
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
                        key={option.key}
                        disabled={Boolean(downloadingKey)}
                        onClick={() => handleDownload(option)}
                    >
                        {downloadingKey === option.key ? (
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
            {successMessage && (
                <Typography variant="caption" color="success.main" sx={{ display: 'block', ml: 0.5 }}>
                    {successMessage}
                </Typography>
            )}
            {helperText && !error && !successMessage && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 0.5, mt: 0.5 }}>
                    {helperText}
                </Typography>
            )}
        </>
    );
}
