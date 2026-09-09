import { useState } from 'react';
import { Button, LoadingButton } from './ui';

export function ConfirmDelete({ onConfirm, label = 'Delete' }: { onConfirm: () => Promise<void> | void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!open) return <Button onClick={() => setOpen(true)}>{label}</Button>;
  return (
    <span className="inline-flex gap-2">
      <LoadingButton
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setOpen(false);
          }
        }}
      >
        Confirm
      </LoadingButton>
      <Button onClick={() => setOpen(false)}>Cancel</Button>
    </span>
  );
}
