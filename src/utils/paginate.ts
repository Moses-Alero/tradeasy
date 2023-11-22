import type { PaginateResult } from './interface';

export function paginate<T>(data: T[], limit: number): PaginateResult<T[]> {
  const afterCursor =
    data.length < limit
      ? null
      : data.length > 0
      ? (data[data.length - 1] as unknown as { id: string }).id
      : null;

  return {
    pageInfo: {
      hasNextPage: !!afterCursor,
      nextCursor: afterCursor && btoa(afterCursor),
    },
    result: data,
  };
}
