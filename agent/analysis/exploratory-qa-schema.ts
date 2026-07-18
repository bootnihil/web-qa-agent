import { z } from 'zod';

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
    .max(1_000)
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

export type ExploratoryQaFinding =
  z.infer<
    typeof exploratoryQaFindingSchema
  >;

export type ExploratoryQaAnalysis =
  z.infer<
    typeof exploratoryQaAnalysisSchema
  >;
