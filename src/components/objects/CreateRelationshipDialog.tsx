import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api/errors";
import { createRelationshipMutation } from "@/lib/api/mutations";
import { objectListQuery } from "@/lib/api/queries";
import { CreateRelationshipRequestSchema } from "@/lib/api/schemas";
import type { CreateRelationshipRequest, KnowledgeObjectResumen } from "@/lib/api/types";
import {
  compareRelationshipTipos,
  listRelationshipTipos,
} from "@/lib/domain/relationship-ontology";

type FieldErrors = Partial<
  Record<"targetObjectId" | "type" | "description" | "provenance" | "confidence", string>
>;

interface Props {
  sourceObjectId: string;
  sourceTitle: string;
}

export function CreateRelationshipDialog({ sourceObjectId, sourceTitle }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Create Relationship
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Relationship</DialogTitle>
          <DialogDescription>
            Link <span className="font-medium text-foreground">{sourceTitle}</span> to another
            Knowledge Object.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <CreateRelationshipForm sourceObjectId={sourceObjectId} onClose={() => setOpen(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateRelationshipForm({
  sourceObjectId,
  onClose,
}: {
  sourceObjectId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation(createRelationshipMutation(qc));

  const ontology = useMemo(() => [...listRelationshipTipos()].sort(compareRelationshipTipos), []);

  const [targetQuery, setTargetQuery] = useState("");
  const [targetObjectId, setTargetObjectId] = useState<string>("");
  const [targetLabel, setTargetLabel] = useState<string>("");
  const [type, setTipo] = useState<string>("");
  const [description, setDescription] = useState("");
  const [provenance, setProvenance] = useState("");
  const [confidence, setLevel de confianza] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(targetQuery, 300);
  const searchEnabled = debouncedQuery.trim().length > 0;
  const search = useQuery({
    ...objectListQuery({ q: debouncedQuery, limit: 10, offset: 0 }),
    enabled: searchEnabled,
  });

  const results = search.data?.items ?? [];

  const pickTarget = (obj: KnowledgeObjectResumen) => {
    setTargetObjectId(obj.id);
    setTargetLabel(obj.title);
    setTargetQuery(obj.title);
    setFieldErrors((prev) => ({ ...prev, targetObjectId: undefined }));
  };

  const clearTarget = () => {
    setTargetObjectId("");
    setTargetLabel("");
  };

  const disabled = mutation.isPending;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled) return;
    setServerError(null);
    setFieldErrors({});

    const errs: FieldErrors = {};
    if (!targetObjectId) errs.targetObjectId = "Select a target object.";
    else if (targetObjectId === sourceObjectId)
      errs.targetObjectId = "Source and target must differ.";
    if (!type) errs.type = "Select a relationship type.";

    let confidenceNum: number | undefined;
    if (confidence.trim() !== "") {
      const n = Number(confidence);
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        errs.confidence = "Nivel de confianza must be a number between 0 and 1.";
      } else {
        confidenceNum = n;
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    const raw: CreateRelationshipRequest = {
      sourceObjectId,
      targetObjectId,
      type,
      description: description.trim() || undefined,
      provenance: provenance.trim() || undefined,
      confidence: confidenceNum,
    };

    const parsed = CreateRelationshipRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    mutation.mutate(parsed.data, {
      onSuccess: () => {
        onClose();
      },
      onError: (err) => {
        if (err instanceof ApiError) setServerError(`${err.status} — ${err.message}`);
        else setServerError((err as Error).message || "Error desconocido");
      },
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-busy={disabled} noValidate>
      {/* Target selection */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rel-target">
          Target object <span className="text-destructive">*</span>
        </Label>
        {targetObjectId ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{targetLabel}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {targetObjectId}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearTarget}>
              Change
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="rel-target"
                value={targetQuery}
                onChange={(e) => setTargetQuery(e.target.value)}
                placeholder="Search objects by title, keyword…"
                autoComplete="off"
                className="pl-8"
                disabled={disabled}
              />
            </div>
            <TargetResults
              enabled={searchEnabled}
              isLoading={search.isFetching}
              isError={search.isError}
              results={results}
              excludeId={sourceObjectId}
              onPick={pickTarget}
            />
          </>
        )}
        {fieldErrors.targetObjectId ? (
          <p role="alert" className="text-xs text-destructive">
            {fieldErrors.targetObjectId}
          </p>
        ) : null}
      </div>

      {/* Tipo */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rel-type">
          Tipo <span className="text-destructive">*</span>
        </Label>
        <Select value={type} onValueChange={setTipo} disabled={disabled}>
          <SelectTrigger id="rel-type">
            <SelectValue placeholder="Select a relationship type…" />
          </SelectTrigger>
          <SelectContent>
            {ontology.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                <span className="font-medium">{d.displayName}</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">{d.id}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.type ? (
          <p role="alert" className="text-xs text-destructive">
            {fieldErrors.type}
          </p>
        ) : null}
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rel-desc">Descripción</Label>
        <Textarea
          id="rel-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={500}
          disabled={disabled}
          placeholder="Optional context…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rel-prov">Provenance</Label>
          <Input
            id="rel-prov"
            value={provenance}
            onChange={(e) => setProvenance(e.target.value)}
            disabled={disabled}
            placeholder="e.g. manual"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rel-conf">Nivel de confianza</Label>
          <Input
            id="rel-conf"
            value={confidence}
            onChange={(e) => setLevel de confianza(e.target.value)}
            disabled={disabled}
            inputMode="decimal"
            placeholder="0.0 – 1.0"
          />
          {fieldErrors.confidence ? (
            <p role="alert" className="text-xs text-destructive">
              {fieldErrors.confidence}
            </p>
          ) : null}
        </div>
      </div>

      {serverError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={disabled}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          {disabled ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Guardando…
            </>
          ) : (
            "Create Relationship"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

function TargetResults({
  enabled,
  isLoading,
  isError,
  results,
  excludeId,
  onPick,
}: {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  results: readonly KnowledgeObjectResumen[];
  excludeId: string;
  onPick: (obj: KnowledgeObjectResumen) => void;
}) {
  if (!enabled) {
    return <p className="text-[11px] text-muted-foreground">Tipo to search Objetos de conocimiento.</p>;
  }
  if (isLoading) {
    return <p className="text-[11px] text-muted-foreground">Searching…</p>;
  }
  if (isError) {
    return <p className="text-[11px] text-destructive">Search failed.</p>;
  }
  const filtered = results.filter((r) => r.id !== excludeId);
  if (filtered.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No matches.</p>;
  }
  return (
    <ul
      role="listbox"
      aria-label="Target object search results"
      className="max-h-56 overflow-y-auto rounded-md border border-border/60 bg-card/40"
    >
      {filtered.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            role="option"
            aria-selected={false}
            onClick={() => onPick(r)}
            className="flex w-full flex-col items-start gap-0.5 border-b border-border/40 px-3 py-2 text-left last:border-0 hover:bg-accent/20 focus-visible:bg-accent/20 focus-visible:outline-none"
          >
            <span className="truncate text-sm text-foreground">{r.title}</span>
            <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <span>{r.type}</span>
              <span>·</span>
              <span>{r.category}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
