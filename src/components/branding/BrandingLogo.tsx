import { useQuery } from "@tanstack/react-query";

import { publicBrandingQuery } from "@/lib/branding/client";

/**
 * Optional institutional logo shown to the participant.
 * RR-019/020: appears in the top-right corner of the landing and
 * instructions screens. Renders nothing when no logo is configured
 * or when the investigator has hidden it.
 */
export function BrandingLogo({ className }: { className?: string }) {
  const { data } = useQuery(publicBrandingQuery());
  if (!data?.logoVisible || !data.logoUrl) return null;
  return (
    <div
      className={
        className ??
        "pointer-events-none absolute right-4 top-4 z-10 sm:right-6 sm:top-6"
      }
    >
      <img
        src={data.logoUrl}
        alt="Logo institucional"
        className="h-10 w-auto max-w-[140px] object-contain opacity-90 sm:h-12 sm:max-w-[180px]"
      />
    </div>
  );
}