'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  FEEDBACK_TYPES,
  AFFECTED_AREAS,
  ENVIRONMENTS,
  buildGitHubIssueUrl,
  type FeedbackType,
  type AffectedArea,
  type Environment,
} from './feedbackOptions';

export interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  /** Optional initial type (FAB opens to 'Bug' by default; Footer opens to 'Bug' too). */
  initialType?: FeedbackType;
  /** Optional prefilled affected area (e.g. inferred from current route). */
  initialArea?: AffectedArea;
}

export default function FeedbackDialog({
  open,
  onClose,
  initialType,
  initialArea,
}: FeedbackDialogProps) {
  const { user } = useAuth();

  const [type, setType] = useState<FeedbackType>(initialType ?? 'Bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState<AffectedArea>(initialArea ?? 'Other');
  const [environment, setEnvironment] = useState<Environment>('Not sure');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Derive environment from window.location after mount (SSR-safe)
  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname.includes('staging')) {
      setEnvironment('staging.modelseed.org (staging)');
    } else if (hostname === 'modelseed.org') {
      setEnvironment('modelseed.org (production)');
    } else if (hostname === 'localhost' || hostname.startsWith('127.')) {
      setEnvironment('localhost / dev');
    } else {
      setEnvironment('Not sure');
    }
  }, []);

  // Reset form state when dialog closes
  useEffect(() => {
    if (!open) {
      setType(initialType ?? 'Bug');
      setTitle('');
      setDescription('');
      setArea(initialArea ?? 'Other');
      setEmail('');
      setSubmitting(false);
      setResult(null);
      setSubmitted(false);
    }
  }, [open, initialType, initialArea]);

  const emailValid = email === '' || /^\S+@\S+\.\S+$/.test(email);

  const handleOpenGitHub = () => {
    if (!title.trim() || !description.trim()) {
      setSubmitted(true);
      return;
    }
    window.open(
      buildGitHubIssueUrl({ type, title: title.trim(), description: description.trim(), area, environment }),
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!title.trim() || !description.trim() || !emailValid) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          area,
          environment,
          email: email.trim() || undefined,
          username: user ?? undefined,
          pageUrl: window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { message?: string })?.message || `Request failed (${res.status})`);
      setResult({ severity: 'success', msg: (data as { msg?: string })?.msg || 'Thanks! Your feedback was sent.' });
      setTitle('');
      setDescription('');
    } catch (e) {
      setResult({ severity: 'error', msg: e instanceof Error ? e.message : 'Failed to send feedback.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        Send feedback
        <IconButton
          aria-label="Close feedback dialog"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
            required
            fullWidth
          >
            {FEEDBACK_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            error={submitted && !title.trim()}
            helperText={submitted && !title.trim() ? 'Title is required.' : undefined}
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            multiline
            minRows={4}
            error={submitted && !description.trim()}
            helperText={submitted && !description.trim() ? 'Description is required.' : undefined}
          />

          <TextField
            select
            label="Affected area"
            value={area}
            onChange={(e) => setArea(e.target.value as AffectedArea)}
            required
            fullWidth
          >
            {AFFECTED_AREAS.map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as Environment)}
            required
            fullWidth
          >
            {ENVIRONMENTS.map((env) => (
              <MenuItem key={env} value={env}>
                {env}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="email"
            label="Your email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            error={!emailValid}
            helperText={
              !emailValid
                ? 'Enter a valid email address.'
                : 'So we can follow up. Leave blank to stay anonymous.'
            }
          />

          {result && (
            <Alert severity={result.severity}>
              <Typography variant="body2">{result.msg}</Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          startIcon={<GitHubIcon />}
          onClick={handleOpenGitHub}
        >
          Open GitHub Issue
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          Submit feedback
        </Button>
      </DialogActions>
    </Dialog>
  );
}
