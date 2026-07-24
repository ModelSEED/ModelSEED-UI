'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import FeedbackDialog from './FeedbackDialog';

export default function FooterFeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        startIcon={<FeedbackOutlinedIcon />}
        variant="outlined"
        sx={{
          mt: 2,
          color: '#fff',
          borderColor: '#fff',
          '&:hover': { borderColor: '#30BCCF', backgroundColor: 'rgba(48,188,207,0.15)' },
        }}
      >
        Send feedback
      </Button>
      <FeedbackDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
