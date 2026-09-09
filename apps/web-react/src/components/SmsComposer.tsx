import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildSmsPreview, normalizePhone, type SmsTriggerKey } from '@/lib/sms';
import { Button, Input, LoadingButton } from './ui';

const TRIGGERS: SmsTriggerKey[] = ['fee_due', 'receipt_issued', 'payroll_paid', 'attendance_flag', 'announcement', 'manual_custom'];

export function SmsComposer({ defaultRecipients = '' }: { defaultRecipients?: string }) {
  const [trigger, setTrigger] = useState<SmsTriggerKey>('announcement');
  const [recipients, setRecipients] = useState(defaultRecipients);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState('');

  const preview = trigger === 'manual_custom' ? message : buildSmsPreview(trigger, { message });

  const send = useMutation({
    mutationFn: async () => {
      const list = recipients.split(/[,\n]/).map(normalizePhone).filter(Boolean);
      if (list.length === 0) throw new Error('No valid recipients');
      const { data, error } = await supabase.functions.invoke('sms-campaign', {
        body: { recipients: list, message: trigger === 'manual_custom' ? message : preview, trigger },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => setDone('Queued for delivery.'),
    onError: (e) => setDone(`Failed: ${(e as Error).message}`),
  });

  return (
    <div className="space-y-3 border p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Template
          <select className="mt-1 w-full border p-2" value={trigger} onChange={(e) => setTrigger(e.target.value as SmsTriggerKey)}>
            {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-sm">Recipients (comma-separated, 254…)
          <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="254700000000, 254711111111" />
        </label>
      </div>
      <label className="block text-sm">Message
        <textarea className="mt-1 w-full border p-2" rows={4} value={trigger === 'manual_custom' ? message : preview} onChange={(e) => setMessage(e.target.value)} readOnly={trigger !== 'manual_custom'} />
      </label>
      <LoadingButton loading={send.isPending} onClick={() => { setDone(''); send.mutate(); }}>Send via Mobiwave</LoadingButton>
      {done && <p className="text-sm">{done}</p>}
      <Button onClick={async () => {
        const { data } = await supabase.functions.invoke('sms-campaign', { body: { op: 'balance' } });
        setDone(`Balance: ${JSON.stringify(data)}`);
      }}>Check balance</Button>
    </div>
  );
}
