import { useEffect, useState } from 'react';

interface Article {
  title: string;
  link: string;
  author: string;
  pubDate: string;
  description: string;
  image: string | null;
  source: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer" className="news-article">
      {article.image && (
        <div className="news-article__img-wrap">
          <img src={article.image} alt="" className="news-article__img" loading="lazy" />
        </div>
      )}
      <div className="news-article__body">
        <div className="news-article__meta">
          <span className="news-article__source">{article.source}</span>
          <span className="news-article__dot">·</span>
          <span className="news-article__time">{timeAgo(article.pubDate)}</span>
        </div>
        <div className="news-article__title">{article.title}</div>
        {article.description && (
          <div className="news-article__desc">{article.description}</div>
        )}
        <div className="news-article__author">{article.author}</div>
      </div>
    </a>
  );
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/news.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.articles) setArticles(d.articles); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
          {articles.length} articles · Team-AAA
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-body)' }}>
          Run <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>npm run news</code> to refresh
        </span>
      </div>

      {loading ? (
        <div className="skeleton-table">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row" style={{ height: 100, opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="state-center">
          <div className="state-center__sub">No articles — run <code>npm run news</code> to fetch</div>
        </div>
      ) : (
        <div className="news-articles-list">
          {articles.map(a => <ArticleCard key={a.link} article={a} />)}
        </div>
      )}
    </>
  );
}
