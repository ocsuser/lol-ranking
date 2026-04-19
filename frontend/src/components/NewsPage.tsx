import { useEffect, useState } from 'react';
import { useLang } from '../i18n';

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
  const { t } = useLang();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  function loadArticles() {
    return fetch('/news.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.articles) setArticles(d.articles); })
      .catch(() => {});
  }

  useEffect(() => { loadArticles().finally(() => setLoading(false)); }, []);

  function handleRefresh() {
    setSpinning(true);
    loadArticles().finally(() => setTimeout(() => setSpinning(false), 400));
  }

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
          {t.articlesCount(articles.length)}
        </span>
        <button onClick={handleRefresh} className="news-refresh-btn" disabled={spinning}>
          <svg
            width="11" height="11" viewBox="0 0 12 12" fill="none"
            style={{ transition: 'transform 400ms ease', transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)' }}
          >
            <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5a4.47 4.47 0 0 1 3 1.15V1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {t.refreshLabel}
        </button>
      </div>

      {loading ? (
        <div className="skeleton-table">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row" style={{ height: 100, opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="state-center">
          <div className="state-center__sub">{t.noArticles}</div>
        </div>
      ) : (
        <div className="news-articles-list">
          {articles.map(a => <ArticleCard key={a.link} article={a} />)}
        </div>
      )}
    </>
  );
}
