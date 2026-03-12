'use client';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface DataControlHeaderProps {
    placeholder: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    totalRows: number;
}

export default function DataControlHeader({
    placeholder,
    searchValue,
    onSearchChange,
    totalRows,
}: DataControlHeaderProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
                p: 1.5,
                border: '1px solid #e0e0e0',
                borderBottom: 'none',
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: '#f9f9f9',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 240 }}>
                <TextField
                    size="small"
                    placeholder={placeholder}
                    value={searchValue}
                    onChange={(event) => onSearchChange(event.target.value)}
                    sx={{ maxWidth: 360, width: '100%' }}
                />
            </Box>
            <Typography variant="body2" color="text.secondary">
                {totalRows} result{totalRows === 1 ? '' : 's'}
            </Typography>
        </Box>
    );
}
