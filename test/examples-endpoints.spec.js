process.env.TZ = 'UTC';
require('dotenv').config();

const { expect } = require('chai');
const supertest = require('supertest');
const knex = require('knex');
const app = require('../src/app');
const {
  makeExamplesArray,
  makeMaliciousExample
} = require('./fixtures/examples.fixtures');
const { makeUsersArray } = require('./fixtures/users.fixtures');

describe.skip('Examples Endpoints', function() {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', () =>
    db.raw('TRUNCATE blogful_examples, blogful_users RESTART IDENTITY CASCADE')
  );

  afterEach('cleanup', () =>
    db.raw('TRUNCATE blogful_examples, blogful_users RESTART IDENTITY CASCADE')
  );

  describe(`GET /api/examples`, () => {
    context(`Given no examples`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/examples')
          .expect(200, []);
      });
    });

    context('Given there are examples in the database', () => {
      const testUsers = makeUsersArray();
      const testExamples = makeExamplesArray();

      beforeEach('insert examples', () => {
        return db
          .into('blogful_users')
          .insert(testUsers)
          .then(() => {
            return db.into('blogful_examples').insert(testExamples);
          });
      });

      it('responds with 200 and all of the examples', () => {
        return supertest(app)
          .get('/api/examples')
          .expect(200, testExamples);
      });
    });

    context(`Given an XSS attack example`, () => {
      const testUsers = makeUsersArray();
      const { maliciousExample, expectedExample } = makeMaliciousExample();

      beforeEach('insert malicious example', () => {
        return db
          .into('blogful_users')
          .insert(testUsers)
          .then(() => {
            return db.into('blogful_examples').insert([maliciousExample]);
          });
      });

      // it('removes XSS attack content', () => {
      //   return supertest(app)
      //     .get(`/api/examples`)
      //     .expect(200)
      //     .expect(res => {
      //       expect(res.body[0].title).to.eql(expectedExample.title);
      //       expect(res.body[0].content).to.eql(expectedExample.content);
      //     });
      // });
    });
  });

  describe(`GET /api/examples/:example_id`, () => {
    context(`Given no examples`, () => {
      it(`responds with 404`, () => {
        const exampleId = 123456;
        return supertest(app)
          .get(`/api/examples/${exampleId}`)
          .expect(404, { error: { message: `Example doesn't exist` } });
      });
    });

    context('Given there are examples in the database', () => {
      const testUsers = makeUsersArray();
      const testExamples = makeExamplesArray();

      beforeEach('insert examples', () => {
        return db
          .into('blogful_users')
          .insert(testUsers)
          .then(() => {
            return db.into('blogful_examples').insert(testExamples);
          });
      });

      it('responds with 200 and the specified example', () => {
        const exampleId = 2;
        const expectedExample = testExamples[exampleId - 1];
        return supertest(app)
          .get(`/api/examples/${exampleId}`)
          .expect(200, expectedExample);
      });
    });

    context(`Given an XSS attack example`, () => {
      const testUsers = makeUsersArray();
      const { maliciousExample, expectedExample } = makeMaliciousExample();

      beforeEach('insert malicious example', () => {
        return db
          .into('blogful_users')
          .insert(testUsers)
          .then(() => {
            return db.into('blogful_examples').insert([maliciousExample]);
          });
      });

      // it('removes XSS attack content', () => {
      //   return supertest(app)
      //     .get(`/api/examples/${maliciousExample.id}`)
      //     .expect(200)
      //     .expect(res => {
      //       expect(res.body.title).to.eql(expectedExample.title);
      //       expect(res.body.content).to.eql(expectedExample.content);
      //     });
      // });
    });
  });

  describe(`POST /api/examples`, () => {
    const testUsers = makeUsersArray();
    beforeEach('insert malicious example', () => {
      return db.into('blogful_users').insert(testUsers);
    });

    it(`creates an example, responding with 201 and the new example`, () => {
      const newExample = {
        title: 'Test new example',
        style: 'Listicle',
        content: 'Test new example content...'
      };
      return supertest(app)
        .post('/api/examples')
        .send(newExample)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newExample.title);
          expect(res.body.style).to.eql(newExample.style);
          expect(res.body.content).to.eql(newExample.content);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/examples/${res.body.id}`);
          const expected = new Intl.DateTimeFormat('en-US').format(new Date());
          const actual = new Intl.DateTimeFormat('en-US').format(
            new Date(res.body.date_published)
          );
          expect(actual).to.eql(expected);
        })
        .then(res =>
          supertest(app)
            .get(`/api/examples/${res.body.id}`)
            .expect(res.body)
        );
    });

    const requiredFields = ['title', 'style', 'content'];

    requiredFields.forEach(field => {
      const newExample = {
        title: 'Test new example',
        style: 'Listicle',
        content: 'Test new example content...'
      };

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newExample[field];

        return supertest(app)
          .post('/api/examples')
          .send(newExample)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });

    it('removes XSS attack content from response', () => {
      const { maliciousExample, expectedExample } = makeMaliciousExample();
      return supertest(app)
        .post(`/api/examples`)
        .send(maliciousExample)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedExample.title);
          expect(res.body.content).to.eql(expectedExample.content);
        });
    });
  });

  describe(`DELETE /api/examples/:example_id`, () => {
    context(`Given no examples`, () => {
      it(`responds with 404`, () => {
        const exampleId = 123456;
        return supertest(app)
          .delete(`/api/examples/${exampleId}`)
          .expect(404, { error: { message: `Example doesn't exist` } });
      });
    });

    context('Given there are examples in the database', () => {
      const testUsers = makeUsersArray();
      const testExamples = makeExamplesArray();

      beforeEach('insert examples', () => {
        return db
          .into('blogful_users')
          .insert(testUsers)
          .then(() => {
            return db.into('blogful_examples').insert(testExamples);
          });
      });

      it('responds with 204 and removes the example', () => {
        const idToRemove = 2;
        const expectedExamples = testExamples.filter(
          example => example.id !== idToRemove
        );
        return supertest(app)
          .delete(`/api/examples/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/examples`)
              .expect(expectedExamples)
          );
      });
    });
  });

  describe(`PATCH /api/examples/:example_id`, () => {
    context(`Given no examples`, () => {
      it(`responds with 404`, () => {
        const exampleId = 123456;
        return supertest(app)
          .delete(`/api/examples/${exampleId}`)
          .expect(404, { error: { message: `Example doesn't exist` } });
      });
    });

    context('Given there are examples in the database', () => {
      const testUsers = makeUsersArray();
      const testExamples = makeExamplesArray();

      beforeEach('insert examples', () => {
        return db
          .into('blogful_users')
          .insert(testUsers)
          .then(() => {
            return db.into('blogful_examples').insert(testExamples);
          });
      });

      it('responds with 204 and updates the example', () => {
        const idToUpdate = 2;
        const updateExample = {
          title: 'updated example title',
          style: 'Interview',
          content: 'updated example content'
        };
        const expectedExample = {
          ...testExamples[idToUpdate - 1],
          ...updateExample
        };
        return supertest(app)
          .patch(`/api/examples/${idToUpdate}`)
          .send(updateExample)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/examples/${idToUpdate}`)
              .expect(expectedExample)
          );
      });

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/examples/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'style' or 'content'`
            }
          });
      });

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2;
        const updateExample = {
          title: 'updated example title'
        };
        const expectedExample = {
          ...testExamples[idToUpdate - 1],
          ...updateExample
        };

        return supertest(app)
          .patch(`/api/examples/${idToUpdate}`)
          .send({
            ...updateExample,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/examples/${idToUpdate}`)
              .expect(expectedExample)
          );
      });
    });
  });
});
