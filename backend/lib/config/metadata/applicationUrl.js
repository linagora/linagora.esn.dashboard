module.exports = dependencies => {
  const { createValidator } = dependencies('esn-config').validator.helper;

  const schema = {
    type: 'string',
    format: 'uri'
  };

  return {
    rights: {
      padmin: 'rw',
      admin: 'rw',
      user: 'r'
    },
    validator: createValidator(schema)
  };
};
