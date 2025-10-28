import { clearInterval, setInterval } from 'node:timers';

import { Types } from 'mongoose';

import env from '@config/env';
import { logger } from '@config/logger';

import UsageLogModel from './usage-log.model';

interface EnqueuedLog {
  routeId: string;
  method: string;
  statusCode: number;
  durationMs: number;
  bytesIn: number;
  bytesOut: number;
  principalId?: string;
  principalSource?: string;
  principalScopes: string[];
  apiKeyDisplayId?: string;
  requestId?: string;
  timestamp: Date;
}

const queue: EnqueuedLog[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let flushing = false;

const enqueueFlush = () => {
  if (flushTimer) {
    return;
  }

  flushTimer = setInterval(async () => {
    await flushQueue();
  }, env.usageLog.flushIntervalMs);
};

export const enqueueUsageLog = (log: EnqueuedLog): void => {
  queue.push(log);

  if (queue.length >= env.usageLog.batchSize) {
    void flushQueue();
    return;
  }

  enqueueFlush();
};

export const flushQueue = async (): Promise<void> => {
  if (flushing || queue.length === 0) {
    return;
  }

  flushing = true;
  const batch = queue.splice(0, env.usageLog.batchSize);

  if (batch.length === 0) {
    flushing = false;
    return;
  }

  try {
    await UsageLogModel.insertMany(
      batch.map((item) => ({
        routeId: item.routeId,
        method: item.method,
        statusCode: item.statusCode,
        durationMs: item.durationMs,
        bytesIn: item.bytesIn,
        bytesOut: item.bytesOut,
        principalId: item.principalId,
        principalSource: item.principalSource,
        principalScopes: item.principalScopes ?? [],
        apiKeyDisplayId: item.apiKeyDisplayId,
        requestId: item.requestId,
        timestamp: item.timestamp
      })),
      {
        ordered: false
      }
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to insert usage logs');
    // re-queue on failure
    queue.unshift(...batch);
  } finally {
    flushing = false;

    if (queue.length === 0 && flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  }
};

export const usageLogQueueSize = (): number => queue.length;

export interface UsageSummaryQuery {
  from?: Date;
  to?: Date;
  routeId?: string;
  apiKeyDisplayId?: string;
  statusCode?: number;
}

export interface UsageSummaryItem {
  routeId: string;
  statusCode: number;
  count: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  totalBytesIn: number;
  totalBytesOut: number;
}

const buildMatchQuery = (query: UsageSummaryQuery): Record<string, unknown> => {
  const match: Record<string, unknown> = {};

  if (query.routeId && Types.ObjectId.isValid(query.routeId)) {
    match.routeId = new Types.ObjectId(query.routeId);
  }
  if (query.apiKeyDisplayId) {
    match.apiKeyDisplayId = query.apiKeyDisplayId;
  }
  if (query.statusCode) {
    match.statusCode = query.statusCode;
  }
  if (query.from || query.to) {
    const timestamp: Record<string, Date> = {};
    if (query.from) {
      timestamp.$gte = query.from;
    }
    if (query.to) {
      timestamp.$lte = query.to;
    }
    match.timestamp = timestamp;
  }

  return match;
};

export const getUsageSummary = async (
  query: UsageSummaryQuery
): Promise<UsageSummaryItem[]> => {
  const match = buildMatchQuery(query);

  const results = await UsageLogModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          routeId: '$routeId',
          statusCode: '$statusCode'
        },
        count: { $sum: 1 },
        avgDurationMs: { $avg: '$durationMs' },
        minDurationMs: { $min: '$durationMs' },
        maxDurationMs: { $max: '$durationMs' },
        totalBytesIn: { $sum: '$bytesIn' },
        totalBytesOut: { $sum: '$bytesOut' }
      }
    },
    { $sort: { count: -1 } }
  ])
    .option({ allowDiskUse: true })
    .exec();

  return results.map((doc) => ({
    routeId: doc._id.routeId.toString(),
    statusCode: doc._id.statusCode,
    count: doc.count,
    avgDurationMs: doc.avgDurationMs,
    minDurationMs: doc.minDurationMs,
    maxDurationMs: doc.maxDurationMs,
    totalBytesIn: doc.totalBytesIn,
    totalBytesOut: doc.totalBytesOut
  }));
};

export interface UsageLogQuery extends UsageSummaryQuery {
  limit?: number;
}

export const listUsageLogs = async (query: UsageLogQuery): Promise<EnqueuedLog[]> => {
  const match = buildMatchQuery(query);

  const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 1000) : 100;

  const docs = await UsageLogModel.find(match)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean()
    .exec();

  return docs.map((doc) => ({
    routeId: doc.routeId.toString(),
    method: doc.method,
    statusCode: doc.statusCode,
    durationMs: doc.durationMs,
    bytesIn: doc.bytesIn,
    bytesOut: doc.bytesOut,
    principalId: doc.principalId,
    principalSource: doc.principalSource,
    principalScopes: doc.principalScopes ?? [],
    apiKeyDisplayId: doc.apiKeyDisplayId,
    requestId: doc.requestId,
    timestamp: doc.timestamp ?? new Date()
  }));
};
