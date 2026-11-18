export interface IPagination<T> {
  docsCount?: number | undefined;
  limit?: number | undefined;
  pages?: number | undefined;
  currentPage?: number | undefined;
  result: T[];
}
