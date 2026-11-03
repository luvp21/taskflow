import { useState } from 'react';
import { errorMessage } from '../api/http.ts';

interface DeleteConfirmProps {
  title: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onSavingChange: (saving: boolean) => void;
}

// The second step of deleting: a separate view inside the modal, with Cancel focused
// first so pressing Enter by accident doesn't delete.
export function DeleteConfirm({ title, onConfirm, onCancel, onSavingChange }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    onSavingChange(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
      onSavingChange(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Delete <strong className="break-words">“{title}”</strong>? This can't be undone.
      </p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" autoFocus onClick={onCancel} disabled={deleting}
          className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-panel disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={handleDelete} disabled={deleting}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-danger-fg hover:opacity-90 disabled:opacity-50">
          {deleting ? 'Deleting…' : 'Delete card'}
        </button>
      </div>
    </div>
  );
}
