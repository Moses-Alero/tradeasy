export default abstract class BaseResponse {
  message: string | Record<string, unknown>;
  status?: number | undefined;
  success: boolean;
  code: string | undefined;
  data: any | undefined;
}
