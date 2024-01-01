/* globals Notice, request, requestUrl, moment */
import xbbcode from 'xbbcode-parser';

const notice = (msg) => new Notice(msg, 5000);
const noticeAndThrow = (msg, cause) => {
  notice(msg);
  throw new Error(msg, { cause });
};

const API_URL = 'https://api.vndb.org/kana/vn';

const POSTER_SAVE_PATH_OPTION = 'Vault directory path for game posters';
const USE_CLIPBOARD_DATA_OPTION = 'Use clipboard data for game search';

let app;
let obsidian;
let quickAddApi;

module.exports = {
  entry: start,
  settings: {
    name: 'VNDB Script',
    author: 'akatopo',
    options: {
      [POSTER_SAVE_PATH_OPTION]: {
        type: 'text',
        defaultValue: '',
        placeholder: 'ex. Games/posters',
      },
      [USE_CLIPBOARD_DATA_OPTION]: {
        type: 'checkbox',
        defaultValue: false,
      },
    },
  },
};

// release date YYYY-MM-DD format
const getReleaseYear = (releaseDate) =>
  releaseDate ? +moment(releaseDate).format('YYYY') : ' ';

const listFromProp =
  (prop) =>
  (array, linkify = true) =>
    formatList(
      // keep entries unique
      Array.from(
        new Set(array?.map(prop ? (item) => item[prop] : (x) => x) ?? []),
      ),
      linkify,
    );

const listFromArray = listFromProp();
const listFromNameProp = listFromProp('name');

const getMarkdownDescription = (description) => {
  const { htmlToMarkdown } = obsidian;

  try {
    return htmlToMarkdown(
      // xbbcode should cover most of vndb's description formatting, see: https://vndb.org/d9#4
      xbbcode
        .process({ text: description, addInLineBreaks: false })
        .html.replaceAll('\n', '<br />'),
    );
  } catch (error) {
    return ' ';
  }
};

async function start(params, settings) {
  ({ app, obsidian, quickAddApi } = params);

  const {
    [POSTER_SAVE_PATH_OPTION]: posterBasePath,
    [USE_CLIPBOARD_DATA_OPTION]: shouldUseClipboard,
  } = settings;

  const { getClipboard } = quickAddApi.utility;

  const queryPlaceholders = ['CLANNAD', 'School days', 'Tokimeki Memorial'];
  const queryPlaceholder =
    queryPlaceholders[
      Math.floor(Math.random() * (queryPlaceholders.length - 1))
    ];

  const query = await quickAddApi.inputPrompt(
    'Enter video game title: ',
    `ex. ${queryPlaceholder}`,
    shouldUseClipboard ? (await getClipboard()).trim() : '',
  );
  if (!query) {
    noticeAndThrow('No query entered.');
  }

  const { results: searchResults } = await executeQuery(query);

  if (!Array.isArray(searchResults) || searchResults.length === 0) {
    noticeAndThrow('No results found.');
  }

  const selectedGame = await quickAddApi.suggester(
    searchResults.map(formatTitleForSuggestion),
    searchResults,
  );

  if (!selectedGame) {
    notice('No choice selected.');
    throw new Error('No choice selected.');
  }

  const transformers = {
    title: (title) => `'${escapeSingleQuotedYamlString(title)}'`,
    templateTitle: 'title',
    posterUrl: (_, { image }) => image?.url ?? ' ',
    vndbId: 'id',
    vndbUrl: (_, { id }) => `https://vndb.org/${id}`,
    fileName: (_, { title, released }) => {
      const releaseYear = getReleaseYear(released);
      const releaseYearStr =
        typeof releaseYear === 'number' ? ` (${releaseYear})` : '';

      return sanitizeFilename(`${title}${releaseYearStr}`);
    },
    platforms: (p) => listFromArray(p),
    keywords: (_, { tags }) => listFromNameProp(tags),
    aliases: (_, { title, aliases = [] }) =>
      listFromArray([...aliases, title], false),
    developer: (_, { developers }) => listFromNameProp(developers),
    templateDeveloper: (_, { developers }) =>
      developers?.map((d) => d.name).join(', ') ?? ' ',
    year: (_, { released }) => getReleaseYear(released),
    releaseDate: 'released',
    templateDescription: (_, { description }) =>
      getMarkdownDescription(description ?? ''),
  };

  const variables = pick(selectedGame, transformers);
  const { posterUrl } = variables;
  const posterPath =
    (await tryDownloadPoster({
      posterUrl,
      gameName: selectedGame.title,
      basePath: posterBasePath,
    })) || ' ';

  params.variables = {
    original: selectedGame,
    ...variables,
    posterPath,
    templatePoster: posterPath.trim()
      ? `![[${posterPath}]]`
      : `![](${posterUrl})`,
  };
}

async function executeQuery(query) {
  try {
    return await getGames(query);
  } catch (error) {
    noticeAndThrow('Failed to fetch game results.', { cause: error });
  }
}

async function tryDownloadPoster({ posterUrl, gameName, basePath = '' }) {
  const { normalizePath } = obsidian;
  const { vault } = app;

  const lastSlashIndex = posterUrl.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return false;
  }

  const filename = posterUrl.slice(posterUrl.lastIndexOf('/'));
  const [name, ext] = filename.split(/\.(?!.*\.)/).map(sanitizeFilename);
  if (!name || !ext) {
    return false;
  }

  let sanitizedBasePath = basePath.trim();
  // strip last path separator if it exists
  sanitizedBasePath =
    sanitizedBasePath.length > 0 &&
    sanitizedBasePath[sanitizedBasePath.length - 1] === '/'
      ? sanitizedBasePath.slice(0, sanitizedBasePath.length - 1)
      : sanitizedBasePath;
  sanitizedBasePath = normalizePath(
    sanitizedBasePath
      .split('/')
      .map((segment) => sanitizeFilename(segment))
      .join('/'),
  );

  const basePathExists = await vault.adapter.exists(sanitizedBasePath);
  const targetPath = normalizePath(
    `${sanitizedBasePath}/${sanitizeFilename(gameName)}-${name}.${ext}`,
  );
  const targetPathExists = await vault.adapter.exists(targetPath);
  if (targetPathExists) {
    // assume that poster is already downloaded at this point
    return targetPath;
  }

  try {
    const { arrayBuffer } = await requestUrl({
      url: posterUrl,
      method: 'GET',
      cache: 'no-cache',
    });
    if (!basePathExists) {
      await vault.adapter.mkdir(sanitizedBasePath);
    }
    await vault.adapter.writeBinary(targetPath, arrayBuffer);
    return targetPath;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function pick(obj, propTransformers) {
  const entries = Object.entries(propTransformers).map(([key, transformer]) => {
    const value = (
      {
        string: () => obj[transformer],
        function: () => transformer(obj[key], obj, key),
      }[typeof transformer] ?? (() => obj[key])
    )();

    return [key, value];
  });

  return Object.fromEntries(entries);
}

function formatTitleForSuggestion({ title, released, platforms = [] }) {
  const platformsStr = ` [${platforms.join(', ')}]`;
  const releaseYear = getReleaseYear(released);
  return `${title}${
    typeof releaseYear === 'number' ? ` (${releaseYear})` : ''
  }${platforms.length > 0 ? platformsStr : ''}`;
}

function formatList(list, linkify = true) {
  if (list.length === 0 || list[0] === 'N/A') {
    return ' ';
  }
  const decorate = (s) =>
    linkify
      ? `'[[${escapeSingleQuotedYamlString(sanitizeFilename(s.trim()))}]]'`
      : `'${escapeSingleQuotedYamlString(s.trim())}'`;

  return `\n${list.map((item) => `  - ${decorate(item)}`).join('\n')}`;
}

function sanitizeFilename(string) {
  return string.replace(/[\\,#%&{}/*<>$":@.|^[]]*/g, '');
}

function escapeSingleQuotedYamlString(s) {
  return s.replaceAll("'", "''");
}

async function getGames(query) {
  const res = await request({
    url: API_URL,
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
    },
    // https://api.vndb.org/kana#post-vn
    body: JSON.stringify({
      filters: ['search', '=', query],
      fields:
        'title, aliases, tags.name, released, platforms, description, developers.name, image.url',
    }),
  });

  return JSON.parse(res);
}
