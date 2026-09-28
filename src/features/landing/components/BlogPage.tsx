import CloseCta from "./CloseCta";
import LandingFooter from "./LandingFooter";
import LandingHeader from "./LandingHeader";
import PostCard from "./PostCard";
import { BLOG_POSTS } from "../blogPosts";
import "../styles/landing.css";

/** Public blog listing ("/blog"). Fully static, rendered on the server. */
export default function BlogPage() {
  return (
    <div className="lh">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <LandingHeader />

      <main id="main">
        <section className="pagehead">
          <div className="wrap">
            <h1>Brain bites</h1>
            <p className="lede">
              Guides for parents on study habits, exam preparation and choosing
              the right classes for your child.
            </p>
          </div>
        </section>

        <section className="blogindex">
          <div className="wrap">
            <div className="bgrid">
              {BLOG_POSTS.map((post, i) => (
                <PostCard key={post.slug} post={post} index={i} showExcerpt />
              ))}
            </div>
          </div>
        </section>

        <CloseCta />
      </main>

      <LandingFooter />
    </div>
  );
}
