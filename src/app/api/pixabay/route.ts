import { NextResponse } from "next/server";

type PixabayHit = {
  id: number;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  pageURL: string;
  user: string;
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PIXABAY_API_KEY is not configured" },
      { status: 501 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  if (!query) {
    return NextResponse.json({ images: [] });
  }

  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "illustration");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("per_page", "12");
  url.searchParams.set("lang", "en");

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText }, { status: response.status });
  }

  const data = await response.json();
  const images = ((data.hits || []) as PixabayHit[]).map((hit) => ({
    id: hit.id,
    tags: hit.tags,
    previewUrl: hit.previewURL,
    imageUrl: hit.largeImageURL || hit.webformatURL,
    pageUrl: hit.pageURL,
    user: hit.user
  }));

  return NextResponse.json({ images });
}
