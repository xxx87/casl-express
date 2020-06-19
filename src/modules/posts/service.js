const { NotFound } = require('http-errors');
const Article = require('./model')();
const { parsePagination } = require('../utils');

async function findAll(req, res) {
  const articlesQuery = Article.accessibleBy(req.ability);

  const [page, pageSize] = parsePagination(req.query);
  const [count, articles] = await Promise.all([
    Article.find()
      .merge(articlesQuery)
      .count(),
    articlesQuery
      .populate('createdBy', 'email')
      .limit(pageSize)
      .skip((page - 1) * pageSize),
  ]);
  const items = articles.map((article) => {
    const object = article.toJSON();
    object.createdBy = article.createdBy;
    return object;
  });

  res.send({ items, count });
}

async function find(req, res) {
  const article = await Article.findById(req.params.id);

  if (!article) {
    throw new NotFound('article not found');
  }

  req.ability.throwUnlessCan('read', article);
  res.send({ item: article });
}

async function create(req, res) {
  const { published, ...body } = req.body;
  const article = new Article({
    ...body,
    author: req.user._id
  });

  req.ability.throwUnlessCan('create', article);

  if (published) {
    req.ability.throwUnlessCan('publish', article);
    article.published = published;
  }

  await article.save();

  res.send({ item: article });
}

async function update(req, res) {
  const article = await Article.findById(req.params.id);

  if (!article) {
    throw new NotFound('article not found');
  }

  if (req.body.published) {
    req.ability.throwUnlessCan('publish', article);
  }

  article.set(req.body);
  req.ability.throwUnlessCan('update', article);
  await article.save();

  res.send({ item: article });
}

async function destroy(req, res) {
  const article = await Article.findById(req.params.id);

  if (article) {
    req.ability.throwUnlessCan('delete', article);
    await article.remove();
  }

  res.send({ item: article });
}

module.exports = {
  create,
  update,
  destroy,
  find,
  findAll
};
