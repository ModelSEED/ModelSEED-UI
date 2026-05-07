import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

export default function FaqPage() {
    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 400, color: '#333' }}>
                Frequently Asked Questions
            </Typography>
            <Divider sx={{ mb: 4 }} />

            <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', mt: 4 }}>
                FAQ content is currently being updated. Please check back later or contact us at <a href="mailto:help@modelseed.org">help@modelseed.org</a> if you have any questions.
            </Typography>
        </Box>
    );
}
