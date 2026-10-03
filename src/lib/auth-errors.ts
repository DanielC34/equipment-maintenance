export const AUTH_SERVICE_UNAVAILABLE_CODE = 'AUTH_SERVICE_UNAVAILABLE';
export const AUTH_INFRASTRUCTURE_LOG_MESSAGE =
  '[auth] credentials authentication infrastructure failure';

export const INVALID_CREDENTIALS_MESSAGE =
  'Invalid email or password. Please try again.';

export const AUTH_SERVICE_UNAVAILABLE_MESSAGE =
  'Sign-in is temporarily unavailable. Please try again later.';

export function getCredentialsErrorMessage(error: string): string {
  if (error === 'CredentialsSignin') {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  return AUTH_SERVICE_UNAVAILABLE_MESSAGE;
}
