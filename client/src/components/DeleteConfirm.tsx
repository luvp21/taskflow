interface DeleteConfirmProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// The second step of deleting: a separate view inside the modal, with Cancel focused
// first so pressing Enter by accident doesn't delete.
export function DeleteConfirm({ title, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Delete <strong className="break-words">“{title}”</strong>? This can't be undone.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-panel"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-danger-fg hover:opacity-90"
        >
          Delete card
        </button>
      </div>
    </div>
  );
}
