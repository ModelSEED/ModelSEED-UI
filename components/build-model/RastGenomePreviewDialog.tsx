'use client';

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { getRastGenomeData, RastGenomeJob } from '@/lib/api/modelseed';

interface RastGenomePreviewDialogProps {
    open: boolean;
    job: RastGenomeJob | null;
    onProceed: (job: RastGenomeJob) => void;
    onClose: () => void;
}

export default function RastGenomePreviewDialog({ open, job, onProceed, onClose }: RastGenomePreviewDialogProps) {
    const [genomeData, setGenomeData] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !job) return;

        const genomeId = job.genome_id || job.id;
        if (!genomeId) return;

        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setGenomeData(null);
        setError(null);

        getRastGenomeData(genomeId)
            .then((data) => {
                if (cancelled) return;
                setGenomeData(data);
                setLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to fetch genome data');
                setLoading(false);
            });

        return () => { cancelled = true; };
    }, [open, job]);

    const metadataRows: { label: string; value: string }[] = [];
    if (genomeData) {
        const fields: [string, string][] = [
            ['id', 'Genome ID'],
            ['name', 'Name'],
            ['genome_id', 'NCBI ID'],
            ['source', 'Source'],
            ['taxonomy', 'Taxonomy'],
            ['domain', 'Domain'],
            ['genetic_code', 'Genetic Code'],
            ['gc_content', 'GC Content'],
            ['dna_size', 'DNA Size'],
            ['contig_count', 'Contigs'],
            ['feature_count', 'Features'],
            ['pegasus', 'Pegasus'],
        ];
        for (const [key, label] of fields) {
            const val = genomeData[key];
            if (val != null && val !== '') {
                metadataRows.push({ label, value: String(val).slice(0, 300) });
            }
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                RAST Genome Data — {job?.genome_name || job?.genome_id || job?.id}
            </DialogTitle>
            <DialogContent dividers>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && !loading && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {error}
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                            Genome data is unavailable, but you can still proceed to build the model with default settings.
                        </Typography>
                    </Alert>
                )}

                {genomeData && !loading && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>
                            Genome data loaded
                        </Typography>
                        {genomeData.features && Array.isArray(genomeData.features) && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Features: {genomeData.features.length.toLocaleString()}
                                {genomeData.contigs && Array.isArray(genomeData.contigs)
                                    ? ` | Contigs: ${genomeData.contigs.length.toLocaleString()}`
                                    : ''}
                            </Typography>
                        )}
                        <Table size="small">
                            <TableBody>
                                {metadataRows.map((row) => (
                                    <TableRow key={row.label}>
                                        <TableCell sx={{ fontWeight: 600, width: 180 }}>{row.label}</TableCell>
                                        <TableCell sx={{ wordBreak: 'break-all' }}>{row.value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    disabled={loading}
                    onClick={() => job && onProceed(job)}
                >
                    {loading ? 'Loading...' : error ? 'Proceed anyway' : 'Proceed to Build Model'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
