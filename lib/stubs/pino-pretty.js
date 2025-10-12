// Stub for pino-pretty to prevent transport errors in production
module.exports = function() {
  return {
    write: function() {},
    end: function() {}
  };
};
