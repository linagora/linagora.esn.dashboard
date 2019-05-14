const request = require('supertest');
const expect = require('chai').expect;
const MODULE_NAME = 'linagora.esn.seed';

describe('The boards API', function() {
  let user, app;
  const password = 'secret';

  beforeEach(function(done) {
    const self = this;

    this.helpers.modules.initMidway(MODULE_NAME, function(err) {
      if (err) {
        return done(err);
      }
      const application = require(self.testEnv.backendPath + '/webserver/application')(self.helpers.modules.current.deps);
      const api = require(self.testEnv.backendPath + '/webserver/api')(self.helpers.modules.current.deps, self.helpers.modules.current.lib.lib);

      application.use(require('body-parser').json());
      application.use('/api', api);

      app = self.helpers.modules.getWebServer(application);

      self.helpers.api.applyDomainDeployment('linagora_IT', function(err, models) {
        if (err) {
          return done(err);
        }
        user = models.users[0];

        done();
      });
    });
  });

  afterEach(function(done) {
    this.helpers.mongo.dropDatabase(err => {
      if (err) return done(err);
      this.testEnv.core.db.mongo.mongoose.connection.close(done);
    });
  });

  describe('GET /boards', function() {
    it('should return 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'get', '/api/boards', done);
    });

    it('should return an array', function(done) {
      const self = this;

      self.helpers.api.loginAsUser(app, user.emails[0], password, function(err, requestAsMember) {
        if (err) {
          return done(err);
        }
        const req = requestAsMember(request(app).get('/api/boards'));

        req.expect(200).end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.deep.equal([]);

          done();
        });
      });
    });
  });
});
