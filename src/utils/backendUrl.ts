/**
 * Dynamically resolves the backend URL.
 * Captures the environment variable VITE_BACKEND_URL and removes any trailing slashes.
 * Fallbacks to http://localhost:3001 if the environment variable is not set.
 */
export const getBackendUrl = (): string => {
  let url = import.meta.env.VITE_BACKEND_URL;
  
  if (!url) {
    return 'http://localhost:3001';
  }
  
  // Remove any trailing forward slash or backslash
  return url.replace(/[\/\\]+$/, '');
};
