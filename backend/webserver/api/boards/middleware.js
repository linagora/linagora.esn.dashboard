module.exports = () => {
  return {
    canList
  };

  function canList(req, res, next) {
    next();
  }
};
