import { ShieldAlert } from 'lucide-react';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-amber">
          <ShieldAlert className="h-5 w-5" strokeWidth={2.5} />
        </div>
      </div>
      <div className="leading-none">
        <div className="font-headline text-lg font-extrabold tracking-tight text-ink">
          Prop65<span className="text-amber">Shield</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
          Warning Label Display
        </div>
      </div>
    </div>
  );
}
