export function shouldSkipForMissingBrowser(output = '') {
  return output.includes("Executable doesn't exist")
    || output.includes('Please run the following command to download new browsers');
}

export function resolveStatus({ status, error, output }) {
  if (error) return 1;
  if ((status ?? 1) !== 0 && shouldSkipForMissingBrowser(output)) return 0;
  return status ?? 1;
}
