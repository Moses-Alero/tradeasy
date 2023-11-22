import { prisma } from './prisma';

export const healthCheck = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    prisma.$queryRaw`SELECT 1`
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
};
