module.exports = dependencies => {
  const mongoose = dependencies('db').mongo.mongoose;
  const ObjectId = mongoose.Schema.ObjectId;

  const WidgetSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    settings: mongoose.Schema.Types.Mixed
  }, { _id: false });

  const DashboardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    creator: { type: ObjectId, ref: 'User', required: true },
    timestamps: {
      creation: { type: Date, default: Date.now }
    },
    widgets: {
      instances: [WidgetSchema],
      order: [String]
    }
  });

  return mongoose.model('Dashboard', DashboardSchema);
};
