import { NextResponse } from "next/server";

type DialogueMessage = {
  role: "ai" | "student";
  text: string;
};

type DialogueRequest = {
  scenario?: {
    title?: string;
    role?: string;
    level?: string;
    goal?: string;
    setting?: string;
  };
  messages?: DialogueMessage[];
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 501 });
  }

  const body = (await request.json()) as DialogueRequest;
  const scenario = body.scenario || {};
  const messages = (body.messages || []).slice(-12);
  const transcript = messages
    .map((message) => `${message.role === "ai" ? "AI" : "Student"}: ${message.text}`)
    .join("\n");

  const systemPrompt = [
    "You are an intelligent, warm English speaking partner for primary school students aged 7-12.",
    "Stay in the role and scenario. Reply naturally to what the student says, not from a fixed script.",
    "Use simple English. Keep each reply to 1-3 short sentences.",
    "If the student's English is unclear, infer the likely meaning and gently continue.",
    "If the student makes a mistake, model the correct phrase naturally. Do not give long grammar lectures.",
    "Occasionally ask one helpful follow-up question to keep the conversation going.",
    `Scenario title: ${scenario.title || "English conversation"}`,
    `AI role: ${scenario.role || "conversation partner"}`,
    `Student level: ${scenario.level || "beginner"}`,
    `Goal: ${scenario.goal || "practice useful English"}`,
    `Setting: ${scenario.setting || "a friendly real-life situation"}`
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript || "Start the conversation." }
      ],
      max_output_tokens: 120
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText }, { status: response.status });
  }

  const data = await response.json();
  const reply =
    data.output_text ||
    data.output?.flatMap((item: any) => item.content || [])
      ?.map((content: any) => content.text)
      ?.filter(Boolean)
      ?.join(" ")
      ?.trim();

  return NextResponse.json({
    reply: reply || "Can you tell me more?"
  });
}
