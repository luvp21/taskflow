import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { errorMessage } from '../api/http.ts';
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  toTaskFields,
  validateTaskForm,
  type TaskFormErrors,
  type TaskFormValues,
} from '../lib/taskForm.ts';
import { PRIORITIES, PRIORITY_LABELS, type Priority, type TaskChanges } from '../types.ts';

const INPUT_CLASS =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-invalid:border-danger';

interface TaskFormProps {
  initialValues: TaskFormValues;
  submitLabel: string;
  onSubmit: (fields: Required<TaskChanges>) => Promise<void>;
  onCancel: () => void;
  onSavingChange: (saving: boolean) => void;
  footerStart?: ReactNode;
}

export function TaskForm({ initialValues, submitLabel, onSubmit, onCancel, onSavingChange, footerStart }: TaskFormProps) {
  const id = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = (field: keyof TaskFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function setSavingState(next: boolean) {
    setSaving(next);
    onSavingChange(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateTaskForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSavingState(true);
    setSubmitError(null);
    try {
      await onSubmit(toTaskFields(values));
    } catch (error) {
      setSubmitError(errorMessage(error));
      setSavingState(false);
    }
  }

  const errorText = (field: keyof TaskFormErrors) =>
    errors[field] && (
      <p id={`${id}-${field}-error`} className="mt-1 text-sm text-danger">
        {errors[field]}
      </p>
    );

  const fieldProps = (field: keyof TaskFormErrors) => ({
    id: `${id}-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${id}-${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <label htmlFor={`${id}-title`} className="mb-1 block text-sm font-medium">Title</label>
        <input {...fieldProps('title')} className={INPUT_CLASS} value={values.title} maxLength={TITLE_MAX}
          autoFocus onChange={(e) => setField('title', e.target.value)} />
        {errorText('title')}
      </div>

      <div>
        <label htmlFor={`${id}-description`} className="mb-1 block text-sm font-medium">Description</label>
        <textarea {...fieldProps('description')} className={INPUT_CLASS} rows={4} value={values.description}
          maxLength={DESCRIPTION_MAX} onChange={(e) => setField('description', e.target.value)} />
        {errorText('description')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-priority`} className="mb-1 block text-sm font-medium">Priority</label>
          <select id={`${id}-priority`} className={INPUT_CLASS} value={values.priority}
            onChange={(e) => setField('priority', e.target.value as Priority)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-tags`} className="mb-1 block text-sm font-medium">Tags</label>
          <input {...fieldProps('tags')} className={INPUT_CLASS} value={values.tags}
            placeholder="frontend, bug" onChange={(e) => setField('tags', e.target.value)} />
          {errorText('tags')}
        </div>
      </div>

      {submitError && <p role="alert" className="text-sm text-danger">{submitError}</p>}

      <div className="flex items-center gap-2">
        {footerStart}
        <button type="button" onClick={onCancel} disabled={saving}
          className="ml-auto rounded-lg px-4 py-2 text-sm font-medium hover:bg-panel disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
