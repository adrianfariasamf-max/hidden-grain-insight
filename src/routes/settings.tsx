import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, RefreshCcw, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LoadingState } from "@/components/state/LoadingState";
import { ErrorState } from "@/components/state/ErrorState";
import { brandingAdminQuery, brandingApi } from "@/lib/branding/client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configuración — Hidden Grain" },
      { name: "description", content: "Identidad institucional visible a los participantes." },
    ],
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        title="Identidad institucional"
        description="Administra el logo que verán los participantes en las pantallas de bienvenida e instrucciones."
      />
      <div className="flex flex-col gap-8 px-4 py-6 sm:px-8">
        <BrandingSection />
      </div>
    </>
  );
}

function BrandingSection() {
  const qc = useQueryClient();
  const query = useQuery(brandingAdminQuery());
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["branding", "admin"] });
    qc.invalidateQueries({ queryKey: ["branding", "public"] });
  };

  const visibilityMutation = useMutation({
    mutationFn: (visible: boolean) => brandingApi.setVisibility(visible),
    onSuccess: () => invalidate(),
  });

  const removeMutation = useMutation({
    mutationFn: () => brandingApi.remove(),
    onSuccess: () => invalidate(),
  });

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const signed = await brandingApi.signUpload(file.name);
      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`No se pudo subir el logo (${put.status})`);
      await brandingApi.commitUpload(signed.logoPath);
      invalidate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (query.isLoading) return <LoadingState label="Cargando configuración…" />;
  if (query.error)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data) return null;

  const branding = query.data;
  const hasLogo = Boolean(branding.logoPath && branding.logoUrl);

  return (
    <section
      aria-labelledby="branding-heading"
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:p-6"
    >
      <header className="flex flex-col gap-1">
        <h2 id="branding-heading" className="text-sm font-semibold text-foreground">
          Logo institucional
        </h2>
        <p className="text-xs text-muted-foreground">
          Un único logo compartido por todos los experimentos. Aparece en la esquina superior
          derecha de las pantallas de bienvenida e instrucciones. Es opcional; si lo ocultas
          o lo eliminas, simplemente no se mostrará.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)] sm:items-start">
        <div className="grid h-32 place-items-center rounded-md border border-dashed border-border bg-muted/30 p-3">
          {hasLogo ? (
            <img
              src={branding.logoUrl!}
              alt="Logo institucional (vista previa)"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground">Sin logo configurado</span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">Mostrar a participantes</span>
              <span className="text-[11px] text-muted-foreground">
                {hasLogo
                  ? "Aparece en la esquina superior derecha."
                  : "Sube un logo para poder mostrarlo."}
              </span>
            </div>
            <Switch
              checked={branding.logoVisible && hasLogo}
              disabled={!hasLogo || visibilityMutation.isPending}
              onCheckedChange={(v) => visibilityMutation.mutate(v)}
              aria-label="Mostrar logo a participantes"
            />
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={hasLogo ? "outline" : "default"}
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Subiendo…
                </>
              ) : hasLogo ? (
                <>
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Reemplazar logo
                </>
              ) : (
                <>
                  <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Subir logo
                </>
              )}
            </Button>
            {hasLogo ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
              </Button>
            ) : null}
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {visibilityMutation.error ? (
            <p className="text-xs text-destructive">
              {(visibilityMutation.error as Error).message}
            </p>
          ) : null}
          {removeMutation.error ? (
            <p className="text-xs text-destructive">
              {(removeMutation.error as Error).message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}