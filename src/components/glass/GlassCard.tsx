import React from 'react';
import { GlassContainer, GlassContainerProps } from './GlassContainer';

export interface GlassCardProps extends GlassContainerProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
  ...props
}) => {
  return (
    <GlassContainer className={`p-6 ${className}`} {...props}>
      {(title || subtitle || badge || action) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {title && <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>}
              {badge}
            </div>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </GlassContainer>
  );
};
