import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export type StkResult = 'idle' | 'completed' | 'failed' | 'timeout';

const POLL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes, the M-Pesa PIN window

type ParentPayment = {
  status: string;
  checkout_id?: string | null;
  receipt_number?: string | null;
};

/**
 * Send a ReClass STK push and track it to completion.
 * Polls the parent-scoped payments RPC for the checkout id (parents cannot
 * read reclass_paybill_transactions directly — RLS restricts it to finance).
 */
export function useParentStkPayment() {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const [tracking, setTracking] = useState<{ checkoutId: string; amount: number } | null>(null);
  const [result, setResult] = useState<StkResult>('idle');
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setTracking(null);
  }

  function reset() {
    stop();
    setResult('idle');
    setReceiptNumber(null);
  }

  async function send(obligationId: string, amount: number, phone: string) {
    setSending(true);
    setResult('idle');
    setReceiptNumber(null);
    try {
      const { data, error } = await supabase.functions.invoke('reclass-stk', {
        body: { obligation_id: obligationId, amount, phone },
      });
      if (error) throw error;
      const checkoutId = (data as { checkout_request_id?: string })?.checkout_request_id;
      if (!checkoutId) throw new Error('Payment service did not return a tracking reference.');
      setTracking({ checkoutId, amount });
      toast.info('STK push sent — enter your M-Pesa PIN.');
      let polls = 0;
      timer.current = setInterval(async () => {
        polls += 1;
        try {
          const { data: rows, error: rpcError } = await supabase.rpc('get_parent_reclass_payments', {});
          if (rpcError) throw rpcError;
          const match = ((rows ?? []) as ParentPayment[]).find((p) => p.checkout_id === checkoutId);
          if (match && match.status === 'completed') {
            stop();
            setResult('completed');
            setReceiptNumber(match.receipt_number ?? null);
            toast.success(`Payment received${match.receipt_number ? ` · Receipt ${match.receipt_number}` : ''}.`);
            void qc.invalidateQueries({ queryKey: ['parent-reclass-payments'] });
            void qc.invalidateQueries({ queryKey: ['parent-reclass-obligations'] });
            return;
          }
          if (match && match.status === 'failed') {
            stop();
            setResult('failed');
            toast.error('Payment failed — no money was deducted.');
            return;
          }
        } catch {
          // Transient poll error — keep waiting until the deadline.
        }
        if (polls >= MAX_POLLS) {
          stop();
          setResult('timeout');
          toast.warning('Still processing — check payment history before retrying.');
          void qc.invalidateQueries({ queryKey: ['parent-reclass-payments'] });
        }
      }, POLL_MS);
    } catch (e) {
      setResult('idle');
      toast.error(`Could not start payment: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  return { sending, tracking, result, receiptNumber, send, reset };
}
