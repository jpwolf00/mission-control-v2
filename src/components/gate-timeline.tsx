'use client';

import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import { Gate } from '@/domain/workflow-types';

interface GateTimelineProps {
  currentGate?: Gate;
  completedGates: Gate[];
  failedGates?: Gate[];
}

const gates: Gate[] = ['architect', 'implementer', 'reviewer-a', 'operator', 'reviewer-b'];

const gateLabels: Record<Gate, string> = {
  architect: 'Design',
  implementer: 'Build',
  'reviewer-a': 'Review',
  operator: 'Deploy',
  'reviewer-b': 'Validate',
};

export function GateTimeline({ currentGate, completedGates, failedGates = [] }: GateTimelineProps) {
  const currentIndex = currentGate ? gates.indexOf(currentGate) : -1;

  return (
    <Stepper activeStep={currentIndex} alternativeLabel>
      {gates.map((gate) => {
        const isFailed = failedGates.includes(gate);
        const isCompleted = completedGates.includes(gate);

        return (
          <Step key={gate} completed={isCompleted}>
            <StepLabel error={isFailed}>
              {gateLabels[gate]}
            </StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
}
