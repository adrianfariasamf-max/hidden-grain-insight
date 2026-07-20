import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle, Check, Copy, Download, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

// Preferred participant-facing origin. When the researcher is working on the
// preview host (`id-preview--…lovable.app` / `lovableproject.com`), the
// preview URL is auth-gated by the platform: any participant opening it will
// be bounced to `/auth-bridge` and see an `HTTP 401 {"error":"unauthorized"}`
// even though our public `/api/public/*` endpoints are open. Setting
// `VITE_HG_PUBLIC_BASE` to the published origin (e.g. `https://<slug>.lovable.app`)
// forces SharePanel to always emit the published, participant-safe URL.
const PUBLIC_BASE = (import.meta.env.VITE_HG_PUBLIC_BASE ?? "").toString().trim().replace(/\/+$/, "");

function looksLikePreviewOrigin(origin: string): boolean {
  return (
    origin.includes("id-preview--") ||
    origin.includes("-preview-") ||
    origin.endsWith(".lovableproject.com") ||
    origin.includes(".lovableproject.com")
  );
}

export function SharePanel({ experimentId }: { experimentId: string }) {
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareOrigin = PUBLIC_BASE || origin;
  const shareUrl = shareOrigin ? `${shareOrigin}/e/${experimentId}` : "";
  const previewWarning = !PUBLIC_BASE && origin && looksLikePreviewOrigin(origin);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!shareUrl) return;
    let cancelled = false;
    QRCode.toDataURL(shareUrl, { width: 320, margin: 1 })
      .then((d) => {
        if (!cancelled) setQr(d);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="rounded-lg border border-primary/40 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Compartir experimento</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Comparte este enlace con las personas participantes. Cualquiera con el enlace puede unirse.
      </p>

      {previewWarning ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p>
            Estás en el entorno de vista previa. Este enlace requiere iniciar sesión de
            investigador y mostrará <code className="font-mono">HTTP 401</code> a los participantes.
            Comparte el enlace desde el sitio publicado o configura
            {" "}<code className="font-mono">VITE_HG_PUBLIC_BASE</code> con el dominio público.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="grid gap-2">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Enlace público
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
              onFocus={(e) => e.target.select()}
            />
            <Button type="button" size="sm" onClick={copy}>
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar enlace
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {qr ? (
            <>
              <img
                src={qr}
                alt="Código QR del enlace del experimento"
                className="h-32 w-32 rounded-md border border-border bg-white p-1"
              />
              <a
                href={qr}
                download={`experiment-${experimentId}.png`}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3 w-3" /> Descargar QR
              </a>
            </>
          ) : (
            <div className="h-32 w-32 rounded-md border border-dashed border-border/60" />
          )}
        </div>
      </div>
    </section>
  );
}
