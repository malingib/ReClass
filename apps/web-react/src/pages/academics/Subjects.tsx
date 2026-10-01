import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  LoadingButton,
  PageHeader,
  useDisclosure,
} from '@/components/ui';
import { Plus, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Subject = {
  id: string;
  name: string;
  code: string | null;
};

const SUBJECT_ACCENT = 'bg-primary/30';

export default function Subjects() {
  const qc = useQueryClient();
  const { open: showForm, show, hide } = useDisclosure();
  const confirmDelete = useDisclosure();
  const [editing, setEditing] = useState<Subject | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: '', code: '' });

  const { data: subjects = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id,name,code')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Subject[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await supabase.from('subjects').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Subject created');
      qc.invalidateQueries({ queryKey: ['subjects'] });
      hide();
      resetForm();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...row }: Record<string, unknown>) => {
      const { error } = await supabase.from('subjects').update(row).eq('id', id as string);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Subject updated');
      qc.invalidateQueries({ queryKey: ['subjects'] });
      hide();
      resetForm();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Subject deleted');
      qc.invalidateQueries({ queryKey: ['subjects'] });
      confirmDelete.hide();
      setPendingDelete(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function resetForm() {
    setForm({ name: '', code: '' });
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    show();
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setForm({ name: subject.name, code: subject.code ?? '' });
    show();
  }

  function askDelete(subject: Subject) {
    setPendingDelete(subject);
    confirmDelete.show();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Subject name is required.');
      return;
    }
    const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase() || null };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Academics"
        title="Subjects"
        description="Manage subjects offered at the school."
        action={<Button onClick={openCreate}><Plus className="size-4" />Add Subject</Button>}
      />

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Subject name" htmlFor="subject-name">
                <Input
                  id="subject-name"
                  placeholder="e.g. Mathematics"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Code" htmlFor="subject-code">
                <Input
                  id="subject-code"
                  placeholder="e.g. MATH"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </Field>
              <div className="flex items-end gap-2">
                <LoadingButton loading={loading}>{editing ? 'Update' : 'Create'}</LoadingButton>
                <Button type="button" variant="outline" onClick={() => { hide(); resetForm(); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {pendingDelete && confirmDelete.open && (
        <ConfirmDialog
          title="Delete Subject"
          description={`Delete "${pendingDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          tone="destructive"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
          onClose={() => { confirmDelete.hide(); setPendingDelete(null); }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Could not load subjects"
          description="Something went wrong fetching subjects. Try again."
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Add subjects to build your curriculum."
          action={<Button onClick={openCreate}><Plus className="size-4" />Add Subject</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="relative overflow-hidden transition-shadow hover:shadow-md">
              <div className={cn('h-2', SUBJECT_ACCENT)} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-muted-foreground" />
                      <h3 className="font-semibold">{subject.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{subject.code ?? 'No code'}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(subject)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => askDelete(subject)}>
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
