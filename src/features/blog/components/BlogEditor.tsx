"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useTeacherBlogPost } from "../hooks/useTeacherBlogs";
import EditorForm from "./blogEditor/EditorForm";

/** Loads the post (edit mode) and hands it to the form. New posts render the form directly. */
export default function BlogEditor({ postId }: { postId?: string }) {
  const { post, loading, error } = useTeacherBlogPost(postId);

  if (postId && loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="size-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (postId && (error || !post)) {
    return (
      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100">
          {error || "Blog post not found."}
        </div>
        <Link href="/teacher/blogs" className="mt-4 inline-block text-sm font-semibold text-violet-700">
          ← Back to your posts
        </Link>
      </div>
    );
  }

  return <EditorForm key={post?.id ?? "new"} initial={post} />;
}
