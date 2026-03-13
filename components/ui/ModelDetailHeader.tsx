'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Alert from '@mui/material/Alert';

interface ModelDetailHeaderProps {
    modelName: string;
    visualizeOption: string;
    onVisualizeChange: (value: string) => void;
    onRunFba?: () => void;
    onRunGapfill?: () => void;
    actionLoading?: 'fba' | 'gapfill' | null;
    actionMessage?: string | null;
}

export default function ModelDetailHeader({
    modelName,
    visualizeOption,
    onVisualizeChange,
    onRunFba,
    onRunGapfill,
    actionLoading,
    actionMessage,
}: ModelDetailHeaderProps) {
    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 2 }}>
                <Typography variant="h4" component="h1" fontWeight={600}>
                    Model
                </Typography>
                <Typography variant="h5" color="text.secondary">
                    {modelName}
                </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                {['Rebuild Model', 'Blast Genome', 'Add Expression'].map((label) => (
                    <Box
                        key={label}
                        sx={{
                            px: 2,
                            py: 1,
                            borderRadius: 1,
                            bgcolor: '#f5f5f5',
                            color: 'text.secondary',
                            border: '1px solid #e0e0e0',
                            fontSize: 14,
                            fontWeight: 500,
                        }}
                    >
                        {label}
                    </Box>
                ))}
                <Button
                    variant="contained"
                    onClick={onRunFba}
                    disabled={!onRunFba || actionLoading !== null}
                    sx={{ textTransform: 'none' }}
                >
                    {actionLoading === 'fba' ? 'Submitting FBA...' : 'Run FBA'}
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={onRunGapfill}
                    disabled={!onRunGapfill || actionLoading !== null}
                    sx={{ textTransform: 'none' }}
                >
                    {actionLoading === 'gapfill' ? 'Submitting Gapfill...' : 'Run GapFilling'}
                </Button>
            </Box>

            {actionMessage && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    {actionMessage}
                </Alert>
            )}

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle1" fontWeight={500}>
                    Visualize Data:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                        value={visualizeOption}
                        onChange={(e) => onVisualizeChange(e.target.value)}
                        displayEmpty
                    >
                        <MenuItem value="">
                            <em>---Please select---</em>
                        </MenuItem>
                        <MenuItem value="FBA">FBA</MenuItem>
                        <MenuItem value="Expression">Expression</MenuItem>
                        <MenuItem value="GapFill">GapFill</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </>
    );
}
