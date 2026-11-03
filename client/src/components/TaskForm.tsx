import { useId, useState, type FormEvent, type ReactNode } from 'react';
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
const LABEL_CLASS = 'mb-1 block text-sm font-medium';

interface TaskFormProps {
  initialValues: TaskFormValues;
  submitLabel: string;
  onSubmit: (fields: Required<TaskChanges>) => void;
  onCancel: () => void;
  footerStart?: ReactNode;
}

// Validates on submit; server errors are not shown here because saving is
// optimistic: the modal closes at once and a failure arrives as a toast.
export function TaskForm({ initialValues, submitLabel, onSubmit, onCancel, footerStart }: TaskFormProps) {
  const id = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<TaskFormErrors>({});

  const setField = (field: keyof TaskFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateTaskForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(toTaskFields(values));
  }

  const fieldProps = (field: keyof TaskFormErrors) => ({
    id: `${id}-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${id}-${field}-error` : undefined,
  });

  const errorText = (field: keyof TaskFormErrors) =>
    errors[field] && (
      <p id={`${id}-${field}-error`} className="mt-1 text-sm text-danger">
        {errors[field]}
      </p>
    );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <label htmlFor={`${id}-title`} className={LABEL_CLASS}>
          Title
        </label>
        <input
          {...fieldProps('title')}
          className={INPUT_CLASS}
          value={values.title}
          maxLength={TITLE_MAX}
          autoFocus
          onChange={(e) => setField('title', e.target.value)}
        />
        {errorText('title')}
      </div>

      <div>
        <label htmlFor={`${id}-description`} className={LABEL_CLASS}>
          Description
        </label>
        <textarea
          {...fieldProps('description')}
          className={INPUT_CLASS}
          rows={4}
          value={values.description}
          maxLength={DESCRIPTION_MAX}
          onChange={(e) => setField('description', e.target.value)}
        />
        {errorText('description')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-priority`} className={LABEL_CLASS}>
            Priority
          </label>
          <select
            id={`${id}-priority`}
            className={INPUT_CLASS}
            value={values.priority}
            onChange={(e) => setField('priority', e.target.value as Priority)}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-tags`} className={LABEL_CLASS}>
            Tags
          </label>
          <input
            {...fieldProps('tags')}
            className={INPUT_CLASS}
            value={values.tags}
            placeholder="frontend, bug"
            onChange={(e) => setField('tags', e.target.value)}
          />
          {errorText('tags')}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {footerStart}
        <button type="button" onClick={onCancel} className="ml-auto rounded-lg px-4 py-2 text-sm font-medium hover:bg-panel">
          Cancel
        </button>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
