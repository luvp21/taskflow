import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { connectDb, disconnectDb } from '../db.js';
import { COLUMN_IDS, TaskModel, type ColumnId, type Priority } from '../models/Task.js';
import { ORDER_GAP } from '../services/ordering.service.js';

interface SeedTask {
  title: string;
  description: string;
  priority: Priority;
  columnId: ColumnId;
  tags: string[];
}

const SEED_TASKS: SeedTask[] = [
  { columnId: 'todo', priority: 'high', title: 'Set up auth', tags: ['backend'],
    description: 'Email + password login with sessions. Hash passwords with a slow algorithm.' },
  { columnId: 'todo', priority: 'medium', title: 'Design empty states', tags: ['design', 'frontend'],
    description: 'Illustration and copy for an empty board and for columns with no cards.' },
  { columnId: 'todo', priority: 'low', title: 'Write API docs', tags: ['docs', 'backend'],
    description: 'Document every endpoint with request bodies and status codes.' },
  { columnId: 'todo', priority: 'high', title: 'Fix card flicker on slow networks', tags: ['bug', 'frontend'],
    description: 'Cards briefly jump back before settling when a move takes over a second.' },
  { columnId: 'todo', priority: 'medium', title: 'Add rate limiting', tags: ['backend', 'infra'],
    description: 'Limit mutating routes per IP to protect the API from bursts.' },
  { columnId: 'todo', priority: 'low', title: 'Keyboard shortcuts cheat sheet', tags: ['docs', 'frontend'],
    description: '' },
  { columnId: 'in_progress', priority: 'high', title: 'Optimistic card moves', tags: ['frontend'],
    description: 'Show moves instantly and roll back only the failed change on error.' },
  { columnId: 'in_progress', priority: 'medium', title: 'Dark mode color tokens', tags: ['design', 'frontend'],
    description: 'Define light and dark tokens and check every pair against WCAG AA.' },
  { columnId: 'in_progress', priority: 'high', title: 'Set up CI pipeline', tags: ['infra'],
    description: 'Run lint, typecheck and tests on every pull request.' },
  { columnId: 'in_progress', priority: 'low', title: 'Search tasks by title', tags: ['frontend'],
    description: 'Debounced search over titles and descriptions.' },
  { columnId: 'in_progress', priority: 'medium', title: 'Fix 500 on duplicate create', tags: ['bug', 'backend'],
    description: 'A double-clicked create returns 500 instead of the existing task.' },
  { columnId: 'done', priority: 'medium', title: 'Project scaffold', tags: ['infra'],
    description: 'Workspaces, TypeScript, lint and a local Mongo replica set.' },
  { columnId: 'done', priority: 'low', title: 'Pick a font', tags: ['design'],
    description: 'System font stack for speed; no web font download.' },
  { columnId: 'done', priority: 'high', title: 'Task data model', tags: ['backend'],
    description: 'One document per task with a fractional orderIndex and a version.' },
  { columnId: 'done', priority: 'medium', title: 'README quick start', tags: ['docs'],
    description: 'Four commands from clone to a running board.' },
];

// Cards in each column get orderIndex 1000, 2000, ... in the order listed above.
function withPositions(tasks: SeedTask[]) {
  return COLUMN_IDS.flatMap((columnId) =>
    tasks
      .filter((task) => task.columnId === columnId)
      .map((task, i) => ({ ...task, _id: randomUUID(), orderIndex: (i + 1) * ORDER_GAP })),
  );
}

async function seed() {
  await connectDb(config.MONGODB_URI);
  const { deletedCount } = await TaskModel.deleteMany({});
  const inserted = await TaskModel.insertMany(withPositions(SEED_TASKS));
  console.log(`Removed ${deletedCount} tasks, inserted ${inserted.length}.`);
}

try {
  await seed();
} catch (error) {
  console.error('Seed failed:', error);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
