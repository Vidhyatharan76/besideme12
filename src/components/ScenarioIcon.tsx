import React from 'react';
import { FileText, GraduationCap, Landmark, Stethoscope } from 'lucide-react';

interface ScenarioIconProps {
  icon: string;
  className?: string;
}

export const ScenarioIcon: React.FC<ScenarioIconProps> = ({ icon, className = 'w-5 h-5' }) => {
  switch (icon) {
    case 'school':
      return <GraduationCap className={className} aria-hidden="true" />;
    case 'clinic':
      return <Stethoscope className={className} aria-hidden="true" />;
    case 'bank':
      return <Landmark className={className} aria-hidden="true" />;
    default:
      return <FileText className={className} aria-hidden="true" />;
  }
};
