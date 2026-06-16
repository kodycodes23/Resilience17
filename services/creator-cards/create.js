const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { randomBytes } = require('@app-core/randomness');
const CreatorCardMessages = require('@app/messages/creator-card');
const creatorCardRepository = require('@app/repository/creator-card');

const createCreatorCardSpec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50>
  creator_reference string<trim|length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<trim|length:6>
}`;

const parsedCreateCreatorCardSpec = validator.parse(createCreatorCardSpec);

function hasOnlyAllowedSlugCharacters(value) {
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    const code = ch.charCodeAt(0);
    const isLowerAlpha = code >= 97 && code <= 122;
    const isUpperAlpha = code >= 65 && code <= 90;
    const isNumber = code >= 48 && code <= 57;
    const isAllowedSymbol = ch === '-' || ch === '_';

    if (!isLowerAlpha && !isUpperAlpha && !isNumber && !isAllowedSymbol) {
      return false;
    }
  }

  return true;
}

function isAlphanumeric(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    const isLowerAlpha = code >= 97 && code <= 122;
    const isUpperAlpha = code >= 65 && code <= 90;
    const isNumber = code >= 48 && code <= 57;

    if (!isLowerAlpha && !isUpperAlpha && !isNumber) {
      return false;
    }
  }

  return true;
}

function slugifyTitle(title) {
  const titleInLowerCase = title.toLowerCase();
  let whitespaceNormalized = '';

  for (let i = 0; i < titleInLowerCase.length; i += 1) {
    const ch = titleInLowerCase[i];
    const isWhitespace = ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r';

    whitespaceNormalized += isWhitespace ? '-' : ch;
  }

  let cleanSlug = '';

  for (let i = 0; i < whitespaceNormalized.length; i += 1) {
    const ch = whitespaceNormalized[i];
    const code = ch.charCodeAt(0);
    const isLowerAlpha = code >= 97 && code <= 122;
    const isNumber = code >= 48 && code <= 57;
    const isAllowedSymbol = ch === '-' || ch === '_';

    if (isLowerAlpha || isNumber || isAllowedSymbol) {
      cleanSlug += ch;
    }
  }

  return cleanSlug.slice(0, 50);
}

async function slugExists(slug) {
  const existingCard = await creatorCardRepository.findOne({
    query: {
      slug,
      deleted: null,
    },
  });
  return !!existingCard;
}

async function getAvailableAutoSlug(title) {
  const generatedSlugBase = slugifyTitle(title);

  if (generatedSlugBase.length >= 5 && !(await slugExists(generatedSlugBase))) {
    return generatedSlugBase;
  }

  const basePrefix = (generatedSlugBase || 'card').slice(0, 43);
  let slugCandidate = '';

  /* eslint-disable no-await-in-loop */
  do {
    const suffix = randomBytes(6);
    slugCandidate = `${basePrefix}-${suffix}`;
  } while (await slugExists(slugCandidate));
  /* eslint-enable no-await-in-loop */

  return slugCandidate;
}

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

async function createCreatorCard(serviceData) {
  const validatedData = validator.validate(serviceData, parsedCreateCreatorCardSpec);

  const payload = {
    ...validatedData,
    access_type: validatedData.access_type || 'public',
    access_code: validatedData.access_code || null,
  };

  if (Array.isArray(payload.links)) {
    payload.links.forEach((link) => {
      const isValidUrlPrefix = link.url.startsWith('http://') || link.url.startsWith('https://');

      if (!isValidUrlPrefix) {
        throwAppError(CreatorCardMessages.INVALID_LINK_URL, ERROR_CODE.INVLDDATA);
      }
    });
  }

  if (payload.slug && !hasOnlyAllowedSlugCharacters(payload.slug)) {
    throwAppError(CreatorCardMessages.INVALID_SLUG_FORMAT, ERROR_CODE.INVLDDATA);
  }

  if (payload.access_type === 'private' && !payload.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC01');
  }

  if (payload.access_type === 'public' && payload.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_FORBIDDEN, 'AC05');
  }

  if (payload.access_code && !isAlphanumeric(payload.access_code)) {
    throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, ERROR_CODE.INVLDDATA);
  }

  if (payload.service_rates?.rates?.length) {
    payload.service_rates.rates.forEach((rate) => {
      if (!Number.isInteger(rate.amount) || rate.amount < 1) {
        throwAppError(CreatorCardMessages.INVALID_RATE_AMOUNT, ERROR_CODE.INVLDDATA);
      }
    });
  }

  const clientProvidedSlug = !!payload.slug;

  if (clientProvidedSlug) {
    const existingCardWithSlug = await creatorCardRepository.findOne({
      query: {
        slug: payload.slug,
        deleted: null,
      },
    });

    if (existingCardWithSlug) {
      throwAppError(CreatorCardMessages.SLUG_ALREADY_TAKEN, 'SL02');
    }
  } else {
    payload.slug = await getAvailableAutoSlug(payload.title);
  }

  let createdCard;

  if (clientProvidedSlug) {
    try {
      createdCard = await creatorCardRepository.create({
        ...payload,
        deleted: null,
      });
    } catch (error) {
      if (error.errorCode === ERROR_CODE.DUPLRCRD) {
        throwAppError(CreatorCardMessages.SLUG_ALREADY_TAKEN, 'SL02');
      }

      throw error;
    }
  } else {
    const maxAttempts = 8;
    let attempt = 0;

    // eslint-disable-next-line no-await-in-loop
    while (attempt < maxAttempts) {
      attempt += 1;

      try {
        // eslint-disable-next-line no-await-in-loop
        createdCard = await creatorCardRepository.create({
          ...payload,
          deleted: null,
        });
        break;
      } catch (error) {
        if (error.errorCode !== ERROR_CODE.DUPLRCRD) {
          throw error;
        }

        // eslint-disable-next-line no-await-in-loop
        payload.slug = await getAvailableAutoSlug(payload.title);
      }
    }

    if (!createdCard) {
      throwAppError(CreatorCardMessages.SLUG_ALREADY_TAKEN, 'SL02');
    }
  }

  return serializeCreatorCard(createdCard);
}

module.exports = createCreatorCard;
