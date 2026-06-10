'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Link from 'next/link';

export interface FailedJobDetails {
    id: string;
    app?: string;
    status: string;
    progress?: string;
    errorMsg?: string;
    parameters?: Record<string, unknown>;
    outputPath?: string;
}

interface FailedJobDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    job: FailedJobDetails | null;
}

function renderParametersBlock(parameters: Record<string, unknown> | undefined) {
    if (!parameters || Object.keys(parameters).length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                No parameters recorded.
            </Typography>
        );
    }

    let pretty: string;
    try {
        pretty = JSON.stringify(parameters, null, 2);
    } catch {
        pretty = String(parameters);
    }

    return (
        <Box
            component="pre"
            sx={{
                m: 0,
                p: 1.5,
                bgcolor: 'grey.100',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: 12,
                maxHeight: 240,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}
        >
            {pretty}
        </Box>
    );
}

/**
 * Detail panel for a failed job row — surfaces the full `job.error` string,
 * the last progress note, parameters, and a deep link back to the targeted
 * model when one is recorded. Implements the "Better" treatment described in
 * docs/JOB_ERROR_UI_INTEGRATION.md (modelseed-api repo).
 */
export default function FailedJobDetailsDialog({
    open,
    onClose,
    job,
}: FailedJobDetailsDialogProps) {
    if (!job) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            data-testid="failed-job-details-dialog"
        >
            <DialogTitle>
                <Typography component="div" variant="h6" fontWeight={600}>
                    Failed job details
                </Typography>
                <Typography component="div" variant="caption" color="text.secondary">
                    {job.app ? `${job.app} · ` : ''}Job ID: {job.id}
                </Typography>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="overline" color="text.secondary">
                        Error
                    </Typography>
                    <Box
                        sx={{
                            mt: 0.5,
                            p: 1.5,
                            bgcolor: '#fff4f4',
                            border: '1px solid #f5c2c0',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: 13,
                            color: '#5b1a16',
                            maxHeight: 200,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                        data-testid="failed-job-error-text"
                    >
                        {job.errorMsg || 'No error details provided by the backend for this job.'}
                    </Box>
                </Box>

                {job.progress && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="overline" color="text.secondary">
                            Last progress note
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {job.progress}
                        </Typography>
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 1 }}>
                    <Typography variant="overline" color="text.secondary">
                        Parameters
                    </Typography>
                </Box>
                {renderParametersBlock(job.parameters)}

                {job.outputPath && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="overline" color="text.secondary" display="block">
                            Target model
                        </Typography>
                        <Link
                            href={`/model${job.outputPath}`}
                            style={{ color: '#00acc1', textDecoration: 'none', fontWeight: 500 }}
                        >
                            {job.outputPath}
                        </Link>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
