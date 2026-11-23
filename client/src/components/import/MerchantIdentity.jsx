import { useState } from 'react';
import { getMerchantDisplay } from '../../services/merchantPresentation';

function GenericMerchantIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 6h16" />
      <path d="M4 10h16" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 15h4" />
    </svg>
  );
}

export function MerchantAvatar({ display, size = 'md' }) {
  const [failedLogoUrl, setFailedLogoUrl] = useState(null);
  const showLogo = Boolean(display.logoUrl) && failedLogoUrl !== display.logoUrl;
  const dimensionClass = size === 'lg' ? 'h-10 w-10 rounded-xl' : 'h-8 w-8 rounded-lg';
  const pxSize = size === 'lg' ? 40 : 32;

  if (showLogo) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white p-1 ${dimensionClass}`}
      >
        <img
          src={display.logoUrl}
          alt={display.altText}
          width={pxSize}
          height={pxSize}
          loading="lazy"
          decoding="async"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailedLogoUrl(display.logoUrl)}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  if (display.hasMerchant && display.initials) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center border border-slate-200 bg-slate-100 text-xs font-bold tracking-tight text-slate-600 ${dimensionClass}`}
      >
        {display.initials}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border border-slate-200 bg-slate-100/80 text-slate-400 ${dimensionClass}`}
    >
      <GenericMerchantIcon />
    </span>
  );
}

export function MerchantIdentity({ transaction }) {
  const display = getMerchantDisplay(transaction);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <MerchantAvatar display={display} />
      <div className="min-w-0 flex-1">
        <span
          className={`block truncate ${display.hasMerchant ? 'font-semibold text-slate-900' : 'text-slate-800'}`}
          title={display.primaryLabel}
        >
          {display.primaryLabel}
        </span>
        {display.secondaryDescription && (
          <span
            className="block truncate text-xs font-normal text-slate-500"
            title={display.secondaryDescription}
          >
            {display.secondaryDescription}
          </span>
        )}
      </div>
    </div>
  );
}
