'use client';

import { ChangeEvent, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { RastGenomeJob, submitReconstructJobFromApi } from '@/lib/api/modelseed';
import { extractTrackedJobId, trackJob } from '@/lib/api/jobTracker';
import PatricGenomesTable from '@/components/build-model/PatricGenomesTable';
import RastGenomesTable from '@/components/build-model/RastGenomesTable';
import { PatricGenome } from '@/lib/api/patric';

/**
 * When true, the PlantSEED build pipeline is disabled in the UI.
 * Toggle to `false` once PlantSEED v3 is deployed and ready.
 */
const PLANTSEED_MAINTENANCE = true;

type SubmissionKey = 'upload' | 'patric' | 'rast' | null;

interface MicrobeUploadForm {
    file: File | null;
    template: string;
    genomeType: string;
    media: string;
    modelName: string;
}

const DEFAULT_UPLOAD_FORM: MicrobeUploadForm = {
    file: null,
    template: 'auto',
    genomeType: 'microbial_contigs',
    media: '',
    modelName: '',
};

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`build-model-tabpanel-${index}`}
            aria-labelledby={`build-model-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3, backgroundColor: '#fff', border: '1px solid #e0e0e0', borderTop: 'none' }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `build-model-tab-${index}`,
        'aria-controls': `build-model-tabpanel-${index}`,
    };
}

function sanitizeModelName(name: string): string {
    return name.trim();
}

function isValidModelName(name: string): boolean {
    return /^\w+$/.test(name);
}

export default function BuildModelPlantPage() {
    const [tabIndex, setTabIndex] = useState(PLANTSEED_MAINTENANCE ? 1 : 0);
    const [uploadForm, setUploadForm] = useState<MicrobeUploadForm>(DEFAULT_UPLOAD_FORM);
    const [submitting, setSubmitting] = useState<SubmissionKey>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [plantseedDialogOpen, setPlantseedDialogOpen] = useState(false);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        if (PLANTSEED_MAINTENANCE && newValue === 0) {
            setPlantseedDialogOpen(true);
            return;
        }
        setTabIndex(newValue);
    };

    const submitTrackedReconstruct = async (
        key: Exclude<SubmissionKey, null>,
        payload: Record<string, unknown>,
        label: string,
        modelId: string,
        relatedRef?: string,
    ) => {
        setSubmitting(key);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const response = await submitReconstructJobFromApi(payload);
            const jobId = extractTrackedJobId(response);
            if (jobId) {
                trackJob({
                    id: jobId,
                    kind: 'reconstruct',
                    label,
                    modelId,
                    relatedRef,
                    submittedAt: new Date().toISOString(),
                });
            }
            setSuccessMessage(
                jobId
                    ? `Reconstruct job submitted successfully. Job ID: ${jobId}`
                    : 'Reconstruct job submitted successfully.',
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to submit reconstruct job';
            setErrorMessage(message);
        } finally {
            setSubmitting(null);
        }
    };

    const handleUploadFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setUploadForm((prev) => ({ ...prev, file }));
    };

    const handleUploadSubmit = async () => {
        const modelName = sanitizeModelName(uploadForm.modelName);
        if (!modelName || !isValidModelName(modelName)) {
            setErrorMessage('Model name is required and may only contain letters, numbers, and underscores.');
            return;
        }
        if (!uploadForm.file) {
            setErrorMessage('Select a FASTA file before submitting.');
            return;
        }

        const fastaText = await uploadForm.file.text();
        await submitTrackedReconstruct(
            'upload',
            {
                genome: modelName,
                output_file: modelName,
                genome_type: uploadForm.genomeType,
                template: uploadForm.template,
                media: uploadForm.media || undefined,
                filename: uploadForm.file.name,
                fasta: fastaText,
                genome_fasta: fastaText,
            },
            uploadForm.file.name,
            modelName,
        );
    };

    const handleReferenceSubmit = async (
        key: 'patric' | 'rast',
        source: 'PATRIC' | 'RAST',
        genomeId: string,
        genomeName?: string,
    ) => {
        const normalizedGenomeId = genomeId.trim();
        const modelName = sanitizeModelName(normalizedGenomeId.replace(/[^\w]/g, '_'));
        if (!normalizedGenomeId) {
            setErrorMessage(`${source} genome ID is required.`);
            return;
        }
        if (!modelName || !isValidModelName(modelName)) {
            setErrorMessage('Model name must contain only letters, numbers, and underscores.');
            return;
        }

        await submitTrackedReconstruct(
            key,
            {
                genome: `${source}:${normalizedGenomeId}`,
                genome_id: normalizedGenomeId,
                genome_name: genomeName || undefined,
                output_file: modelName,
                genome_type: 'microbial_contigs',
                template: 'auto',
                media: undefined,
            },
            genomeName || normalizedGenomeId,
            modelName,
        );
    };

    const handlePatricGenomeSelect = (genome: PatricGenome) => {
        void handleReferenceSubmit('patric', 'PATRIC', genome.genome_id, genome.genome_name);
    };

    const handleRastGenomeSelect = (job: RastGenomeJob) => {
        const genomeId = job.genome_id || job.id;
        void handleReferenceSubmit('rast', 'RAST', genomeId, job.genome_name);
    };

    return (
        <AuthGuard>
            <Box sx={{ maxWidth: '1200px', mx: 'auto', p: { xs: 2, md: 4 } }}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
                        Build Model
                    </Typography>
                </Box>

                {(errorMessage || successMessage) && (
                    <Alert severity={errorMessage ? 'error' : 'success'} sx={{ mb: 3 }}>
                        <AlertTitle>{errorMessage ? 'Submission failed' : 'Submission sent'}</AlertTitle>
                        {errorMessage || successMessage}
                    </Alert>
                )}

                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Build Model Tabs">
                        <Tab
                            label={
                                <Tooltip
                                    title={
                                        PLANTSEED_MAINTENANCE
                                            ? 'PlantSEED v2.0\nUpdate In Progress: Annotation and reconstruction services are temporarily offline for updates and will be restored shortly.'
                                            : ''
                                    }
                                    disableHoverListener={!PLANTSEED_MAINTENANCE}
                                    placement="top"
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        UPLOAD Plants FASTA
                                        {PLANTSEED_MAINTENANCE && (
                                            <WarningAmberIcon sx={{ fontSize: 20, color: '#ed6c02' }} />
                                        )}
                                    </Box>
                                </Tooltip>
                            }
                            disabled={PLANTSEED_MAINTENANCE}
                            {...a11yProps(0)}
                        />
                        <Tab label="UPLOAD Microbes FASTA" {...a11yProps(1)} />
                        <Tab label="PATRIC Microbes" {...a11yProps(2)} />
                        <Tab label="RAST Microbes" {...a11yProps(3)} />
                    </Tabs>
                </Box>

                <TabPanel value={tabIndex} index={0}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600, opacity: PLANTSEED_MAINTENANCE ? 0.6 : 1, pointerEvents: PLANTSEED_MAINTENANCE ? 'none' : 'auto' }}>
                        <Box>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontStyle: 'italic' }}>
                                Select FASTA file:
                            </Typography>
                            <Button variant="contained" color="primary" component="label" disabled={PLANTSEED_MAINTENANCE}>
                                Choose File...
                                <input type="file" hidden disabled={PLANTSEED_MAINTENANCE} />
                            </Button>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box>
                                <Button variant="outlined" size="small" sx={{ mb: 1 }} disabled={PLANTSEED_MAINTENANCE}>
                                    Change Media (Optional)
                                </Button>
                                <Typography variant="body2" color="primary">
                                    (Selected media: Complete)
                                </Typography>
                            </Box>
                            <TextField
                                fullWidth
                                label="Name Model to build -- Required"
                                required
                                variant="outlined"
                                disabled={PLANTSEED_MAINTENANCE}
                            />
                            <Button variant="contained" color="primary" sx={{ width: 'fit-content', mt: 1 }} disabled={PLANTSEED_MAINTENANCE}>
                                Build Model
                            </Button>
                        </Box>
                    </Box>
                </TabPanel>

                <TabPanel value={tabIndex} index={1}>
                    <Stack spacing={3} sx={{ maxWidth: 680 }}>
                        <Box>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontStyle: 'italic' }}>
                                Select FASTA file:
                            </Typography>
                            <Button variant="contained" color="primary" component="label">
                                Choose File...
                                <input type="file" hidden accept=".fa,.fasta,.faa,.fna,.txt" onChange={handleUploadFileChange} />
                            </Button>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {uploadForm.file ? uploadForm.file.name : 'No file selected'}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                select
                                fullWidth
                                label="Select Template Model"
                                value={uploadForm.template}
                                onChange={(event) => setUploadForm((prev) => ({ ...prev, template: event.target.value }))}
                            >
                                <MenuItem value="auto">Automatically select</MenuItem>
                                <MenuItem value="gramneg">Gram Negative</MenuItem>
                                <MenuItem value="grampos">Gram Positive</MenuItem>
                                <MenuItem value="core">Core</MenuItem>
                            </TextField>

                            <TextField
                                select
                                fullWidth
                                label="Genome Type"
                                value={uploadForm.genomeType}
                                onChange={(event) => setUploadForm((prev) => ({ ...prev, genomeType: event.target.value }))}
                            >
                                <MenuItem value="microbial_contigs">Contigs</MenuItem>
                                <MenuItem value="microbial_genome">Complete genome</MenuItem>
                            </TextField>

                            <TextField
                                fullWidth
                                label="Media (optional)"
                                placeholder="Complete (leave blank to use backend default)"
                                value={uploadForm.media}
                                onChange={(event) => setUploadForm((prev) => ({ ...prev, media: event.target.value }))}
                            />

                            <TextField
                                fullWidth
                                label="Name Model to build -- Required"
                                required
                                variant="outlined"
                                helperText="Letters, numbers, and underscores only."
                                value={uploadForm.modelName}
                                onChange={(event) => setUploadForm((prev) => ({ ...prev, modelName: event.target.value }))}
                            />

                            <Button
                                variant="contained"
                                color="primary"
                                sx={{ width: 'fit-content', mt: 1 }}
                                onClick={handleUploadSubmit}
                                disabled={submitting !== null}
                            >
                                {submitting === 'upload' ? (
                                    <>
                                        <CircularProgress size={16} sx={{ mr: 1 }} />
                                        Submitting...
                                    </>
                                ) : (
                                    'Build Model'
                                )}
                            </Button>
                        </Box>
                    </Stack>
                </TabPanel>

                <TabPanel value={tabIndex} index={2}>
                    <Stack spacing={2}>
                        <Typography variant="h6" gutterBottom>PATRIC Microbes</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Search PATRIC genomes and click <strong>Build Model</strong> in the table to
                            submit directly with default settings.
                        </Typography>
                        <PatricGenomesTable
                            onSelectGenome={handlePatricGenomeSelect}
                            disabled={submitting !== null}
                        />
                    </Stack>
                </TabPanel>

                <TabPanel value={tabIndex} index={3}>
                    <Stack spacing={2}>
                        <Typography variant="h6" gutterBottom>RAST Microbes</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Select one of your RAST genome jobs and click <strong>Build Model</strong> in
                            the table to submit directly with default settings.
                        </Typography>
                        <RastGenomesTable
                            onSelectGenome={handleRastGenomeSelect}
                            disabled={submitting !== null}
                        />
                    </Stack>
                </TabPanel>

                <Box sx={{ mt: 3 }}>
                    <Button component={Link} href="/my-models" sx={{ textTransform: 'none' }}>
                        View tracked jobs and models
                    </Button>
                </Box>

                <Dialog
                    open={plantseedDialogOpen}
                    onClose={() => setPlantseedDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ fontWeight: 600 }}>
                        PlantSEED v2.0
                    </DialogTitle>
                    <DialogContent>
                        <Typography>
                            Update In Progress: Annotation and reconstruction services are temporarily offline for updates and will be restored shortly.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setPlantseedDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AuthGuard >
    );
}
