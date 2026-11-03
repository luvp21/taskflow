import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

// Same major version as docker-compose (mongo:7). A replica set, not a standalone
// server, because the rebalance path uses a transaction.
const MONGO_VERSION = '7.0.14';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

// Runs once for the whole test run, so the mongod binary is downloaded and started
// once. Starting one per test file made parallel files race on the same download.
export default async function setup(project: TestProject) {
  const replSet = await MongoMemoryReplSet.create({
    binary: { version: MONGO_VERSION },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  project.provide('mongoUri', replSet.getUri());

  return async () => {
    await replSet.stop();
  };
}
