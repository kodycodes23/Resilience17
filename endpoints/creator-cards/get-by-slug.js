const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');
const getPublicCreatorCardService = require('@app/services/creator-cards/get-public');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [],
  async onResponseEnd(rc, rs) {
    appLogger.info(
      { requestContext: rc, response: rs },
      'get-public-creator-card-request-completed'
    );
  },
  async handler(rc, helpers) {
    const response = await getPublicCreatorCardService({
      slug: rc.params.slug,
      access_code: rc.query.access_code,
    });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Retrieved Successfully.',
      data: response,
    };
  },
});
