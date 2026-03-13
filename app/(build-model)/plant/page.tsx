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
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { submitReconstructJobFromApi } from '@/lib/api/modelseed';
import { extractTrackedJobId, trackJob } from '@/lib/api/jobTracker';

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

interface MicrobeReferenceForm {
    genomeId: string;
    genomeName: string;
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

const DEFAULT_REFERENCE_FORM: MicrobeReferenceForm = {
    genomeId: '',
    genomeName: '',
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
    const [patricForm, setPatricForm] = useState<MicrobeReferenceForm>(DEFAULT_REFERENCE_FORM);
    const [rastForm, setRastForm] = useState<MicrobeReferenceForm>(DEFAULT_REFERENCE_FORM);
    const [submitting, setSubmitting] = useState<SubmissionKey>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
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
        form: MicrobeReferenceForm,
    ) => {
        const genomeId = form.genomeId.trim();
        const modelName = sanitizeModelName(form.modelName || genomeId.replace(/[^\w]/g, '_'));
        if (!genomeId) {
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
                genome: `${source}:${genomeId}`,
                genome_id: genomeId,
                genome_name: form.genomeName || undefined,
                output_file: modelName,
                genome_type: form.genomeType,
                template: form.template,
                media: form.media || undefined,
            },
            form.genomeName || genomeId,
            modelName,
        );
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
                                            ? 'PlantSEED v3.0 Update In Progress: Annotation and reconstruction services are temporarily offline for updates and will be restored shortly.'
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
                    <Stack spacing={2} sx={{ maxWidth: 680 }}>
                        <Typography variant="h6" gutterBottom>PATRIC Microbes</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Enter a PATRIC genome ID and optionally a display name to submit a reconstruction job through the new API.
                        </Typography>
                        <TextField
                            label="PATRIC Genome ID"
                            value={patricForm.genomeId}
                            onChange={(event) => setPatricForm((prev) => ({ ...prev, genomeId: event.target.value }))}
                        />
                        <TextField
                            label="Genome Name (optional)"
                            value={patricForm.genomeName}
                            onChange={(event) => setPatricForm((prev) => ({ ...prev, genomeName: event.target.value }))}
                        />
                        <TextField
                            label="Model Name"
                            helperText="Letters, numbers, and underscores only."
                            value={patricForm.modelName}
                            onChange={(event) => setPatricForm((prev) => ({ ...prev, modelName: event.target.value }))}
                        />
                        <TextField
                            select
                            label="Template"
                            value={patricForm.template}
                            onChange={(event) => setPatricForm((prev) => ({ ...prev, template: event.target.value }))}
                        >
                            <MenuItem value="auto">Automatically select</MenuItem>
                            <MenuItem value="gramneg">Gram Negative</MenuItem>
                            <MenuItem value="grampos">Gram Positive</MenuItem>
                            <MenuItem value="core">Core</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Genome Type"
                            value={patricForm.genomeType}
                            onChange={(event) => setPatricForm((prev) => ({ ...prev, genomeType: event.target.value }))}
                        >
                            <MenuItem value="microbial_contigs">Contigs</MenuItem>
                            <MenuItem value="microbial_genome">Complete genome</MenuItem>
                        </TextField>
                        <TextField
                            label="Media (optional)"
                            placeholder="Complete (leave blank to use backend default)"
                            value={patricForm.media}
                            onChange={(event) => setPatricForm((prev) => ({ ...prev, media: event.target.value }))}
                        />
                        <Button
                            variant="contained"
                            sx={{ width: 'fit-content' }}
                            onClick={() => handleReferenceSubmit('patric', 'PATRIC', patricForm)}
                            disabled={submitting !== null}
                        >
                            {submitting === 'patric' ? (
                                <>
                                    <CircularProgress size={16} sx={{ mr: 1 }} />
                                    Submitting...
                                </>
                            ) : (
                                'Build from PATRIC Genome'
                            )}
                        </Button>
                    </Stack>
                </TabPanel>

                <TabPanel value={tabIndex} index={3}>
                    <Stack spacing={2} sx={{ maxWidth: 680 }}>
                        <Typography variant="h6" gutterBottom>RAST Microbes</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Enter a RAST genome ID and submit the reconstruction directly to Poplar.
                        </Typography>
                        <TextField
                            label="RAST Genome ID"
                            value={rastForm.genomeId}
                            onChange={(event) => setRastForm((prev) => ({ ...prev, genomeId: event.target.value }))}
                        />
                        <TextField
                            label="Genome Name (optional)"
                            value={rastForm.genomeName}
                            onChange={(event) => setRastForm((prev) => ({ ...prev, genomeName: event.target.value }))}
                        />
                        <TextField
                            label="Model Name"
                            helperText="Letters, numbers, and underscores only."
                            value={rastForm.modelName}
                            onChange={(event) => setRastForm((prev) => ({ ...prev, modelName: event.target.value }))}
                        />
                        <TextField
                            select
                            label="Template"
                            value={rastForm.template}
                            onChange={(event) => setRastForm((prev) => ({ ...prev, template: event.target.value }))}
                        >
                            <MenuItem value="auto">Automatically select</MenuItem>
                            <MenuItem value="gramneg">Gram Negative</MenuItem>
                            <MenuItem value="grampos">Gram Positive</MenuItem>
                            <MenuItem value="core">Core</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Genome Type"
                            value={rastForm.genomeType}
                            onChange={(event) => setRastForm((prev) => ({ ...prev, genomeType: event.target.value }))}
                        >
                            <MenuItem value="microbial_contigs">Contigs</MenuItem>
                            <MenuItem value="microbial_genome">Complete genome</MenuItem>
                        </TextField>
                        <TextField
                            label="Media (optional)"
                            placeholder="Complete (leave blank to use backend default)"
                            value={rastForm.media}
                            onChange={(event) => setRastForm((prev) => ({ ...prev, media: event.target.value }))}
                        />
                        <Button
                            variant="contained"
                            sx={{ width: 'fit-content' }}
                            onClick={() => handleReferenceSubmit('rast', 'RAST', rastForm)}
                            disabled={submitting !== null}
                        >
                            {submitting === 'rast' ? (
                                <>
                                    <CircularProgress size={16} sx={{ mr: 1 }} />
                                    Submitting...
                                </>
                            ) : (
                                'Build from RAST Genome'
                            )}
                        </Button>
                    </Stack>
                </TabPanel>

                <Box sx={{ mt: 3 }}>
                    <Button component={Link} href="/my-models" sx={{ textTransform: 'none' }}>
                        View tracked jobs and models
                    </Button>
                </Box>
            </Box>
        </AuthGuard >
    );
}
