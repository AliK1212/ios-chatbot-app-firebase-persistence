// This is a shim for pdf-parse to prevent build errors
// It provides empty implementations of pdf-parse functions

module.exports = async function() {
  return {
    numpages: 0,
    numrender: 0,
    info: {},
    metadata: null,
    text: '',
    version: '0.0.0'
  };
};
