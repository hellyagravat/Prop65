import { DISCLAIMER } from '../lib/disclaimer';

export function DisclaimerFooter() {
  return (
    <div className="border-t border-ink/10 bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <p className="mx-auto max-w-4xl text-center font-body text-xs leading-relaxed text-ink/55">
          {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
