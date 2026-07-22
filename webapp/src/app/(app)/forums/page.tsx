"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/session";
import { timeAgo } from "@/lib/timeAgo";

// ---------------------------------------------------------------------------
// Types — shaped from live `forum_categories` + `forum_threads` queries
// ---------------------------------------------------------------------------
type CategoryWithStats = {
  id: string;
  title: string;
  description: string;
  icon: string;
  topicCount: number;
  latestThread?: { id: string; title: string; createdAt: string };
};

type FilterChip = "all" | "popular" | "following";

const CHIPS: { value: FilterChip; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "following", label: "Following" },
  { value: "popular", label: "Popular" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ForumsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { session } = useSession();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterChip>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryWithStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setError(null);
      let query = supabase
        .from("forum_categories")
        .select("id, title, description, icon, forum_threads(count)");

      const q = search.trim();
      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data, error } = await query.order("title");
      if (!active) return;
      if (error) {
        setError(error.message);
        setCategories([]);
        return;
      }

      const { data: threads } = await supabase
        .from("forum_threads")
        .select("id, title, category_id, created_at")
        .order("created_at", { ascending: false });

      const latestByCategory = new Map<string, { id: string; title: string; createdAt: string }>();
      for (const t of threads ?? []) {
        if (!latestByCategory.has(t.category_id)) {
          latestByCategory.set(t.category_id, { id: t.id, title: t.title, createdAt: t.created_at });
        }
      }

      const mapped: CategoryWithStats[] = (data ?? []).map(
        (c: {
          id: string;
          title: string;
          description: string;
          icon: string;
          forum_threads: { count: number }[];
        }) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          icon: c.icon,
          topicCount: c.forum_threads?.[0]?.count ?? 0,
          latestThread: latestByCategory.get(c.id),
        }),
      );

      setCategories(mapped);
    })();

    return () => {
      active = false;
    };
  }, [supabase, search]);

  const displayed = useMemo(() => {
    if (!categories) return [];
    if (filter === "popular") return [...categories].sort((a, b) => b.topicCount - a.topicCount);
    return categories;
  }, [categories, filter]);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-margin-mobile py-stack-lg md:px-margin-desktop">

      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <header className="mb-stack-lg flex flex-col gap-stack-md border-b border-outline-variant pb-stack-md md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">
            Community Forums
          </h1>
          <p className="mt-1 font-body-lg text-body-lg text-on-surface-variant">
            Connect, discuss, and build peace together.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setModalOpen(true)}
          className="shrink-0 gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Topic
        </Button>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Controls: search + filter chips                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-stack-lg flex flex-col gap-stack-md rounded-lg border border-outline-variant bg-surface-container-lowest p-stack-md md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1 md:max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            id="forums-search"
            type="text"
            placeholder="Search forums or topics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-outline-variant bg-white py-2 pl-10 pr-4 font-body-md text-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-stack-sm overflow-x-auto pb-1 md:pb-0">
          {CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilter(chip.value)}
              className={`whitespace-nowrap rounded-full border-2 px-4 py-2 font-label-bold text-label-bold transition-colors ${
                filter === chip.value
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-white text-primary hover:border-primary"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Category grid                                                       */}
      {/* ------------------------------------------------------------------ */}
      {categories === null ? (
        <p className="py-20 text-center font-body-md text-body-md text-on-surface-variant">
          Loading forums…
        </p>
      ) : error ? (
        <p className="py-20 text-center font-body-md text-body-md text-error">{error}</p>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline">
            search_off
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            No categories match &ldquo;{search}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="font-label-bold text-label-bold text-primary underline underline-offset-2"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
          {displayed.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* New Topic modal                                                     */}
      {/* ------------------------------------------------------------------ */}
      {modalOpen && session && (
        <NewTopicModal
          categories={categories ?? []}
          authorId={session.id}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryCard
// ---------------------------------------------------------------------------
function CategoryCard({ category }: { category: CategoryWithStats }) {
  const threadHref = category.latestThread
    ? `/forums/${category.id}/${category.latestThread.id}`
    : `/forums/${category.id}`;

  return (
    <article className="group flex h-full flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-stack-md transition-all duration-200 hover:border-primary hover:shadow-sm">
      {/* Top row: icon + topic count */}
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-lg bg-surface-container-low p-3 text-primary">
          <span className="material-symbols-outlined text-3xl">
            {category.icon}
          </span>
        </div>
        <span className="rounded-md bg-surface-container-high px-2 py-1 font-caption text-caption text-on-surface-variant">
          {category.topicCount.toLocaleString()} Topics
        </span>
      </div>

      {/* Title + description */}
      <Link
        href={`/forums/${category.id}`}
        className="mb-2 font-headline-md text-headline-md text-primary transition-colors group-hover:text-surface-tint"
      >
        {category.title}
      </Link>
      <p className="mb-6 flex-1 font-body-md text-body-md text-on-surface-variant">
        {category.description}
      </p>

      {/* Footer: latest thread */}
      <div className="mt-auto border-t border-outline-variant pt-4">
        {category.latestThread ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-label-bold text-label-bold text-on-surface-variant">
                Latest:
              </span>
              <span className="font-caption text-caption text-outline">
                {timeAgo(category.latestThread.createdAt)}
              </span>
            </div>
            <Link
              href={threadHref}
              className="block font-body-md text-body-md text-primary hover:underline"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {category.latestThread.title}
            </Link>
          </>
        ) : (
          <span className="font-caption text-caption text-on-surface-variant">
            No topics yet — be the first to post!
          </span>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// NewTopicModal
// ---------------------------------------------------------------------------
function NewTopicModal({
  categories,
  authorId,
  onClose,
}: {
  categories: CategoryWithStats[];
  authorId: string;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length >= 5 && body.trim().length >= 10 && categoryId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const { data: thread, error: threadError } = await supabase
      .from("forum_threads")
      .insert({ category_id: categoryId, author_id: authorId, title: title.trim() })
      .select("id")
      .single();

    if (threadError || !thread) {
      setError(threadError?.message ?? "Couldn't create the thread.");
      setSubmitting(false);
      return;
    }

    const { error: postError } = await supabase
      .from("forum_posts")
      .insert({ thread_id: thread.id, author_id: authorId, body: body.trim() });

    if (postError) {
      setError(postError.message);
      setSubmitting(false);
      return;
    }

    router.push(`/forums/${categoryId}/${thread.id}`);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-margin-mobile backdrop-blur-sm md:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal card */}
      <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest ambient-shadow">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <h2 className="font-headline-md text-headline-md text-primary">
            New Topic
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md p-6">
          {error && (
            <p className="rounded-lg border-l-4 border-error bg-error-container px-4 py-3 font-caption text-caption text-on-error-container" role="alert">
              {error}
            </p>
          )}

          {/* Category selector */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-topic-category"
              className="font-label-bold text-label-bold text-on-surface"
            >
              Category
            </label>
            <select
              id="new-topic-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-topic-title"
              className="font-label-bold text-label-bold text-on-surface"
            >
              Title
            </label>
            <input
              id="new-topic-title"
              type="text"
              placeholder="What's this topic about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
            />
            {title.trim().length > 0 && title.trim().length < 5 && (
              <p className="font-caption text-caption text-error">
                Title must be at least 5 characters
              </p>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-topic-body"
              className="font-label-bold text-label-bold text-on-surface"
            >
              Content
            </label>
            <textarea
              id="new-topic-body"
              placeholder="Share your thoughts…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="resize-none rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
            />
            {body.trim().length > 0 && body.trim().length < 10 && (
              <p className="font-caption text-caption text-error">
                Content must be at least 10 characters
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-stack-sm pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmit || submitting}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting…" : "Post Topic"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
