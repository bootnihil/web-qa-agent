import { z } from 'zod';

import { agentActionSchema } from '../actions/agent-action-schema';

/**
 * A single exploratory decision produced by the AI planning layer.
 *
 * The planner may reason freely through the descriptive fields, but the
 * requested browser interaction must conform to the constrained AgentAction
 * vocabulary.
 */
export const plannerDecisionSchema = z.object({
  hypothesis: z
    .string()
    .min(1)
    .max(2_000),

  reasoning: z
    .string()
    .min(1)
    .max(2_000),

  action: agentActionSchema,

  expectedObservation: z
    .string()
    .min(1)
    .max(2_000)
});

export type PlannerDecision = z.infer<typeof plannerDecisionSchema>;
