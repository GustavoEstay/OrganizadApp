import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ReceiveIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Base>
);

export const SentIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Base>
);

export const MessageIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4.5 7 7.5 6 7.5-6" />
  </Base>
);

export const AirdropIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 13.5h4l1.5 2.5h5l1.5-2.5h4" />
    <path d="M4 13.5 6 6h12l2 7.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4.5Z" />
    <path d="M12 3v7m0 0-2.5-2.5M12 10l2.5-2.5" />
  </Base>
);

export const ProgramIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4" />
  </Base>
);

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.5 9.5H6.8L4 12V5.5A2 2 0 0 1 6 3.5h6.5a2 2 0 0 1 2 2v4Z" />
    <path d="M14.5 7.5h3.5a2 2 0 0 1 2 2V16l-2.8-2.5H11a2 2 0 0 1-2-2v-2" />
  </Base>
);

export const SparkleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5Z" />
    <path d="M18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.2-2.2.9-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5Z" />
  </Base>
);

export const DotsIcon = (p: IconProps) => (
  <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" {...p}>
    <circle cx="5.5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18.5" cy="12" r="1.6" />
  </svg>
);

export const ExternalIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Base>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 19V5m0 0-6 6m6-6 6 6" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v4h-4" />
  </Base>
);

/** Friendly ghost glyph for the wallet button (not the official Phantom logo). */
export const GhostIcon = (p: IconProps) => (
  <svg aria-hidden viewBox="0 0 32 32" {...p}>
    <circle cx="16" cy="16" r="16" fill="#efeafd" />
    <path
      fill="#5847cf"
      d="M8 16.4C8 11.8 11.6 8 16 8s8 3.8 8 8.4V23c0 .9-1 1.4-1.7.8l-1.1-.9a1 1 0 0 0-1.3 0l-1.4 1.2a1 1 0 0 1-1.3 0L16 22.9l-1.2 1.2a1 1 0 0 1-1.3 0l-1.4-1.2a1 1 0 0 0-1.3 0l-1.1.9C9 24.4 8 23.9 8 23v-6.6Z"
    />
    <ellipse cx="13.3" cy="15.6" rx="1.3" ry="1.9" fill="#fff" />
    <ellipse cx="18.7" cy="15.6" rx="1.3" ry="1.9" fill="#fff" />
  </svg>
);

/** OrganizadApp mark: a stacked "O" of two arcs (green and amber), like sorted layers. */
export const LogoMark = (p: IconProps) => (
  <svg aria-hidden viewBox="0 0 40 40" {...p}>
    <rect width="40" height="40" rx="12" fill="#1d4a33" />
    <path
      d="M11 20a9 9 0 0 1 18 0"
      fill="none"
      stroke="#e5a948"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <path
      d="M29 20a9 9 0 0 1-18 0"
      fill="none"
      stroke="#fdfaf3"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <circle cx="20" cy="20" r="2.6" fill="#e5a948" />
  </svg>
);
