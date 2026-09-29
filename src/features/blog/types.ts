/** JSON shapes the blog API returns (dates are ISO strings on the wire). */
export type BlogPostStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";

export interface TeacherBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  readingMinutes: number;
  status: BlogPostStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBlogPost extends TeacherBlogPost {
  teacher: { id: string; firstName: string; lastName: string; visibleName: string | null; email: string };
}

export interface BlogPostFormValues {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
}
