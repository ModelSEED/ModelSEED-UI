'use client';

import { useState } from 'react';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import { useAuth } from '@/components/auth/AuthProvider';
import FeedbackDialog from './FeedbackDialog';

export default function FeedbackFAB(): React.ReactElement | null {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <>
      <Tooltip title="Send feedback">
        <Fab
          color="primary"
          aria-label="Send feedback"
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: (t) => t.zIndex.speedDial }}
        >
          <FeedbackOutlinedIcon />
        </Fab>
      </Tooltip>
      <FeedbackDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
