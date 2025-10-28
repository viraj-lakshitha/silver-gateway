import mongoose from 'mongoose';

import env from '@config/env';
import { logger } from '@config/logger';

const connectionState = () => mongoose.connection.readyState;

export const connectMongo = async (): Promise<typeof mongoose> => {
  if (connectionState() === 1) {
    return mongoose;
  }

  try {
    await mongoose.connect(env.mongoUri, {
      autoIndex: env.nodeEnv !== 'production'
    });
    logger.info({ uri: env.mongoUri }, 'Connected to MongoDB');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to MongoDB');
    throw error;
  }

  return mongoose;
};

export const disconnectMongo = async (): Promise<void> => {
  if (connectionState() === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
};

export default mongoose;
