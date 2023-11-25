import NotFoundError from './errors/notFoundError';
import { Message } from './response';

export function paginate(
  data: any,
  page: any,
  limit: any,
  last_page: any,
  total: any
) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = {
    totalCount: 0,
    totalPage: 0,
    currentPage: 0,
    next: {},
    currentCountPerPage: 0,
    range: 0,
    previous: {},
    last: {},
    result: {},
  };
  const totalCount = total;
  const totalPage = Math.ceil(totalCount / limit);
  const currentPage = page || 0;
  try {
    if (page < 0) {
      return new NotFoundError(Message.NO_NEGATIVE_PAGE_VALUE);
    } else if (page === 1 && !last_page) {
      result.totalCount = totalCount;
      result.totalPage = totalPage;
      result.currentPage = currentPage;
      result.next = {
        page: page + 1,
        limit: limit,
      };
      result.result = result.result = data;
      result.currentCountPerPage = Object.keys(result.result).length;
      result.range = currentPage * limit;
      return result;
    } else if (endIndex < totalCount && !last_page) {
      result.totalCount = totalCount;
      result.totalPage = totalPage;
      result.currentPage = currentPage;
      result.next = {
        page: page + 1,
        limit: limit,
      };
      result.result = data;
      result.currentCountPerPage = Object.keys(result.result).length;
      result.range = currentPage * limit;
      return result;
    } else if (startIndex > 0 && !last_page) {
      result.totalCount = totalCount;
      result.totalPage = totalPage;
      result.currentPage = currentPage;
      result.previous = {
        page: page - 1,
        limit: limit,
      };
      result.result = result.result = data;
      result.currentCountPerPage = Object.keys(result.result).length;
      result.range = currentPage * limit;
      return result;
    } else if (last_page === true && page === totalPage) {
      result.totalCount = totalCount;
      result.totalPage = totalPage;
      result.currentPage = totalPage;
      result.last = {
        page: totalPage,
        limit: limit,
      };
      result.result = result.result = data;
      result.currentCountPerPage = Object.keys(result.result).length;
      result.range = totalCount;
      return result;
    } else {
      return new NotFoundError(Message.NO_RESOURCE);
    }
  } catch (err) {
    console.error(`${err}`);
    return new NotFoundError(err);
  }
}
