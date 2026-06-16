const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const CreatorCardMessages = require('@app/messages/creator-card');
const creatorCardRepository = require('@app/repository/creator-card');

const deleteCreatorCardSpec = `root {
  creator_reference string<trim|length:20>
}`;

const parsedDeleteCreatorCardSpec = validator.parse(deleteCreatorCardSpec);

function serializeCreatorCard(cardRecord) {
  // Convert Mongoose document to plain object to avoid circular reference issues
  const card = cardRecord.toObject ? cardRecord.toObject() : cardRecord;

  return {
    id: card._id,
    title: card.title,
    description: card.description || null,
    slug: card.slug,
    creator_reference: card.creator_reference,
    links: card.links || [],
    service_rates: card.service_rates || null,
    status: card.status,
    access_type: card.access_type,
    access_code: card.access_code || null,
    created: card.created,
    updated: card.updated,
    deleted: card.deleted ?? null,
  };
}

async function deleteCreatorCard(serviceData) {
  const data = validator.validate(serviceData, parsedDeleteCreatorCardSpec);
  const slug = String(serviceData.slug || '').trim();

  const existingCard = await creatorCardRepository.findOne({
    query: {
      slug,
      creator_reference: data.creator_reference,
      deleted: null,
    },
  });

  if (!existingCard) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  const deletedTimestamp = Date.now();

  await creatorCardRepository.updateOne({
    query: {
      _id: existingCard._id,
      deleted: null,
    },
    updateValues: {
      deleted: deletedTimestamp,
    },
  });

  const deletedCard = await creatorCardRepository.findOne({
    query: {
      _id: existingCard._id,
    },
  });

  return serializeCreatorCard(deletedCard || { ...existingCard, deleted: deletedTimestamp });
}

module.exports = deleteCreatorCard;
