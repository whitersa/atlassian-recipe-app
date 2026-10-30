// Lightweight prop-type markers for ESLint react/prop-types validation without extra runtime bundle overhead
const noop = () => null;
noop.isRequired = noop;

export const P = {
  any: noop,
  array: noop,
  bool: noop,
  func: noop,
  node: noop,
  number: noop,
  object: noop,
  string: noop,
  elementType: noop,
  oneOf: () => noop,
  oneOfType: () => noop,
  arrayOf: () => noop,
  shape: () => noop,
};

