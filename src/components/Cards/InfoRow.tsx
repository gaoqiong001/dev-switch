interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

export default function InfoRow({ label, value, mono = false }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-[var(--border)] last:border-b-0">
      <span className="text-[13px] text-[var(--muted-fg)] font-medium">{label}</span>
      <span className={`text-sm text-[var(--fg)] font-semibold ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value}
      </span>
    </div>
  );
}
