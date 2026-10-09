import { notFound } from "next/navigation";
import type { Metadata } from "next";

import CatalogCategoryPage from "@/features/landing/catalog/CatalogCategoryPage";
import { catalogMetadata } from "@/features/landing/catalog/metadata";
import { getCatalogPage } from "@/features/landing/catalog/pages";

// Public page: rebuilt at most every 5 minutes (new/approved classes show up without a deploy).
export const revalidate = 300;

type Params = Promise<{ slug: string }>;

function resolve(slug: string) {
  return getCatalogPage("grade", slug);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = resolve((await params).slug);
  return page ? catalogMetadata(page) : {};
}

export default async function Page({ params }: { params: Params }) {
  const page = resolve((await params).slug);
  if (!page) notFound();
  return <CatalogCategoryPage page={page} />;
}
