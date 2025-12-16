export interface AppConfig {
  port: number;
  host: string;
  redis: {
    host: string;
    port: number;
  };
  worker: {
    concurrency: number;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  },
};
