export interface IResponse<T = any, Z = any> {
  success?: boolean;
  message?: string;
  status?: number;
  data?: T;
  extra?: Z;
}
