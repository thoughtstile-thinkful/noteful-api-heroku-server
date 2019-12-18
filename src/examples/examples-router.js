const path = require('path');
const express = require('express');
const xss = require('xss');
const ExamplesService = require('./examples-service');

const examplesRouter = express.Router();
const jsonParser = express.json();

const serializeExample = example => ({
  id: example.id,
  style: example.style,
  title: xss(example.title),
  content: xss(example.content),
  date_published: example.date_published,
  author: example.author
});

examplesRouter
  .route('/')
  .get((req, res, next) => {
    ExamplesService.getAllExamples(req.app.get('db'))
      .then(examples => {
        res.json(examples);
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { title, content, style, author } = req.body;
    const newExample = { title, content, style };

    for (const [key, value] of Object.entries(newExample)) {
      // eslint-disable-next-line eqeqeq
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });
      }
    }
    newExample.author = author;
    ExamplesService.insertExample(req.app.get('db'), newExample)
      .then(example => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${example.id}`));
        res.json(serializeExample(example));
      })
      .catch(next);
  });

examplesRouter
  .route('/:example_id')
  .all((req, res, next) => {
    ExamplesService.getById(req.app.get('db'), req.params.example_id)
      .then(example => {
        if (!example) {
          return res.status(404).json({
            error: { message: "Example doesn't exist" }
          });
        }
        res.example = example; // save the example for the next middleware
        next(); // don't forget to call next so the next middleware happens!
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeExample(res.example));
  })
  .delete((req, res, next) => {
    ExamplesService.deleteExample(req.app.get('db'), req.params.example_id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { title, content, style } = req.body;
    const exampleToUpdate = { title, content, style };

    const numberOfValues = Object.values(exampleToUpdate).filter(Boolean)
      .length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message:
            "Request body must contain either 'title', 'style' or 'content'"
        }
      });
    }

    ExamplesService.updateExample(
      req.app.get('db'),
      req.params.example_id,
      exampleToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = examplesRouter;
