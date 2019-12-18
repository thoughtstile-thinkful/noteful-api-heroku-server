const ExamplesService = {
  getAllExamples(knex) {
    return knex.select('*').from('blogful_examples');
  },
  insertExample(knex, newExample) {
    return knex
      .insert(newExample)
      .into('blogful_examples')
      .returning('*')
      .then(rows => {
        return rows[0];
      });
  },
  getById(knex, id) {
    return knex
      .from('blogful_examples')
      .select('*')
      .where('id', id)
      .first();
  },
  deleteExample(knex, id) {
    return knex('blogful_examples')
      .where({ id })
      .delete();
  },
  updateExample(knex, id, newExampleFields) {
    return knex('blogful_examples')
      .where({ id })
      .update(newExampleFields);
  }
};

module.exports = ExamplesService;
