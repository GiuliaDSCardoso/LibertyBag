import React from 'react';
import {
  MatisseFlower,
  ShellIllustration,
  SunIllustration,
  WaveIllustration
} from '../illustrations/BeachIllustrations';
import { Button } from './Button';

interface EmptyStateProps {
  illustration?: 'flower' | 'sun' | 'wave' | 'shell';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration = 'sun',
  title,
  description,
  actionLabel,
  onAction
}) => {
  const renderIllustration = () => {
    switch (illustration) {
      case 'flower':
        return <MatisseFlower size={96} />;
      case 'wave':
        return <WaveIllustration size={96} />;
      case 'shell':
        return <ShellIllustration size={96} />;
      default:
        return <SunIllustration size={96} />;
    }
  };

  return (
    <div className="bg-white dark:bg-[#152144] rounded-card p-6 lg:p-8 text-center border border-blue-sky/60 dark:border-blue-sky/20 shadow-card flex flex-col items-center justify-center h-full">
      <div className="mb-4">{renderIllustration()}</div>
      <h3 className="font-serif italic text-xl font-bold mb-2 text-blue-deep dark:text-cream">
        {title}
      </h3>
      <p className="text-base text-blue-deep/85 dark:text-cream/85 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
