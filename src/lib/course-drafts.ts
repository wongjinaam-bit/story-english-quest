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
    const [word, meaning, part, image, example, translation, level] = splitLine(line);
    return word ? {
      word,
      meaning: meaning || "",
      part: part || "noun",
      image: image || "📘",
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
    cover: draft.cover,
    pattern: draft.pattern,
    sentences: sentences.length ? sentences : [{ en: draft.pattern.replace("____", "word"), zh: "", image: draft.cover }],
    words,
    listen,
    read,
    speak,
    write
  };
}

export function mergePublishedLessons(baseLessons: Lesson[], drafts: CourseDraft[]) {
  const map = new Map(baseLessons.map((lesson) => [lesson.id, lesson]));
  drafts.filter((draft) => draft.status === "published").forEach((draft) => {
    map.set(draft.id, courseDraftToLesson(draft));
  });
  return Array.from(map.values());
}
