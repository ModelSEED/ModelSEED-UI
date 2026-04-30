import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import React from 'react';

interface TruncatedWithTooltipProps {
    text?: string | null;
    maxWidth?: number | string;
    sx?: Record<string, unknown>;
    children?: React.ReactNode;
}

export default function TruncatedWithTooltip({ text, maxWidth = 300, sx, children }: TruncatedWithTooltipProps) {
    const content = children || (
        <Typography variant="body2" sx={{ fontSize: 'inherit' }}>
            {text}
        </Typography>
    );

    if (!content) return null;

    const fullText = text || (typeof children === 'string' ? children : undefined);

    const truncatedContent = (
        <Box
            sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth,
                ...sx,
            }}
        >
            {content}
        </Box>
    );

    if (!fullText || fullText.trim().length === 0) {
        return truncatedContent;
    }

    return (
        <Tooltip title={fullText} placement="top-start" arrow>
            {truncatedContent}
        </Tooltip>
    );
}
