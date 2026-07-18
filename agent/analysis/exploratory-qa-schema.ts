import { z } from 'zod';

export const selectOptionEvidenceTargetSchema =
  z.object({
    kind: z.literal('select-option'),

    controlLabel: z
      .string()
      .min(1)
      .max(500)
      .nullable(),

    controlName: z
      .string()
      .min(1)
      .max(500)
      .nullable(),

    controlId: z
      .string()
      .min(1)
      .max(500)
      .nullable(),

    optionText: z
      .string()
      .min(1)
      .max(500)
  });

export const exploratoryQaFindingSchema = z.object({
  category: z.enum([
    'content',
    'navigation',
    'interaction',
    'visual',
    'accessibility',
    'consistency',
    'technical',
    'other'
  ]),

  severity: z.enum([
    'high',
    'medium',
    'low'
  ]),

  confidence: z.enum([
    'high',
    'medium',
    'low'
  ]),

  title: z
    .string()
    .min(1)
    .max(200),

  evidence: z
    .string()
    .min(1)
    .max(2_000),

  reasoning: z
    .string()
    .min(1)
    .max(2_000),

  suggestedCheck: z
    .string()
    .min(1)
    .max(1_000),

  /*
   * Optional machine-readable evidence target.
   *
   * This is null when the finding cannot be tied
   * safely and precisely to a supported UI element.
   *
   * Our first supported target is a specific option
   * inside a select dropdown.
   */
  evidenceTarget:
    selectOptionEvidenceTargetSchema
      .nullable()
});

export const exploratoryQaAnalysisSchema = z.object({
  findings: z
    .array(exploratoryQaFindingSchema)
    .max(10),

  summary: z
    .string()
    .min(1)
    .max(1_000)
});

export type SelectOptionEvidenceTarget =
  z.infer<
    typeof selectOptionEvidenceTargetSchema
  >;

export type ExploratoryQaFinding =
  z.infer<
    typeof exploratoryQaFindingSchema
  >;

export type ExploratoryQaAnalysis =
  z.infer<
    typeof exploratoryQaAnalysisSchema
  >;
