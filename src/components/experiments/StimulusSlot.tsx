import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, RefreshCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { experimentKeys, experimentsApi } from "@/lib/perception/client";
import type { ExperimentStimulus } from "@/lib/perception/types";

interface Props {
  experimentId: string;
  position: 1 | 2 | 3;
  stimulus: ExperimentStimulus | undefined;
  readOnly: boolean;
}

export function StimulusSlot({ experimentId, position, stimulus, readOnly }: Props) {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [altText, setAltText] = useState(stimulus?.altText ?? "");

  useEffect(() => {
    setAltText(stimulus?.altText ?? "");
  }, [stimulus?.id, stimulus?.altText]);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: experimentKeys.detail(experimentId) });

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const signed = await experimentsApi.signUpload(experimentId, file.name, file.type);
      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      if (stimulus) {
        await experimentsApi.updateStimulus(experimentId, stimulus.id, {
          imagePath: signed.imagePath,
          imageUrl: signed.imageUrl,
        });
      } else {
        await experimentsApi.addStimulus(experimentId, {
          position,
          imagePath: signed.imagePath,
          imageUrl: signed.imageUrl,
          altText: "",
        });
      }
      await invalidate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const altMutation = useMutation({
    mutationFn: (value: string) =>
      experimentsApi.updateStimulus(experimentId, stimulus!.id, { altText: value }),
    onSuccess: () => invalidate(),
  });

  const removeMutation = useMutation({
    mutationFn: () => experimentsApi.deleteStimulus(experimentId, stimulus!.id),
    onSuccess: () => invalidate(),
  });

  const showAltMissing = Boolean(stimulus) && altText.trim().length === 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 font-mono text-[11px] text-primary">
            {position}
          </span>
          <h3 className="text-sm font-semibold text-foreground">Stimulus {position}</h3>
        </div>
        {stimulus ? (
          <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[11px] text-primary">
            cargada
          </span>
        ) : (
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            vacío
          </span>
        )}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-md border border-border/60 bg-muted/30">
        {stimulus?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stimulus.imageUrl}
            alt={stimulus.altText || `Stimulus ${position}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Sin imagen
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 grid place-items-center bg-background/70 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo…
          </div>
        ) : null}
      </div>

      {stimulus ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`alt-${position}`} className="flex items-center gap-2">
            Texto alternativo
            <span className="text-[10px] text-muted-foreground">(requerido para publicar)</span>
          </Label>
          <Input
            id={`alt-${position}`}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            onBlur={() => {
              if (altText !== stimulus.altText) altMutation.mutate(altText);
            }}
            placeholder="Describe la imagen para accesibilidad y análisis."
            disabled={readOnly}
          />
          {showAltMissing ? (
            <p className="text-[11px] text-warning">Texto alternativo is required before publishing.</p>
          ) : null}
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {stimulus.imagePath}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
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
        <Button
          type="button"
          size="sm"
          variant={stimulus ? "outline" : "default"}
          onClick={() => fileInput.current?.click()}
          disabled={uploading || readOnly}
        >
          {stimulus ? (
            <>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Reemplazar imagen
            </>
          ) : (
            <>
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Subir imagen
            </>
          )}
        </Button>
        {stimulus ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending || readOnly}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {altMutation.error ? (
        <p className="text-xs text-destructive">{(altMutation.error as Error).message}</p>
      ) : null}
      {removeMutation.error ? (
        <p className="text-xs text-destructive">{(removeMutation.error as Error).message}</p>
      ) : null}
    </div>
  );
}