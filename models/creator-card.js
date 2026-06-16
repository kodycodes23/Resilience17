const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creator_cards';

const schemaConfig = {
  _id: { type: SchemaTypes.ULID, required: true },
  title: { type: SchemaTypes.String, required: true },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String, required: true, index: true },
  creator_reference: { type: SchemaTypes.String, required: true, index: true },
  links: [
    {
      title: { type: SchemaTypes.String, required: true },
      url: { type: SchemaTypes.String, required: true },
    },
  ],
  service_rates: {
    type: {
      currency: { type: SchemaTypes.String, required: true },
      rates: [
        {
          name: { type: SchemaTypes.String, required: true },
          description: { type: SchemaTypes.String, required: true },
          amount: { type: SchemaTypes.Number, required: true },
        },
      ],
    },
    default: undefined,
  },
  status: { type: SchemaTypes.String, required: true, index: true },
  access_type: { type: SchemaTypes.String, required: true, index: true },
  access_code: { type: SchemaTypes.String, default: null },
  created: { type: SchemaTypes.Number, required: true },
  updated: { type: SchemaTypes.Number, required: true },
  deleted: { type: SchemaTypes.Number, default: null, index: true },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });

// Keep slug unique only for active cards; allow reusing slug after soft delete.
modelSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deleted: null,
    },
    name: 'slug_active_unique',
  }
);

module.exports = DatabaseModel.model('CreatorCard', modelSchema);
