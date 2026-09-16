import { describe, it, expect } from 'vitest';
import { buildGitHubIssueUrl } from '../feedbackOptions';

describe('buildGitHubIssueUrl', () => {
  it('routes a Bug to bug_report.yml with bug labels and prefilled fields', () => {
    const url = buildGitHubIssueUrl({
      type: 'Bug', title: 'FBA crashes', description: 'clicked run and it froze',
      area: 'FBA', environment: 'staging.modelseed.org (staging)',
    });
    expect(url).toContain('https://github.com/ModelSEED/ModelSEED-UI/issues/new?');
    expect(url).toContain('template=bug_report.yml');
    expect(decodeURIComponent(url)).toContain('labels=bug,triage');
    expect(decodeURIComponent(url)).toContain('title=FBA crashes');
    expect(decodeURIComponent(url)).toContain('area=FBA');
    expect(decodeURIComponent(url)).toContain('what_happened=clicked run and it froze');
  });

  it('routes a Feature to feature_request.yml', () => {
    const url = buildGitHubIssueUrl({
      type: 'Feature', title: 'Add export', description: 'export as SBML',
      area: 'Model viewer', environment: 'Not sure',
    });
    expect(url).toContain('template=feature_request.yml');
    expect(decodeURIComponent(url)).toContain('labels=enhancement,triage');
    expect(decodeURIComponent(url)).toContain('request=export as SBML');
  });

  it('routes a Question to question.yml', () => {
    const url = buildGitHubIssueUrl({
      type: 'Question', title: 'What is flux?', description: 'meaning of flux value',
      area: 'Biochem browser', environment: 'modelseed.org (production)',
    });
    expect(url).toContain('template=question.yml');
    expect(decodeURIComponent(url)).toContain('labels=question,triage');
    expect(decodeURIComponent(url)).toContain('question=meaning of flux value');
  });
});
