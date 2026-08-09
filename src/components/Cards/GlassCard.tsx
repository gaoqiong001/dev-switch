import { ReactNode } from 'react';

interface GlassCardProps {
  icon: string;
  title: ReactNode;
  children: ReactNode;
  unavailable?: boolean;
  actions?: ReactNode;
}

export default function GlassCard({ icon, title, children, unavailable, actions }: GlassCardProps) {
  return (
    <div className={`p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
      unavailable ? 'opacity-60 border-dashed' : ''
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-base font-semibold text-[var(--card-fg)]">{title}</h3>
      </div>
      <div className="min-h-[80px]">{children}</div>
      {actions && <div className="mt-4 flex gap-2">{actions}</div>}
    </div>
  );
}
