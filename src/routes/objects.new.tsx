import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/errors";
import { createObjectMutation } from "@/lib/api/mutations";
import { CreateKnowledgeObjectRequestSchema } from "@/lib/api/schemas";
import type { CreateKnowledgeObjectRequest } from "@/lib/api/types";

export const Route = createFileRoute("/objects/new")({
  head: () => ({
    meta: [
      { title: "New Object — Hidden Grain" },
      { name: "description", content: "Create a Knowledge Object." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewObjectRoute,
});

// Parse a comma / newline separated string into a trimmed, de-duplicated array.
function splitList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const v = part.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

type FieldErrors = Partial<Record<keyof CreateKnowledgeObjectRequest, string>>;

function NewObjectRoute() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mutation = useMutation(createObjectMutation(qc));

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tags, setTags] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mutation.isPending) return; // double-submit protection

    setServerError(null);
    setFieldErrors({});

    const raw = {
      title: title.trim(),
      type: type.trim(),
      category: category.trim(),
      status: status.trim(),
      summary: summary.trim() || undefined,
      keywords: splitList(keywords),
      tags: splitList(tags),
    };

    const parsed = CreateKnowledgeObjectRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CreateKnowledgeObjectRequest | undefined;
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    mutation.mutate(parsed.data, {
      onSuccess: (data) => {
        navigate({ to: "/objects/$id", params: { id: data.object.id } });
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          setServerError(`${err.status} — ${err.message}`);
        } else if (err instanceof z.ZodError) {
          setServerError("Server returned an unexpected payload.");
        } else {
          setServerError((err as Error).message || "Unknown error");
        }
      },
    });
  };

  const disabled = mutation.isPending;

  return (
    <>
      <PageHeader
        eyebrow="Explorer"
        title="New Knowledge Object"
        description="Create a Knowledge Object persisted through the canonical API contract."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/explorer">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Explorer
            </Link>
          </Button>
        }
      />
      <div className="px-8 py-6">
        <form
          onSubmit={onSubmit}
          className="mx-auto flex max-w-2xl flex-col gap-5"
          noValidate
          aria-busy={disabled}
        >
          <Field
            id="title"
            label="Title"
            required
            error={fieldErrors.title}
            hint="1–200 characters."
          >
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={disabled}
              autoFocus
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="type" label="Type" required error={fieldErrors.type}>
              <Input
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={disabled}
                placeholder="e.g. document"
              />
            </Field>
            <Field id="category" label="Category" required error={fieldErrors.category}>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={disabled}
                placeholder="e.g. architecture"
              />
            </Field>
          </div>

          <Field id="status" label="Status" required error={fieldErrors.status}>
            <Input
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={disabled}
              placeholder="e.g. draft, stable"
            />
          </Field>

          <Field
            id="summary"
            label="Summary"
            error={fieldErrors.summary}
            hint="Optional. Up to 2000 characters."
          >
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={2000}
              rows={4}
              disabled={disabled}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="keywords"
              label="Keywords"
              error={fieldErrors.keywords}
              hint="Comma separated."
            >
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                disabled={disabled}
                placeholder="graph, ontology"
              />
            </Field>
            <Field id="tags" label="Tags" error={fieldErrors.tags} hint="Comma separated.">
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={disabled}
                placeholder="core, draft"
              />
            </Field>
          </div>

          {serverError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
            <Button asChild type="button" variant="ghost" disabled={disabled}>
              <Link to="/explorer">Cancel</Link>
            </Button>
            <Button type="submit" disabled={disabled}>
              {disabled ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Create Object"
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}