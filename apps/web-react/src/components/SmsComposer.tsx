import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildSmsPreview, normalizePhone, type SmsTriggerKey } from '@/lib/sms';
import { Button, Field, LoadingButton, Textarea } from './ui';

const TRIGGERS: { key: SmsTriggerKey; label: string; hint: string }[] = [
  { key: 'announcement', label: 'Announcement', hint: 'General school notice to parents or staff.' },
  { key: 'fee_due', label: 'Fee reminder', hint: 'Balance reminder with amount and deadline.' },
  { key: 'receipt_issued', label: 'Payment receipt', hint: 'Confirms a received payment with receipt number.' },
  { key: 'payroll_paid', label: 'Payroll paid', hint: 'Notifies a teacher their pay run completed.' },
  { key: 'attendance_flag', label: 'Attendance flag', hint: 'Alerts a guardian about a learner absence pattern.' },
  { key: 'manual_custom', label: 'Custom message', hint: 'Free text. Keep it short — SMS is billed per segment.' },
];

function segments(text: string): number {
  return text.length === 0 ? 0 : Math.ceil(text.length / 160);
}

export function SmsComposer({ defaultRecipients = '' }: { defaultRecipients?: string }) {
  const [trigger, setTrigger] = useState<SmsTriggerKey>('announcement');
  const [recipients, setRecipients] = useState(defaultRecipients);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);

  const preview = trigger === 'manual_custom' ? message : buildSmsPreview(trigger, { message });
  const validCount = recipients.split(/[,\n]/).map(normalizePhone).filter(Boolean).length;

  const send = useMutation({
    mutationFn: async () => {
      const list = recipients.split(/[,\n]/).map(normalizePhone).filter(Boolean);
      if (list.length === 0) throw new Error('Add at least one valid recipient (254…)');
      const { data, error } = await supabase.functions.invoke('sms-campaign', {
        body: { recipients: list, message: trigger === 'manual_custom' ? message : preview, trigger },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(`Queued for ${validCount} recipient${validCount === 1 ? '' : 's'}.`);
      setMessage('');
    },
    onError: (e) => toast.error(`Send failed: ${(e as Error).message}`),
  });

  async function checkBalance() {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('sms-campaign', { body: { op: 'balance' } });
      if (error) throw error;
      const d = data as { balance?: number; currency?: string } | null;
      toast.info(d && typeof d.balance === 'number' ? `SMS balance: ${d.balance}${d.currency ? ` ${d.currency}` : ''}.` : 'Balance checked — see provider dashboard for detail.');
    } catch (e) {
      toast.error(`Balance check failed: ${(e as Error).message}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Template" hint={TRIGGERS.find((t) => t.key === trigger)?.hint}>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={trigger} onChange={(e) => setTrigger(e.target.value as SmsTriggerKey)}>
            {TRIGGERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Recipients" hint={validCount > 0 ? `${validCount} valid number${validCount === 1 ? '' : 's'}` : 'Comma-separated Safaricom numbers'}>
          <Textarea rows={2} value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="254700000000, 254711111111" />
        </Field>
      </div>
      <Field label="Message" hint={`${preview.length} characters · ~${segments(preview)} SMS segment${segments(preview) === 1 ? '' : 's'}`}>
        <Textarea rows={4} value={trigger === 'manual_custom' ? message : preview} onChange={(e) => setMessage(e.target.value)} readOnly={trigger !== 'manual_custom'} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <LoadingButton loading={send.isPending} onClick={() => send.mutate()}>Send via Mobiwave</LoadingButton>
        <Button variant="outline" onClick={checkBalance} disabled={checking}>{checking ? 'Checking…' : 'Check balance'}</Button>
      </div>
    </div>
  );
}
