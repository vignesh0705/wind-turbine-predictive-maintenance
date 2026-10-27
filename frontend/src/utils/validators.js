export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 6;
}

export function validateCsvFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select a file to upload.' };
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv')) {
    return { valid: false, error: 'Only CSV (.csv) files are permitted.' };
  }
  // 100MB limit
  const maxBytes = 100 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: 'File size exceeds maximum allowed upload size (100MB).' };
  }
  return { valid: true };
}
