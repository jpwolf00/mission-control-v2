import React from 'react';
import { cn } from '@/lib/utils';
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
    <div className="flex items-center space-x-1">
      {gates.map((gate, index) => {
        const isCompleted = completedGates.includes(gate);
        const isCurrent = gate === currentGate;
        const isFailed = failedGates.includes(gate);
        const isPending = index > currentIndex;

        return (
          <React.Fragment key={gate}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-blue-500 text-white ring-2 ring-blue-200",
                  isFailed && "bg-red-500 text-white",
                  isPending && "bg-gray-200 text-gray-500"
                )}
              >
                {isCompleted ? '✓' : isFailed ? '!' : index + 1}
              </div>
              <span className="text-xs mt-1 text-muted-foreground">
                {gateLabels[gate]}
              </span>
            </div>
            {index < gates.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 transition-colors",
                  index < currentIndex ? "bg-green-500" : "bg-gray-200"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
