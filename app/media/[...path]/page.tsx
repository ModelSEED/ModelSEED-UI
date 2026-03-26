'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import MediaEditor, { type MediaData, type MediaCompound } from '@/components/ui/MediaEditor';
import SaveAsDialog from '@/components/ui/SaveAsDialog';
import AuthGuard from '@/components/auth/AuthGuard';
import { useAuth } from '@/components/auth/AuthProvider';
import { USE_MODELSEED_API } from '@/lib/api/config';
import { exportMediaFromApi } from '@/lib/api/modelseed';
import { parseWorkspaceGetObject, workspaceCreate, workspaceGet } from '@/lib/api/workspace';

function toNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toBooleanFlag(value: unknown): boolean {
    if (value === true || value === 1 || value === '1') return true;
    return false;
}

function normalizeUserKey(value: string): string {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return '';
    const atIndex = trimmed.indexOf('@');
    return atIndex >= 0 ? trimmed.slice(0, atIndex) : trimmed;
}

function parseCompoundsFromExport(payload: Record<string, unknown>): MediaCompound[] {
    const compounds = Array.isArray(payload.compounds) ? payload.compounds : [];
    return compounds.map((entry) => {
        const record = entry as Record<string, unknown>;
        return {
            id: String(record.id ?? record.compound_id ?? ''),
            name: String(record.name ?? record.compound_name ?? record.id ?? ''),
            formula: record.formula ? String(record.formula) : undefined,
            charge: record.charge == null ? undefined : Number(record.charge),
            concentration: toNumber(record.concentration, 0),
            minFlux: toNumber(record.minflux ?? record.minFlux, -100),
            maxFlux: toNumber(record.maxflux ?? record.maxFlux, 100),
        };
    });
}

function parseCompoundsFromTable(tableText: string): MediaCompound[] {
    const rows = tableText.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    if (rows.length <= 1) return [];

    return rows.slice(1).map((line) => {
        const columns = line.split('\t');
        return {
            id: columns[0] || '',
            name: columns[1] || columns[0] || '',
            concentration: toNumber(columns[2], 0),
            minFlux: toNumber(columns[3], -100),
            maxFlux: toNumber(columns[4], 100),
        };
    });
}

function buildMediaTable(media: MediaData): string {
    const header = 'id\tname\tconcentration\tminflux\tmaxflux';
    const rows = media.compounds.map((compound) => (
        [
            compound.id,
            compound.name,
            String(compound.concentration),
            String(compound.minFlux),
            String(compound.maxFlux),
        ].join('\t')
    ));
    return `${header}\n${rows.join('\n')}\n`;
}

export default function MediaPathPage({ params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const { user } = useAuth();

    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [saveAsOpen, setSaveAsOpen] = useState(false);
    const [pendingSaveAsMedia, setPendingSaveAsMedia] = useState<MediaData | null>(null);

    const mediaPath = useMemo(() => `/${resolvedParams.path.join('/')}`, [resolvedParams.path]);
    const mediaName = resolvedParams.path[resolvedParams.path.length - 1] || 'media';
    const isNewMedia = mediaName === 'new-media';
    const ownerSegment = resolvedParams.path[0] || '';
    const isMine = !!user && (
        ownerSegment.toLowerCase() === user.toLowerCase()
        || normalizeUserKey(ownerSegment) === normalizeUserKey(user)
    );
    const canEditMedia = isMine || (isNewMedia && !!user);

    const { data: mediaData, isLoading, error, refetch } = useQuery({
        queryKey: ['media-page', mediaPath, USE_MODELSEED_API, isNewMedia],
        queryFn: async (): Promise<MediaData> => {
            if (isNewMedia) {
                return {
                    id: 'new-media',
                    name: 'new-media',
                    type: 'media',
                    compounds: [],
                    isDefined: false,
                    isMinimal: false,
                };
            }

            // Try modelseed-api first if enabled, then fall back to workspace
            if (USE_MODELSEED_API) {
                try {
                    const payload = await exportMediaFromApi(mediaPath);
                    // Check if payload has valid data
                    if (payload && (Array.isArray(payload.compounds) || payload.id || payload.name)) {
                        const compounds = parseCompoundsFromExport(payload);
                        return {
                            id: mediaName,
                            name: String(payload.name ?? mediaName),
                            type: 'media',
                            compounds,
                            isDefined: toBooleanFlag(payload.isDefined ?? payload.is_defined),
                            isMinimal: toBooleanFlag(payload.isMinimal ?? payload.is_minimal),
                        };
                    }
                } catch {
                    // Fall through to workspace fallback
                }
            }

            // Fallback: use workspace API directly
            const payload = await workspaceGet([mediaPath]);
            const tableText = parseWorkspaceGetObject<string>(payload);
            if (!tableText || typeof tableText !== 'string') {
                throw new Error('Unable to load media table data.');
            }

            return {
                id: mediaName,
                name: mediaName,
                type: 'media',
                compounds: parseCompoundsFromTable(tableText),
                isDefined: false,
                isMinimal: false,
            };
        },
    });

    const persistMedia = async (targetPath: string, targetName: string, media: MediaData, overwrite: boolean) => {
        const mediaTable = buildMediaTable(media);
        await workspaceCreate({
            objects: [[
                targetPath,
                'media',
                {
                    name: targetName,
                    isMinimal: media.isMinimal ? 1 : 0,
                    isDefined: media.isDefined ? 1 : 0,
                    type: 'media',
                },
                mediaTable,
            ]],
            overwrite,
        });
    };

    const handleSave = async (updatedMedia: MediaData): Promise<boolean> => {
        if (!canEditMedia || isNewMedia) {
            return false;
        }

        setStatusError(null);
        setStatusMessage(null);

        try {
            await persistMedia(mediaPath, mediaName, updatedMedia, true);
            setStatusMessage(`Saved media ${mediaName}.`);
            await refetch();
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save media.';
            setStatusError(message);
            return false;
        }
    };

    const handleRequestSaveAs = (draft: MediaData) => {
        if (!user) {
            setStatusError('You must be signed in to save media.');
            return;
        }
        setPendingSaveAsMedia(draft);
        setSaveAsOpen(true);
    };

    const handleSaveAs = async (newName: string): Promise<void> => {
        if (!user) {
            throw new Error('You must be signed in to save media.');
        }
        if (!pendingSaveAsMedia) {
            throw new Error('No media draft is available to save.');
        }

        const targetPath = `/${user}/media/${newName}`;
        try {
            await persistMedia(targetPath, newName, pendingSaveAsMedia, true);
            setStatusError(null);
            setStatusMessage(`Saved media ${newName}.`);
            setSaveAsOpen(false);
            setPendingSaveAsMedia(null);
            router.push(`/media${targetPath}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save media.';
            setStatusError(message);
            throw err;
        }
    };

    const handleCancelDraft = () => {
        router.push('/myMedia');
    };

    const content = (
        <Box sx={{ maxWidth: '1400px', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Breadcrumbs separator=">" sx={{ mt: 1 }}>
                <Link component={NextLink} href="/list-media" underline="hover" sx={{ color: '#00acc1' }}>
                    Public Media
                </Link>
                <Link component={NextLink} href="/myMedia" underline="hover" sx={{ color: '#00acc1' }}>
                    My Media
                </Link>
            </Breadcrumbs>

            <Box sx={{ borderBottom: '1px solid #ddd', pb: 1, mb: 1 }}>
                <Typography variant="h5" component="h1">
                    Media <Typography component="span" color="text.secondary">{mediaName}</Typography>
                </Typography>
                {isNewMedia && canEditMedia && (
                    <Typography variant="body2" color="text.secondary">
                        Build a new media formulation by adding compounds, then save it with <strong>Save as...</strong>.
                    </Typography>
                )}
                {!canEditMedia && (
                    <Typography variant="body2" color="text.secondary">
                        Read-only view. Copy this media into your workspace to edit.
                    </Typography>
                )}
            </Box>

            {statusMessage && (
                <Alert severity="success" variant="outlined">
                    {statusMessage}
                </Alert>
            )}

            {statusError && (
                <Alert severity="error" variant="outlined">
                    {statusError}
                </Alert>
            )}

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="error" variant="outlined">
                    {error instanceof Error ? error.message : 'Failed to load media.'}
                </Alert>
            )}

            {!isLoading && !error && mediaData && (
                <Box
                    sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        backgroundColor: '#fff',
                        p: 2,
                    }}
                >
                    <MediaEditor
                        initialMedia={mediaData}
                        onSave={isMine && !isNewMedia ? handleSave : undefined}
                        onRequestSaveAs={canEditMedia ? handleRequestSaveAs : undefined}
                        onCancel={canEditMedia && isNewMedia ? handleCancelDraft : undefined}
                        readOnly={!canEditMedia}
                        saveDisabled={!USE_MODELSEED_API && isMine && !isNewMedia}
                        saveDisabledMessage={USE_MODELSEED_API ? '' : 'API not available. Enable NEXT_PUBLIC_USE_MODELSEED_API=true.'}
                    />
                </Box>
            )}

            <SaveAsDialog
                open={saveAsOpen}
                onClose={() => {
                    setSaveAsOpen(false);
                    setPendingSaveAsMedia(null);
                }}
                onSave={handleSaveAs}
                currentName={isNewMedia ? '' : mediaName}
                entityType="media"
            />
        </Box>
    );

    if (isNewMedia) {
        return <AuthGuard>{content}</AuthGuard>;
    }

    return content;
}
