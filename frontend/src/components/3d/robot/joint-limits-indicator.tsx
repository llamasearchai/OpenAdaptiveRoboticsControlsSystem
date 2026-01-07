'use client';

import * as React from 'react';
import { Html } from '@react-three/drei';
import { useRobotStore } from '@/stores/robot';

export function JointLimitsIndicator() {
  const { jointPositions, jointLimits } = useRobotStore();

  const warningJoints = React.useMemo(() => {
    return jointPositions.map((angle, index) => {
      const min = jointLimits.pos_min[index] ?? -Math.PI;
      const max = jointLimits.pos_max[index] ?? Math.PI;
      const range = max - min;
      const distToMin = angle - min;
      const distToMax = max - angle;
      const minDist = Math.min(distToMin, distToMax);
      const proximityPercent = (minDist / (range / 2)) * 100;

      return {
        index,
        angle,
        min,
        max,
        proximityPercent,
        isWarning: proximityPercent < 20,
        isCritical: proximityPercent < 10,
      };
    });
  }, [jointPositions, jointLimits]);

  const criticalJoints = warningJoints.filter((j) => j.isWarning);

  if (criticalJoints.length === 0) {
    return null;
  }

  return (
    <Html position={[0, 2, 0]} center style={{ pointerEvents: 'none' }}>
      <div className="bg-destructive/90 text-destructive-foreground rounded-md px-3 py-2 shadow-lg">
        <div className="text-xs font-semibold mb-1">Joint Limit Warning</div>
        {criticalJoints.map((joint) => (
          <div key={joint.index} className="text-xs">
            J{joint.index + 1}: {joint.proximityPercent.toFixed(0)}% from limit
          </div>
        ))}
      </div>
    </Html>
  );
}
