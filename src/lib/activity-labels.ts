export interface ActivityLike {
  activity_type: string;
  page_path: string | null;
  details: Record<string, unknown> | null;
}

const SECTION_LABELS: Record<string, string> = {
  math: "Математика",
  alphabet: "Азбука",
  intellect: "Интеллект",
  world: "Мир вокруг",
  creativity: "Творчество",
  home: "Виртуальный дом",
};

const PATH_LABELS: Record<string, string> = {
  "/": "Главная",
  "/math": "Математика",
  "/alphabet": "Азбука",
  "/world": "Мир вокруг",
  "/creativity": "Творчество",
  "/home": "Виртуальный дом",
  "/intellect": "Интеллект",
  "/parent": "Родительский кабинет",
  "/settings": "Настройки",
  "/join": "Подключение ребёнка",
  "/auth": "Вход",
};

const TOPIC_LABELS: Record<string, string> = {
  animals: "Животные",
  nature: "Природа",
  transport: "Транспорт",
  food: "Еда",
  professions: "Профессии",
  seasons: "Времена года",
};

const EXERCISE_LABELS: Record<string, string> = {
  counting: "счёт",
  shapes: "фигуры",
  sort: "сортировка",
  compare: "сравнение",
  "3dshapes": "объёмные фигуры",
  patterns: "закономерности",
};

const INTELLECT_MODE_LABELS: Record<string, string> = {
  odd: "«Найди лишнее»",
  sequence: "«Продолжи ряд»",
  memory: "«Найди пару»",
};

const ALPHABET_MODE_LABELS: Record<string, string> = {
  learn: "изучение букв",
  quiz: "проверка знаний",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  answer_correct: "Правильный ответ",
  answer_wrong: "Неправильный ответ",
  page_view: "Открыл раздел",
  click: "Нажал",
  select_level: "Выбрал уровень",
  start_learning: "Начал занятие",
};

const asString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
};

export const getSectionLabel = (section: unknown): string | null => {
  const key = asString(section);
  if (!key) return null;
  return SECTION_LABELS[key] || null;
};

export const getPathLabel = (path: string | null | undefined): string => {
  if (!path) return "";
  if (PATH_LABELS[path]) return PATH_LABELS[path];

  const gameMatch = path.match(/^\/games\/(.+)$/);
  if (gameMatch) return `Игра «${gameMatch[1]}»`;

  return path;
};

export const getActivityTypeLabel = (type: string): string =>
  ACTIVITY_TYPE_LABELS[type] || type.replace(/_/g, " ");

const formatLevel = (level: unknown): string | null => {
  const n = asNumber(level);
  return n === null ? null : `уровень ${n}`;
};

const formatSectionContext = (details: Record<string, unknown>): string | null => {
  const section = getSectionLabel(details.section);
  const level = formatLevel(details.level);
  if (section && level) return `${section}, ${level}`;
  if (section) return section;
  if (level) return level.charAt(0).toUpperCase() + level.slice(1);
  return null;
};

const formatAnswerDetails = (
  details: Record<string, unknown>,
  isCorrect: boolean
): string => {
  const parts: string[] = [];

  const sectionContext = formatSectionContext(details);
  if (sectionContext) parts.push(sectionContext);

  const exercise = asString(details.exercise);
  if (exercise) {
    const exerciseLabel = EXERCISE_LABELS[exercise] || exercise;
    parts.push(`задание: ${exerciseLabel}`);
  }

  const mode = asString(details.mode);
  if (mode) {
    const modeLabel =
      INTELLECT_MODE_LABELS[mode] ||
      ALPHABET_MODE_LABELS[mode] ||
      mode;
    parts.push(modeLabel);
  }

  const letter = asString(details.letter);
  if (letter) parts.push(`буква «${letter}»`);

  const topic = asString(details.topic);
  if (topic) {
    const topicLabel = TOPIC_LABELS[topic] || topic;
    parts.push(`тема «${topicLabel}»`);
  }

  const item = asString(details.item);
  if (item) parts.push(`ответ: «${item}»`);

  const answer = details.answer;
  if (answer !== undefined && answer !== null) {
    parts.push(`ответ: ${asString(answer) ?? String(answer)}`);
  }

  const shape = asString(details.shape);
  if (shape) parts.push(`фигура: ${shape}`);

  if (!isCorrect) {
    const correct = details.correct ?? details.expected;
    if (correct !== undefined && correct !== null) {
      parts.push(`верно было: ${asString(correct) ?? String(correct)}`);
    }
    const got = asString(details.got ?? details.selected);
    if (got) parts.push(`выбрал: «${got}»`);
  }

  return parts.join(" · ");
};

const formatPageViewDetails = (details: Record<string, unknown>): string => {
  const path = asString(details.path);
  if (path) return getPathLabel(path);
  return "";
};

const formatSelectLevelDetails = (details: Record<string, unknown>): string => {
  const section = getSectionLabel(details.section) || "раздел";
  const level = asNumber(details.level);
  if (level !== null) return `${section}, уровень ${level}`;
  return section;
};

const formatStartLearningDetails = (details: Record<string, unknown>): string => {
  const section = getSectionLabel(details.section) || "раздел";
  const mode = asString(details.mode);
  if (mode) {
    const modeLabel = ALPHABET_MODE_LABELS[mode] || mode;
    return `${section}: ${modeLabel}`;
  }
  return section;
};

const formatClickDetails = (details: Record<string, unknown>): string => {
  const element = asString(details.element);
  return element ? `элемент «${element}»` : "";
};

export const formatActivityDescription = (activity: ActivityLike): string => {
  const details = activity.details ?? {};
  const type = activity.activity_type;

  switch (type) {
    case "answer_correct":
    case "answer_wrong": {
      const text = formatAnswerDetails(details, type === "answer_correct");
      if (text) return text;
      break;
    }
    case "page_view": {
      const fromDetails = formatPageViewDetails(details);
      if (fromDetails) return fromDetails;
      if (activity.page_path) return getPathLabel(activity.page_path);
      break;
    }
    case "select_level": {
      const text = formatSelectLevelDetails(details);
      if (text) return text;
      break;
    }
    case "start_learning": {
      const text = formatStartLearningDetails(details);
      if (text) return text;
      break;
    }
    case "click": {
      const text = formatClickDetails(details);
      if (text) return text;
      break;
    }
    default:
      break;
  }

  const location = activity.page_path ? getPathLabel(activity.page_path) : "";
  const section = getSectionLabel(details.section);
  const level = formatLevel(details.level);

  const fallback: string[] = [];
  if (section) fallback.push(section);
  if (level) fallback.push(level);
  if (location && !fallback.includes(location)) fallback.push(location);

  return fallback.join(" · ");
};

export const getActivityLocationLabel = (activity: ActivityLike): string | null => {
  const path = activity.page_path || asString(activity.details?.path);
  if (!path) return null;
  const label = getPathLabel(path);
  return label || null;
};
