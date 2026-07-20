import { useQuery } from "@tanstack/react-query";

import { publicBrandingQuery } from "@/lib/branding/client";

/**
 * Optional institutional logo shown to the participant.
 * SR-001: encabezado inline arriba del título, alineado a la izquierda
 * con el contenido. Se muestra en landing e instrucciones, nunca en la
 * pantalla de estímulos. No renderiza nada si no hay logo configurado
 * o el investigador lo tiene oculto.
 */
export function BrandingLogo({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "lg";
}) {
  const { data } = useQuery(publicBrandingQuery());
  if (!data?.logoVisible || !data.logoUrl) return null;
  const imgClass =
    size === "lg"
      ? "h-28 w-auto max-w-[360px] object-contain sm:h-32 sm:max-w-[480px]"
      : "h-8 w-auto max-w-[120px] object-contain sm:h-10 sm:max-w-[160px]";
  return (
    <div className={className ?? "mb-4 flex items-center sm:mb-6"}>
      <img
        src={data.logoUrl}
        alt="Logo institucional"
        className={imgClass}
      />
    </div>
  );
}