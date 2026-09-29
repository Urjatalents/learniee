import { ImageResponse } from "next/og";

import { getPublishedPost } from "@/features/blog/server/blogPublic.service";
import { blogCategoryLabel } from "@/features/blog/utils/blogCategories";

// Branded 1200x630 share image generated per post (Facebook/WhatsApp/LinkedIn/X previews).
export const alt = "Learniee blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let title = "The Learniee Blog";
  let label = "Learniee";
  let author = "";

  try {
    const post = await getPublishedPost(slug);

    if (post) {
      title = post.title.length > 110 ? `${post.title.slice(0, 107)}...` : post.title;
      label = blogCategoryLabel(post.category);
      author = post.author.name;
    }
  } catch (err) {
    console.error("Blog OG image failed to load post:", err);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#7B5BE0",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            padding: "8px 22px",
            borderRadius: 999,
            background: "#FFD25E",
            color: "#241848",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          {label}
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.12 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
          <div style={{ display: "flex", fontWeight: 700 }}>Learniee</div>
          <div style={{ display: "flex" }}>{author ? `By ${author}` : ""}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
