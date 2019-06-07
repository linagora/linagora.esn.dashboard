const request = require('supertest');
const { expect } = require('chai');
const _ = require('lodash');
const ObjectId = require('bson').ObjectId;

const MODULE_NAME = 'linagora.esn.dashboard';

describe('The boards API', function() {
  let user, otherUser, app, dashboardId, widgetId;
  const password = 'secret';

  beforeEach(function(done) {
    dashboardId = new ObjectId();
    widgetId = '123';

    this.helpers.modules.initMidway(MODULE_NAME, err => {
      expect(err).to.not.exist;

      const application = require(this.testEnv.backendPath + '/webserver/application')(this.helpers.modules.current.deps);
      const api = require(this.testEnv.backendPath + '/webserver/api')(this.helpers.modules.current.deps, this.helpers.modules.current.lib.lib);

      application.use(require('body-parser').json());
      application.use('/api', api);

      app = this.helpers.modules.getWebServer(application);

      this.helpers.api.applyDomainDeployment('foo_and_bar_users', (err, models) => {
        if (err) {
          return done(err);
        }
        user = models.users[0];
        otherUser = models.users[1];

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
    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'get', '/api/boards', done);
    });

    it('should HTTP 200 with default dashboard', function(done) {
      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        const req = requestAsMember(request(app).get('/api/boards'));

        req.expect(200).end((err, res) => {
          expect(err).to.not.exist;
          expect(res.body).to.shallowDeepEqual([{
            _id: String(user._id),
            name: 'default'
          }]);

          done();
        });
      });
    });

    it('should HTTP 200 with existing dashboards for current user', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };
      const otherDashboard = { name: 'my other dashboard', creator: user._id };
      const otherUserDashboard = { name: 'my dashboard', creator: otherUser._id };

      Promise.all([
        this.helpers.modules.current.lib.lib.dashboard.create(dashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherDashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherUserDashboard)
      ])
      .then(test)
      .catch(done);

      function test(dashboards) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          const req = requestAsMember(request(app).get('/api/boards'));

          req.expect(200).end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.length).to.eq(3);
            expect(_.find(res.body, { _id: String(user._id) })).to.be.truethy;
            expect(_.find(res.body, { _id: String(dashboards[0]) })).to.be.truethy;
            expect(_.find(res.body, { _id: String(dashboards[1]) })).to.be.truethy;
            expect(_.find(res.body, { _id: String(dashboards[2]) })).to.be.falsy;

            done();
          });
        });
      }
    });

    it('should HTTP 200 with widgets in the right order when order is defined for widgets', function(done) {
      const self = this;
      const dashboard = {
        name: 'my dashboard',
        creator: user._id,
        widgets: {
          instances: [
            { id: '2', type: 'email' },
            { id: '3', type: 'email' },
            { id: '1', type: 'email' }
          ],
          order: ['3', '2', '1']
        }
      };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(created) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          const req = requestAsMember(request(app).get('/api/boards'));

          req.expect(200).end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.length).to.eq(2);

            const dashboard = _.find(res.body, {_id: String(created._id)});

            expect(dashboard).to.exist;
            expect(dashboard.widgets.instances).to.deep.equals([
              { id: '3', type: 'email' },
              { id: '2', type: 'email' },
              { id: '1', type: 'email' }
            ]);

            done();
          });
        });
      }
    });

    it('should HTTP 200 with widgets in the right order when defined and push others at the beginning', function(done) {
      const self = this;
      const dashboard = {
        name: 'my dashboard',
        creator: user._id,
        widgets: {
          instances: [
            { id: '4', type: 'email' },
            { id: '2', type: 'email' },
            { id: '3', type: 'email' },
            { id: '1', type: 'email' }
          ],
          order: ['3', '2', '1']
        }
      };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(created) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          const req = requestAsMember(request(app).get('/api/boards'));

          req.expect(200).end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.length).to.eq(2);

            const dashboard = _.find(res.body, {_id: String(created._id)});

            expect(dashboard).to.exist;
            expect(dashboard.widgets.instances).to.deep.equals([
              { id: '4', type: 'email' },
              { id: '3', type: 'email' },
              { id: '2', type: 'email' },
              { id: '1', type: 'email' }
            ]);

            done();
          });
        });
      }
    });
  });

  describe('PUT /boards', function() {
    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'put', '/api/boards', done);
    });

    it('should create the dashboard and HTTP 201 with created dashboard', function(done) {
      const dashboard = { name: 'My dashboard' };

      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        requestAsMember(request(app).put('/api/boards'))
          .send(dashboard)
          .expect(201)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body).to.shallowDeepEqual({ name: dashboard.name });

            done();
          });
      });
    });
  });

  describe('GET /boards/:id', function() {
    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'get', `/api/boards/${dashboardId}`, done);
    });

    it('should HTTP 404 when board does not exist', function(done) {
      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        requestAsMember(request(app).get(`/api/boards/${dashboardId}`))
          .expect(404)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.error.details).to.match(/dashboard not found/);

            done();
          });
      });
    });

    it('should HTTP 404 when board is not current user one', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };
      const otherUserDashboard = { name: 'my dashboard', creator: otherUser._id };

      Promise.all([
        this.helpers.modules.current.lib.lib.dashboard.create(dashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherUserDashboard)
      ])
      .then(test)
      .catch(done);

      function test(dashboards) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).get(`/api/boards/${dashboards[1]._id}`))
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/dashboard not found/);

              done();
            });
        });
      }
    });

    it('should HTTP 200 with the requested dashboard', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).get(`/api/boards/${dashboard._id}`))
            .expect(200)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body).to.shallowDeepEqual({ _id: String(dashboard._id), name: dashboard.name });

              done();
            });
        });
      }
    });
  });

  describe('DELETE /boards/:id', function() {
    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'delete', `/api/boards/${dashboardId}`, done);
    });

    it('should HTTP 404 when board does not exist', function(done) {
      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        requestAsMember(request(app).delete(`/api/boards/${dashboardId}`))
          .expect(404)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.error.details).to.match(/dashboard not found/);

            done();
          });
      });
    });

    it('should HTTP 404 when board is not current user one', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };
      const otherUserDashboard = { name: 'my dashboard', creator: otherUser._id };

      Promise.all([
        this.helpers.modules.current.lib.lib.dashboard.create(dashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherUserDashboard)
      ])
      .then(test)
      .catch(done);

      function test(dashboards) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).delete(`/api/boards/${dashboards[1]._id}`))
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/dashboard not found/);

              done();
            });
        });
      }
    });

    it('should remove the dashboard and HTTP 204', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).delete(`/api/boards/${dashboard._id}`))
            .expect(204)
            .end(err => {
              expect(err).to.not.exist;

              self.helpers.modules.current.lib.lib.dashboard
                .get(dashboard._id)
                .then(found => {
                  expect(found).to.not.exist;

                  done();
                })
                .catch(done);
            });
        });
      }
    });
  });

  describe('PATCH /boards/:id', function() {
    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'patch', `/api/boards/${dashboardId}`, done);
    });

    it('should HTTP 404 when board does not exist', function(done) {
      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        requestAsMember(request(app).patch(`/api/boards/${dashboardId}`))
          .expect(404)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.error.details).to.match(/dashboard not found/);

            done();
          });
      });
    });

    it('should HTTP 404 when board is not current user one', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };
      const otherUserDashboard = { name: 'my dashboard', creator: otherUser._id };

      Promise.all([
        this.helpers.modules.current.lib.lib.dashboard.create(dashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherUserDashboard)
      ])
      .then(test)
      .catch(done);

      function test(dashboards) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).patch(`/api/boards/${dashboards[1]._id}`))
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/dashboard not found/);

              done();
            });
        });
      }
    });

    it('should HTTP 400 when body is undefined', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).patch(`/api/boards/${dashboard._id}`))
            .expect(400)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/body is required/);

              done();
            });
        });
      }
    });

    it('should HTTP 400 when body is empty', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).patch(`/api/boards/${dashboard._id}`))
            .send({})
            .expect(400)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/Request body is required/);

              done();
            });
        });
      }
    });

    it('should HTTP 400 when trying to update something else than name', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).patch(`/api/boards/${dashboard._id}`))
            .send({ foo: 'bar' })
            .expect(400)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/Request body is malformed/);

              done();
            });
        });
      }
    });

    it('should update the dashboard and HTTP 200', function(done) {
      const self = this;
      const newName = 'The new dashboard name';
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(testApi)
        .then(postCheck)
        .then(done)
        .catch(done);

      function testApi(dashboard) {
        return new Promise((resolve, reject) => {
          self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
            expect(err).to.not.exist;
            requestAsMember(request(app).patch(`/api/boards/${dashboard._id}`))
              .send({ name: newName })
              .expect(200)
              .end(err => (err ? reject(err) : resolve(dashboard)));
          });
        });
      }

      function postCheck(dashboard) {
        return self.helpers.modules.current.lib.lib.dashboard.get(dashboard._id)
          .then(updated => {
            if (!updated) {
              throw new Error('dashboard not found');
            }
            expect(updated.name).to.eql(newName);
          });
      }
    });
  });

  describe('PUT /boards/:id/widgets', function() {
    let widget;

    beforeEach(function() {
      widget = {
        type: 'email',
        id: '123456789'
      };
    });

    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'patch', `/api/boards/${dashboardId}/widgets`, done);
    });

    it('should HTTP 404 when board does not exist', function(done) {
      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        requestAsMember(request(app).put(`/api/boards/${dashboardId}/widgets`))
          .send(widget)
          .expect(404)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.error.details).to.match(/dashboard not found/);

            done();
          });
      });
    });

    it('should HTTP 404 when board is not current user one', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };
      const otherUserDashboard = { name: 'my dashboard', creator: otherUser._id };

      Promise.all([
        this.helpers.modules.current.lib.lib.dashboard.create(dashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherUserDashboard)
      ])
      .then(test)
      .catch(done);

      function test(dashboards) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).put(`/api/boards/${dashboards[1]._id}/widgets`))
            .send(widget)
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/dashboard not found/);

              done();
            });
        });
      }
    });

    it('should HTTP 400 when widget is not well defined', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .then(postCheck)
        .then(done)
        .catch(done);

      function test(dashboard) {
        return new Promise((resolve, reject) => {
          self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
            expect(err).to.not.exist;
            requestAsMember(request(app).put(`/api/boards/${dashboard._id}/widgets`))
              .send({})
              .expect(400)
              .end(err => (err ? reject(err) : resolve(dashboard)));
          });
        });
      }

      function postCheck(dashboard) {
        return self.helpers.modules.current.lib.lib.dashboard.get(dashboard._id)
          .then(updated => {
            if (!updated) {
              throw new Error('dashboard not found');
            }
            expect(updated.widgets.instances.length).to.eql(0);
          });
      }
    });

    it('should add widget to dashboard and HTTP 200', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(preCheck)
        .then(apiTest)
        .then(postCheck)
        .then(done)
        .catch(done);

      function preCheck(dashboard) {
        expect(dashboard.widgets.instances).to.be.empty;

        return dashboard;
      }

      function postCheck(dashboard) {
        return self.helpers.modules.current.lib.lib.dashboard.get(dashboard._id)
          .then(updated => {
            if (!updated) {
              throw new Error('dashboard not found');
            }
            expect(updated.widgets.instances.length).to.eql(1);
            expect(updated.widgets.instances[0]).to.shallowDeepEqual(widget);
          });
      }

      function apiTest(dashboard) {
        return new Promise((resolve, reject) => {
          self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
            expect(err).to.not.exist;
            requestAsMember(request(app).put(`/api/boards/${dashboard._id}/widgets`))
              .send(widget)
              .expect(200)
              .end(err => {
                if (err) {
                  return reject(err);
                }

                resolve(dashboard);
              });
          });
        });
      }
    });
  });

  describe('GET /boards/:id/widgets', function() {
    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'get', `/api/boards/${dashboardId}/widgets`, done);
    });

    it('should HTTP 404 when board does not exist', function(done) {
      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        requestAsMember(request(app).get(`/api/boards/${dashboardId}/widgets`))
          .expect(404)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.error.details).to.match(/dashboard not found/);

            done();
          });
      });
    });

    it('should HTTP 404 when board is not current user one', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };
      const otherUserDashboard = { name: 'my dashboard', creator: otherUser._id };

      Promise.all([
        this.helpers.modules.current.lib.lib.dashboard.create(dashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherUserDashboard)
      ])
      .then(test)
      .catch(done);

      function test(dashboards) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).get(`/api/boards/${dashboards[1]._id}/widgets`))
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/dashboard not found/);

              done();
            });
        });
      }
    });

    it('should HTTP 200 with the empty array when not widgets are defined', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).get(`/api/boards/${dashboard._id}/widgets`))
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }
              expect(res.body).to.deep.equal([]);

              done();
            });
        });
      }
    });

    it('should HTTP 200 with the dashboard widgets', function(done) {
      const self = this;
      const dashboard = {
        name: 'my dashboard',
        creator: user._id,
        widgets: {
          instances: [
            { type: 'email', id: 1 },
            { type: 'events', id: 2 }
          ]
        }
      };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).get(`/api/boards/${dashboard._id}/widgets`))
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.length).to.equal(2);
              expect(_.find(res.body, { id: String(dashboard.widgets.instances[0].id) })).to.be.truethy;
              expect(_.find(res.body, { id: String(dashboard.widgets.instances[1].id) })).to.be.truethy;

              done();
            });
        });
      }
    });
  });

  describe('PATCH /boards/:id/widgets/order', function() {
    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'patch', `/api/boards/${dashboardId}/widgets/order`, done);
    });

    it('should HTTP 404 when board does not exist', function(done) {
      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        requestAsMember(request(app).patch(`/api/boards/${dashboardId}/widgets/order`))
          .expect(404)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.error.details).to.match(/dashboard not found/);

            done();
          });
      });
    });

    it('should HTTP 404 when board is not current user one', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };
      const otherUserDashboard = { name: 'my dashboard', creator: otherUser._id };

      Promise.all([
        this.helpers.modules.current.lib.lib.dashboard.create(dashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherUserDashboard)
      ])
      .then(test)
      .catch(done);

      function test(dashboards) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).patch(`/api/boards/${dashboards[1]._id}/widgets/order`))
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/dashboard not found/);

              done();
            });
        });
      }
    });

    it('should HTTP 400 when request is empty', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).patch(`/api/boards/${dashboard._id}/widgets/order`))
            .send([])
            .expect(400)
            .end((err, res) => {
              if (err) {
                return done(err);
              }
              expect(res.body.error.details).to.match(/Request body is required/);

              done();
            });
        });
      }
    });

    it('should order widgets and HTTP 200', function(done) {
      const self = this;
      const order = ['2', '1'];
      const dashboard = {
        name: 'my dashboard',
        creator: user._id,
        widgets: {
          instances: [
            { id: '1', type: 'email' },
            { id: '2', type: 'events' }
          ]
        }
      };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(testApi)
        .then(check)
        .then(done)
        .catch(done);

      function testApi(dashboard) {
        return new Promise((resolve, reject) => {
          self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
            expect(err).to.not.exist;
            requestAsMember(request(app).patch(`/api/boards/${dashboard._id}/widgets/order`))
              .send(order)
              .expect(200)
              .end(err => (err ? reject(err) : resolve(dashboard)));
          });
        });
      }

      function check(dashboard) {
        return self.helpers.modules.current.lib.lib.dashboard.get(dashboard._id)
          .then(updated => {
            expect(JSON.stringify(updated.widgets.order)).to.equal('["2","1"]');
          });
      }
    });
  });

  describe('DELETE /boards/:id/widgets/:wid', function() {
    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'delete', `/api/boards/${dashboardId}/widgets/${widgetId}`, done);
    });

    it('should HTTP 404 when board does not exist', function(done) {
      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        requestAsMember(request(app).delete(`/api/boards/${dashboardId}/widgets/${widgetId}`))
          .expect(404)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.error.details).to.match(/dashboard not found/);

            done();
          });
      });
    });

    it('should HTTP 404 when board is not current user one', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };
      const otherUserDashboard = { name: 'my dashboard', creator: otherUser._id };

      Promise.all([
        this.helpers.modules.current.lib.lib.dashboard.create(dashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherUserDashboard)
      ])
      .then(test)
      .catch(done);

      function test(dashboards) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).delete(`/api/boards/${dashboards[1]._id}/widgets/${widgetId}`))
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/dashboard not found/);

              done();
            });
        });
      }
    });

    it('should HTTP 404 when widget does not exist', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).delete(`/api/boards/${dashboard._id}/widgets/${widgetId}`))
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/widget not found/);

              done();
            });
        });
      }
    });

    it('should remove widget and HTTP 204', function(done) {
      const self = this;
      const anotherWidgetId = 'anotherid';
      const dashboard = {
        name: 'my dashboard',
        creator: user._id,
        widgets: {
          instances: [
            { id: widgetId, type: 'email' },
            { id: anotherWidgetId, type: 'email' }
          ]
        }
      };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(preCheck)
        .then(testApi)
        .then(postCheck)
        .then(done)
        .catch(done);

      function preCheck(dashboard) {
        expect(dashboard.widgets.instances.length).to.eql(2);

        return dashboard;
      }

      function postCheck(dashboard) {
        return self.helpers.modules.current.lib.lib.dashboard.get(dashboard._id)
          .then(updated => {
            expect(updated.widgets.instances.length).to.eql(1);
            expect(updated.widgets.instances[0]).to.shallowDeepEqual({ id: anotherWidgetId });
          });
      }

      function testApi(dashboard) {
        return new Promise((resolve, reject) => {
          self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
            expect(err).to.not.exist;
            requestAsMember(request(app).delete(`/api/boards/${dashboard._id}/widgets/${widgetId}`))
              .expect(204)
              .end(err => (err ? reject(err) : resolve(dashboard)));
          });
        });
      }
    });

    it('should remove widget and from order if defined then HTTP 204', function(done) {
      const self = this;
      const anotherWidgetId = 'anotherid';
      const lostWidgetId = 'lostWidgetId';
      const dashboard = {
        name: 'my dashboard',
        creator: user._id,
        widgets: {
          instances: [
            { id: widgetId, type: 'email' },
            { id: anotherWidgetId, type: 'email' }
          ],
          order: [widgetId, anotherWidgetId, lostWidgetId]
        }
      };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(preCheck)
        .then(testApi)
        .then(postCheck)
        .then(done)
        .catch(done);

      function preCheck(dashboard) {
        expect(dashboard.widgets.instances.length).to.eql(2);

        return dashboard;
      }

      function postCheck(dashboard) {
        return self.helpers.modules.current.lib.lib.dashboard.get(dashboard._id)
          .then(updated => {
            expect(updated.widgets.instances.length).to.eql(1);
            expect(updated.widgets.instances[0]).to.shallowDeepEqual({ id: anotherWidgetId });
            expect(JSON.stringify(updated.widgets.order)).to.eql('["anotherid","lostWidgetId"]');
          });
      }

      function testApi(dashboard) {
        return new Promise((resolve, reject) => {
          self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
            expect(err).to.not.exist;
            requestAsMember(request(app).delete(`/api/boards/${dashboard._id}/widgets/${widgetId}`))
              .expect(204)
              .end(err => (err ? reject(err) : resolve(dashboard)));
          });
        });
      }
    });
  });

  describe('POST /boards/:id/widgets/:wid/settings', function() {
    let settings;

    beforeEach(function() {
      settings = { url: 'http://jmap.open-paas.org' };
    });

    it('should HTTP 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'patch', `/api/boards/${dashboardId}/widgets/${widgetId}/settings`, done);
    });

    it('should HTTP 404 when board does not exist', function(done) {
      this.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        expect(err).to.not.exist;
        requestAsMember(request(app).post(`/api/boards/${dashboardId}/widgets/${widgetId}/settings`))
          .send(settings)
          .expect(404)
          .end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body.error.details).to.match(/dashboard not found/);

            done();
          });
      });
    });

    it('should HTTP 404 when board is not current user one', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };
      const otherUserDashboard = { name: 'my dashboard', creator: otherUser._id };

      Promise.all([
        this.helpers.modules.current.lib.lib.dashboard.create(dashboard),
        this.helpers.modules.current.lib.lib.dashboard.create(otherUserDashboard)
      ])
      .then(test)
      .catch(done);

      function test(dashboards) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).post(`/api/boards/${dashboards[1]._id}/widgets/${widgetId}/settings`))
            .send(settings)
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/dashboard not found/);

              done();
            });
        });
      }
    });

    it('should HTTP 404 when widget does not exist', function(done) {
      const self = this;
      const dashboard = { name: 'my dashboard', creator: user._id };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(test)
        .catch(done);

      function test(dashboard) {
        self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
          expect(err).to.not.exist;
          requestAsMember(request(app).post(`/api/boards/${dashboard._id}/widgets/${widgetId}/settings`))
            .send(settings)
            .expect(404)
            .end((err, res) => {
              expect(err).to.not.exist;
              expect(res.body.error.details).to.match(/widget not found/);

              done();
            });
        });
      }
    });

    it('should update settings and HTTP 200', function(done) {
      const self = this;
      const dashboard = {
        name: 'my dashboard',
        creator: user._id,
        widgets: {
          instances: [
            { id: widgetId, type: 'email' }
          ]
        }
      };

      this.helpers.modules.current.lib.lib.dashboard.create(dashboard)
        .then(testApi)
        .then(postCheck)
        .then(done)
        .catch(done);

      function testApi(dashboard) {
        return new Promise((resolve, reject) => {
          self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
            expect(err).to.not.exist;
            requestAsMember(request(app).post(`/api/boards/${dashboard._id}/widgets/${widgetId}/settings`))
              .send(settings)
              .expect(200)
              .end(err => (err ? reject(err) : resolve(dashboard)));
          });
        });
      }

      function postCheck(dashboard) {
        return self.helpers.modules.current.lib.lib.dashboard.get(dashboard._id)
          .then(updated => {
            expect(updated.widgets.instances[0].settings).to.deep.equals(settings);
          });
      }
    });
  });
});
