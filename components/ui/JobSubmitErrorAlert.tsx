'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { PresentedJobSubmitError } from '@/lib/utils/jobErrors';

interface JobSubmitErrorAlertProps {
    /** Result from `presentJobSubmitError()`. */
    presented: PresentedJobSubmitError;
    /** Optional dismiss callback; renders an X when provided. */
    onClose?: () => void;
    /** Overrides default `sx={{ mt: 2 }}`. */
    sx?: object;
}

/**
 * Renders a job-submit error with the layout the modelseed-api integration
 * doc asks for: `message` as the title, `hint` in lighter weight underneath,
 * and a small `Input: <field>` caption when the backend pinpointed an input
 * field. Use the legacy single-string Alert if the caller doesn't have a
 * structured presented error yet.
 */
export default function JobSubmitErrorAlert({
    presented,
    onClose,
    sx,
}: JobSubmitErrorAlertProps) {
    return (
        <Alert
            severity="error"
            onClose={onClose}
            sx={{ mt: 2, ...sx }}
            data-error-code={presented.code ?? 'UNSTRUCTURED'}
        >
            <AlertTitle sx={{ whiteSpace: 'pre-line', mb: presented.hint || presented.field ? 0.5 : 0 }}>
                {presented.message}
            </AlertTitle>
            {presented.hint && (
                <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}
                >
                    {presented.hint}
                </Typography>
            )}
            {presented.field && (
                <Box sx={{ mt: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                        Affected input: <strong>{presented.field}</strong>
                    </Typography>
                </Box>
            )}
        </Alert>
    );
}
