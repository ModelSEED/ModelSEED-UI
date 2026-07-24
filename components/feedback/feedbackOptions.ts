// components/feedback/feedbackOptions.ts
export const FEEDBACK_TYPES = ['Bug', 'Feature', 'Question'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const AFFECTED_AREAS = [
  'FBA',
  'Gapfill',
  'Model viewer',
  'Biochem browser',
  'Media',
  'Genomes',
  'My Jobs / My Models',
  'Auth / Sign-in',
  'Other',
] as const;
export type AffectedArea = (typeof AFFECTED_AREAS)[number];

export const ENVIRONMENTS = [
  'staging.modelseed.org (staging)',
  'modelseed.org (production)',
  'localhost / dev',
  'Not sure',
] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

// Maps the dialog "Type" to the GitHub Issue Form template filename + label to prefill.
export const GITHUB_REPO = 'ModelSEED/ModelSEED-UI';
export const TEMPLATE_BY_TYPE: Record<FeedbackType, string> = {
  Bug: 'bug_report.yml',
  Feature: 'feature_request.yml',
  Question: 'question.yml',
};
export const LABELS_BY_TYPE: Record<FeedbackType, string[]> = {
  Bug: ['bug', 'triage'],
  Feature: ['enhancement', 'triage'],
  Question: ['question', 'triage'],
};

// Maps a dialog Environment value to the exact GitHub form option label (they match today,
// but keep the indirection so a divergence never silently breaks prefill).
export const ENV_TO_GH_OPTION: Record<Environment, string> = {
  'staging.modelseed.org (staging)': 'staging.modelseed.org (staging)',
  'modelseed.org (production)': 'modelseed.org (production)',
  'localhost / dev': 'localhost / dev',
  'Not sure': 'Not sure',
};

/**
 * Build a prefilled GitHub "new issue" URL for the given feedback fields.
 * Field ids used for prefill must match the Issue Form field `id`s in Phase 2.
 */
export function buildGitHubIssueUrl(input: {
  type: FeedbackType;
  title: string;
  description: string;
  area: AffectedArea;
  environment: Environment;
}): string {
  const template = TEMPLATE_BY_TYPE[input.type];
  const params = new URLSearchParams();
  params.set('template', template);
  params.set('title', `${input.title}`);
  params.set('labels', LABELS_BY_TYPE[input.type].join(','));
  // Per-field prefill (ids exist in the corresponding template):
  params.set('area', input.area);
  if (input.type === 'Bug') {
    params.set('environment', ENV_TO_GH_OPTION[input.environment]);
    params.set('what_happened', input.description);
  } else if (input.type === 'Feature') {
    params.set('request', input.description);
  } else {
    params.set('environment', ENV_TO_GH_OPTION[input.environment]);
    params.set('question', input.description);
  }
  return `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`;
}
