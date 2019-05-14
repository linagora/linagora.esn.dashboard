module.exports = () => {
  return {
    list
  };

  function list(req, res) {
    return res.status(200).json([]);
  }
};
