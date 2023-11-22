// Validation Error
const VALIDATION_STATUS = 400;
const VALIDATION_CODE = 'validation_error';

// Authentication Error
const AUTHENTICATION_STATUS = 401;
const AUTHENTICATION_CODE = 'authentication_error';

// Authorization Error
const AUTHORIZATION_STATUS = 403;
const AUTHORIZATION_CODE = 'authorization_error';

// Not Found Error
const NOT_FOUNT_STATUS = 404;
const NOT_FOUNT_CODE = 'notFound_error';

// Conflict Error
const CONFLICT_STATUS = 409;
const CONFLICT_CODE = 'conflict_error';

// Access Denied Error
const ACCESS_DENIED_STATUS = 422;
const ACCESS_DENIED_CODE = 'access_denied_error';

// Timeout Error
const TIMEOUT_STATUS = 504;
const TIMEOUT_CODE = 'timeout_error';

// Internal Server Error
const INTERNAL_ERROR_STATUS = 500;
const INTERNAL_ERROR_CODE = 'internal_server_error';

// Service Unavailable
const SERVICE_UNAVAILABLE_STATUS = 503;
const SERVICE_UNAVAILABLE_CODE = 'service_unavailable_error';

// Too Many Request Error
const TOO_MANY_REQUEST_STATUS = 429;
const TOO_MANY_REQUEST_CODE = 'too_many_request_error';

export const ErrorsConstants = {
  authentication_status: AUTHENTICATION_STATUS,
  authentication_code: AUTHENTICATION_CODE,
  authorization_status: AUTHORIZATION_STATUS,
  authorization_code: AUTHORIZATION_CODE,
  validation_status: VALIDATION_STATUS,
  validation_code: VALIDATION_CODE,
  notFound_status: NOT_FOUNT_STATUS,
  notFound_code: NOT_FOUNT_CODE,
  timeout_status: TIMEOUT_STATUS,
  timeout_code: TIMEOUT_CODE,
  access_denied_status: ACCESS_DENIED_STATUS,
  access_denied_code: ACCESS_DENIED_CODE,
  conflict_status: CONFLICT_STATUS,
  conflict_code: CONFLICT_CODE,
  internal_error_status: INTERNAL_ERROR_STATUS,
  internal_error_code: INTERNAL_ERROR_CODE,
  service_unavailable_status: SERVICE_UNAVAILABLE_STATUS,
  service_unavailable_code: SERVICE_UNAVAILABLE_CODE,
  too_many_request_code: TOO_MANY_REQUEST_CODE,
  too_many_request_status: TOO_MANY_REQUEST_STATUS,
};
