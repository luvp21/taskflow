import { useEffect, useRef, useState, type MouseEvent, type SyntheticEvent } from 'react';
import { changedFields, formValuesFrom } from '../lib/taskForm.ts';
import { useBoardStore } from '../store/boardStore.ts';
import type { ColumnId, TaskChanges } from '../types.ts';
import { DeleteConfirm } from './DeleteConfirm.tsx';
import { TaskForm } from './TaskForm.tsx';

export type ModalTarget = { mode: 'create'; columnId: ColumnId } | { mode: 'edit'; taskId: string };

interface TaskModalProps {
  target: ModalTarget;
  onClose: () => void;
}

// Rendered only while open. showModal() makes the rest of the page inert (focus
// and clicks can't leave the dialog) and gives Esc handling for free; we only put
// focus back on whatever opened the modal. Saving is optimistic, so every action
// closes the modal immediately; failures are reported by toasts.
export function TaskModal({ target, onClose }: TaskModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const task = useBoardStore((state) =>
    target.mode === 'edit' ? state.view.tasksById[target.taskId] : undefined,
  );

  // Safe to run twice (StrictMode mounts, cleans up and mounts again in dev): the
  // opener is recorded only on the first run, before the dialog takes focus, and
  // the cleanup closes the dialog so the next showModal() starts fresh.
  useEffect(() => {
    const dialog = dialogRef.current;
    openerRef.current ??= document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, []);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault(); // Esc: let React state decide, instead of the browser closing it
    onClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  function handleSubmit(fields: Required<TaskChanges>) {
    const { createTask, updateTask } = useBoardStore.getState();
    if (target.mode === 'create') {
      createTask(target.columnId, fields);
    } else if (task) {
      const changes = changedFields(task, fields);
      if (Object.keys(changes).length > 0) updateTask(task._id, changes);
    }
    onClose();
  }

  function handleDelete() {
    if (task) useBoardStore.getState().deleteTask(task._id);
    onClose();
  }

  const heading = target.mode === 'create' ? 'New card' : confirmingDelete ? 'Delete card' : 'Edit card';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="task-modal-title"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl bg-card p-0 text-fg shadow-xl backdrop:bg-black/50"
    >
      <div className="p-5">
        <h2 id="task-modal-title" className="mb-4 text-lg font-semibold">
          {heading}
        </h2>

        {target.mode === 'edit' && !task ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">This card no longer exists.</p>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="self-end rounded-lg px-4 py-2 text-sm font-medium hover:bg-panel"
            >
              Close
            </button>
          </div>
        ) : confirmingDelete && task ? (
          <DeleteConfirm title={task.title} onConfirm={handleDelete} onCancel={() => setConfirmingDelete(false)} />
        ) : (
          <TaskForm
            initialValues={formValuesFrom(task)}
            submitLabel={target.mode === 'create' ? 'Add card' : 'Save'}
            onSubmit={handleSubmit}
            onCancel={onClose}
            footerStart={
              task && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-panel"
                >
                  Delete
                </button>
              )
            }
          />
        )}
      </div>
    </dialog>
  );
}
