import { defaultLearningLevel, lessonDifficulty } from "@/lib/learning-levels";
import type { ChoiceQuestion, CourseDraft, Lesson, Skill, StorySentence, Word } from "@/lib/types";

function splitLine(line: string) {
  return line.split("|").map((part) => part.trim());
}

function parseOptions(value = "") {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseSentences(text = ""): StorySentence[] {
  return text.split("\n").map((line) => {
    const [en, zh, image] = splitLine(line);
    return en ? { en, zh: zh || "", image: image || "📘" } : null;
  }).filter(Boolean) as StorySentence[];
}

function parseWords(text = ""): Word[] {
  return text.split("\n").map((line) => {
    const [word, meaning, part, image, example, translation, level, imageUrl] = splitLine(line);
    return word ? {
      word,
      meaning: meaning || "",
      part: part || "noun",
      image: image || "📘",
      imageUrl: imageUrl || undefined,
      example: example || `I see ${word}.`,
      translation: translation || "",
      level: level || "Level 1"
    } : null;
  }).filter(Boolean) as Word[];
}

function parseChoiceQuestions(text = "", skill: Skill): ChoiceQuestion[] {
  return text.split("\n").map((line, index) => {
    const [prompt, answer, optionsText, audio] = splitLine(line);
    const options = parseOptions(optionsText);
    return prompt ? {
      id: `${skill}-${index + 1}`,
      skill,
      type: "choice",
      prompt,
      answer: answer || options[0] || "",
      options: options.length ? options : [answer || "Answer", "Option 2", "Option 3"],
      audio: audio || undefined
    } : null;
  }).filter(Boolean) as ChoiceQuestion[];
}

function asNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function courseDraftToLesson(draft: CourseDraft): Lesson {
  const content = draft.content || {};
  const sentences = parseSentences(String(content.sentencesText || ""));
  const words = parseWords(String(content.wordsText || ""));
  const listen = parseChoiceQuestions(String(content.listenText || ""), "listen");
  const read = parseChoiceQuestions(String(content.readText || ""), "read");
  const speak = String(content.speakText || "").split("\n").map((line, index) => {
    const [prompt, target] = splitLine(line);
    return target ? { id: `speak-${index + 1}`, prompt: prompt || "跟讀", target } : null;
  }).filter(Boolean) as Lesson["speak"];
  const write = String(content.writeText || "").split("\n").map((line, index) => {
    const [prompt, starter, answerHint] = splitLine(line);
    return starter ? { id: `write-${index + 1}`, prompt: prompt || "完成句子", starter, answerHint: answerHint || "" } : null;
  }).filter(Boolean) as Lesson["write"];

  return {
    id: draft.id,
    title: draft.title,
    topic: draft.topic,
    level: draft.level,
    difficulty: defaultLearningLevel(String(content.difficulty || lessonDifficulty({ level: draft.level }))),
    cover: draft.cover,
    pattern: draft.pattern,
    sentences: sentences.length ? sentences : [{ en: draft.pattern.replace("____", "word"), zh: "", image: draft.cover }],
    words,
    listen: listen.length ? listen : buildListeningQuestions(words, draft.id),
    read: read.length ? read : buildReadingQuestions(sentences, words, draft.id),
    speak,
    write,
    sortOrder: asNumber(content.sortOrder, 999000),
    unlockMode: String(content.unlockMode || "previous") as Lesson["unlockMode"],
    prerequisiteLessonId: String(content.prerequisiteLessonId || "")
  };
}

function buildListeningQuestions(words: Word[], lessonId: string): ChoiceQuestion[] {
  return words.slice(0, 5).map((word, index) => {
    const distractors = words.filter((item) => item.word !== word.word).slice(0, 3).map((item) => item.meaning);
    return {
      id: `${lessonId}-auto-listen-${index + 1}`,
      skill: "listen",
      type: "choice",
      prompt: `聽單字，選出意思：${word.word}`,
      answer: word.meaning,
      options: rotateOptions([word.meaning, ...distractors].filter(Boolean), index),
      audio: word.word
    };
  });
}

function buildReadingQuestions(sentences: StorySentence[], words: Word[], lessonId: string): ChoiceQuestion[] {
  const firstWord = words[0];
  const secondWord = words[1] || firstWord;
  const firstSentence = sentences[0];
  const secondSentence = sentences[1] || firstSentence;
  const questions: ChoiceQuestion[] = [];
  if (firstWord) {
    questions.push({
      id: `${lessonId}-auto-read-1`,
      skill: "read",
      type: "choice",
      prompt: `Which word means「${firstWord.meaning}」?`,
      answer: firstWord.word,
      options: rotateOptions(words.slice(0, 4).map((item) => item.word), 1)
    });
  }
  if (secondWord) {
    questions.push({
      id: `${lessonId}-auto-read-2`,
      skill: "read",
      type: "choice",
      prompt: `Choose the sentence with "${secondWord.word}".`,
      answer: secondWord.example,
      options: rotateOptions([secondWord.example, firstSentence?.en || `I see ${secondWord.word}.`, `This is ${secondWord.word}.`, `I like ${secondWord.word}.`], 2)
    });
  }
  if (sentences.length >= 3) {
    questions.push({
      id: `${lessonId}-auto-read-sequence`,
      skill: "read",
      type: "choice",
      prompt: "Which sentence happens first?",
      answer: firstSentence.en,
      options: rotateOptions(sentences.slice(0, 4).map((item) => item.en), 3)
    });
  }
  if (firstWord) {
    questions.push({
      id: `${lessonId}-auto-read-grammar`,
      skill: "read",
      type: "choice",
      prompt: "Choose the correct grammar sentence.",
      answer: `${firstWord.word} is important.`,
      options: rotateOptions([`${firstWord.word} is important.`, `${firstWord.word} are important.`, `${firstWord.word} am important.`, `${firstWord.word} be important.`], 1)
    });
  }
  return questions;
}

function rotateOptions(options: string[], amount: number) {
  const clean = Array.from(new Set(options.filter(Boolean)));
  if (!clean.length) return clean;
  const offset = amount % clean.length;
  return [...clean.slice(offset), ...clean.slice(0, offset)];
}

export function mergePublishedLessons(baseLessons: Lesson[], drafts: CourseDraft[]) {
  const map = new Map<string, Lesson>(baseLessons.map((lesson, index) => [lesson.id, {
    ...lesson,
    difficulty: lesson.difficulty || lessonDifficulty(lesson),
    sortOrder: lesson.sortOrder ?? (index + 1) * 1000,
    unlockMode: lesson.unlockMode ?? (index === 0 ? "open" : "previous")
  }]));
  drafts.filter((draft) => draft.status === "published").forEach((draft) => {
    const baseLesson = map.get(draft.id);
    const lesson = courseDraftToLesson(draft);
    const content = draft.content || {};
    const hasCustomSortOrder = Number.isFinite(Number(content.sortOrder)) && Number(content.sortOrder) < 900000;
    map.set(draft.id, {
      ...lesson,
      sortOrder: hasCustomSortOrder ? lesson.sortOrder : baseLesson?.sortOrder ?? lesson.sortOrder,
      unlockMode: lesson.unlockMode || baseLesson?.unlockMode,
      prerequisiteLessonId: lesson.prerequisiteLessonId || baseLesson?.prerequisiteLessonId
    });
  });
  return Array.from(map.values()).sort((a, b) => (a.sortOrder || 999000) - (b.sortOrder || 999000));
}
