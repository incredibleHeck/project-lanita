/**
 * Metadata for a paginated API response.
 * totalPages is computed as Math.ceil(total / limit).
 */
export interface PaginationMeta {
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of pages (Math.ceil(total / limit)) */
  totalPages: number;
}

/**
 * Standard paginated API response shape.
 * Use this interface for list endpoints that return paginated data.
 *
 * @typeParam T - Type of each item in the data array
 */
export interface PaginatedResult<T> {
  /** Items for the current page */
  data: T[];
  /** Pagination metadata (total, page, limit, totalPages) */
  meta: PaginationMeta;
}
