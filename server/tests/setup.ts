import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';
import { TaskModel } from '../src/models/Task.js';

// Every test file gets its own database on the shared replica set, so files that
// run in parallel never see each other's tasks.
beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: `test_${randomUUID()}` });
  await TaskModel.init();
});

afterEach(async () => {
  await TaskModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
