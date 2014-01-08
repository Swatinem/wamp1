module.exports = process.env.WAMP1_COV
  ? require('./lib-cov')
  : require('./lib');
