export const generateGroupKey = () =>
  [...crypto.getRandomValues(new Uint8Array(9))]
    .map(b => (b % 36).toString(36).toUpperCase())
    .join('');
