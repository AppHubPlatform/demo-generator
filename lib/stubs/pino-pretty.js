// Stub for pino-pretty to prevent transport errors in production
module.exports = function() {
  return {
    write: function() {},
    end: function() {}
  };
};

// Also export as default for ES modules
module.exports.default = module.exports;

// Export a build function which is what pino-pretty typically exports
module.exports.build = function() {
  return {
    write: function() {},
    end: function() {}
  };
};
