process.env.TZ = 'UTC';
require('dotenv').config();

const { expect } = require('chai');
const supertest = require('supertest');
const knex = require('knex');
const app = require('../src/app');
const { makeNotesArray } = require('./fixtures/notes.fixtures');
const { makeFoldersArray } = require('./fixtures/folders.fixtures');

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

describe('Folders Endpoints', function() {
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
    db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE')
  );

  afterEach('cleanup', () =>
    db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE')
  );

  describe(`GET /api/folders`, () => {
    context(`Given no folders`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, []);
      });
    });

    context('Given there are folders in the database', () => {
      const testNotes = makeNotesArray();
      const testFolders = makeFoldersArray();

      beforeEach('insert folders and notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db.into('noteful_notes').insert(testNotes);
          });
      });

      it('responds with 200 and all of the folders', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, testFolders);
      });
    });
  });

  // Given an XSS Attack Folder Passed

  describe('GET /api/folders/:folder_id', () => {
    context('Given no folder', () => {
      it('responds with 404', () => {
        const folder_id = uuidv4();
        return supertest(app)
          .get(`/api/folders/${folder_id}`)
          .expect(404, { error: { message: "Folder doesn't exist" } });
      });
    });

    context('Given there are folders in the database', () => {
      const testNotes = makeNotesArray();
      const testFolders = makeFoldersArray();

      beforeEach('insert folders and notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db.into('noteful_notes').insert(testNotes);
          });
      });

      it('responds with 200 and the specified folder', () => {
        const folder_id = 'b0715efe-ffaf-11e8-8eb2-f2801f1b9fd1';
        const expectedFolder = testFolders.find(
          folder => (folder.id = folder_id)
        );
        return supertest(app)
          .get(`/api/folders/${folder_id}`)
          .expect(200, expectedFolder);
      });
    });
  });

  describe('POST /api/folders', () => {
    it('creates an folder, responding with 201 and the new folder', () => {
      const newFolder = {
        name: 'Potato'
      };
      return supertest(app)
        .post('/api/folders')
        .send(newFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newFolder.name);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`);
        })
        .then(res =>
          supertest(app)
            .get(`/api/folders/${res.body.id}`)
            .expect(res.body)
        );
    });

    const requiredFields = ['name'];

    requiredFields.forEach(field => {
      const newFolder = {
        name: 'Potato'
      };

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newFolder[field];

        return supertest(app)
          .post('/api/folders')
          .send(newFolder)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });
  });

  describe(`GET /api/notes`, () => {
    context(`Given no notes`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, []);
      });
    });

    context('Given there are notes in the database', () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();

      beforeEach('insert folders and notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db.into('noteful_notes').insert(testNotes);
          });
      });

      it('responds with 200 and all of the notes', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, testNotes);
      });
    });
  });
});
