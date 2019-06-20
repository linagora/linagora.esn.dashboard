/* A widget configuration is defined as JSON as is:
[
  {
    "type": "rss",
    "enabled": true/false, // default to true
    "configurable": true/false, // default to true
    "settings": { // object
      "url": "http://foo.bar.baz"
    }
  }
]
*/

module.exports = dependencies => {
  const { createValidator } = dependencies('esn-config').validator.helper;

  const schema = {
    type: 'array',
    items: {
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          minLength: 1
        },
        enabled: {
          type: 'boolean',
          default: true
        },
        configurable: {
          type: 'boolean',
          default: true
        },
        settings: {
          type: 'object'
        }
      },
      required: ['type']
    }
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
