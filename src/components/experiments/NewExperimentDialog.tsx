import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

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
import { Textarea } from "@/components/ui/textarea";
import { createExperimentSchema } from "@/lib/perception/schemas";
import { experimentKeys, experimentsApi } from "@/lib/perception/client";

export function NewExperimentDialog({ trigger }: { trigger: React.ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [hiddenTarget, setHiddenTarget] = useState("");
  const [issues, setIssues] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: experimentsApi.create,
    onSuccess: (exp) => {
      qc.invalidateQueries({ queryKey: experimentKeys.list() });
      setOpen(false);
      setTitle("");
      setDescription("");
      setInstructions("");
      setHiddenTarget("");
      setIssues([]);
      navigate({ to: "/experiments/$id", params: { id: exp.id } });
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createExperimentSchema.safeParse({
      title,
      description: description || undefined,
      instructions: instructions || undefined,
      hiddenTarget,
    });
    if (!parsed.success) {
      setIssues(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      return;
    }
    setIssues([]);
    mutation.mutate(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo experimento</DialogTitle>
          <DialogDescription>
            Crea un estudio de percepción. Podrás editar cada campo después.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="new-exp-title">Título</Label>
            <Input
              id="new-exp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Estudio de percepción #1"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-exp-desc">Descripción</Label>
            <Textarea
              id="new-exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Resumen breve para tus propios registros."
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-exp-instr">Instrucciones para participantes</Label>
            <Textarea
              id="new-exp-instr"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Lo que las personas participantes leerán antes de ver las imágenes."
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-exp-hidden">
              Objetivo oculto <span className="text-muted-foreground">(sólo para el investigador)</span>
            </Label>
            <Input
              id="new-exp-hidden"
              value={hiddenTarget}
              onChange={(e) => setHiddenTarget(e.target.value)}
              placeholder="Elemento que estás estudiando — nunca se muestra a las personas participantes."
              required
            />
          </div>
          {issues.length > 0 ? (
            <ul className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          ) : null}
          {mutation.error ? (
            <p className="text-xs text-destructive">{(mutation.error as Error).message}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creando…" : "Crear experimento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}