const { throwAppError } = require('@app-core/errors');
const CreatorCardMessages = require('@app/messages/creator-card');
const creatorCardRepository = require('@app/repository/creator-card');

function serializePublicCreatorCard(cardRecord) {
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
    created: card.created,
    updated: card.updated,
    deleted: card.deleted ?? null,
  };
}

async function getPublicCreatorCard(serviceData) {
  const slug = String(serviceData.slug || '').trim();
  const accessCode = String(serviceData.access_code || '').trim();

  const cardRecord = await creatorCardRepository.findOne({
    query: {
      slug,
      deleted: null,
    },
  });

  if (!cardRecord) {
    throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  if (cardRecord.status === 'draft') {
    throwAppError(CreatorCardMessages.CARD_DRAFT_NOT_PUBLIC, 'NF02');
  }

  if (cardRecord.access_type === 'private' && !accessCode) {
    throwAppError(CreatorCardMessages.PRIVATE_ACCESS_CODE_REQUIRED, 'AC03');
  }

  if (cardRecord.access_type === 'private' && accessCode !== String(cardRecord.access_code || '')) {
    throwAppError(CreatorCardMessages.PRIVATE_ACCESS_CODE_INVALID, 'AC04');
  }

  return serializePublicCreatorCard(cardRecord);
}

module.exports = getPublicCreatorCard;
