import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useFeeTypes } from '@/hooks/useFinance';
import { Button, Input, LoadingButton } from './ui';
import { ConfirmDelete } from './ConfirmDelete';
import { DataTable } from './DataTable';

/** Port of FeeManager.svelte — Bursar-owned fee type CRUD. */
export function FeeManager() {
  const { data: ctx } = useTenant();
  const { data: fees = [], isLoading } = useFeeTypes();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('fee_types').insert({ name, amount: Number(amount), tenant_id: ctx!.tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      setName('');
      setAmount('');
      qc.invalidateQueries({ queryKey: ['fee-types'] });
    },
  });

  async function remove(id: string) {
    await supabase.from('fee_types').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['fee-types'] });
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Input placeholder="Fee name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required inputMode="decimal" />
        <LoadingButton loading={create.isPending}>Add</LoadingButton>
      </form>
      {isLoading ? (
        <p className="text-sm opacity-70">Loading…</p>
      ) : (
        <DataTable
          columns={['Name', 'Amount', 'Term', '']}
          rows={fees.map((f) => [
            (f as { name?: string }).name,
            (f as { amount?: number }).amount,
            (f as { term?: string }).term,
            <ConfirmDelete key="d" onConfirm={() => remove((f as unknown as { id: string }).id)} />,
          ])}
        />
      )}
      <div className="flex gap-2">
        <Button onClick={() => {}}>Export</Button>
      </div>
    </div>
  );
}
