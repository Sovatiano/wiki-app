import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useGetPagesQuery, useGetPopularPagesQuery } from '../../services/api';
import { RootState } from '../../app/store';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import './HomePage.css';

// Helper to manage recently visited pages in localStorage
const getRecentPages = (): number[] => {
  try {
    const recent = localStorage.getItem('recentPages');
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: pagesTree, isLoading: isLoadingTree } = useGetPagesQuery();
  const { data: popularPages, isLoading: isLoadingPopular } = useGetPopularPagesQuery(undefined, {
    skip: !user,
  });
  
  const [recentPageIds] = useState<number[]>(getRecentPages());
  const [recentPages, setRecentPages] = useState<any[]>([]);

  // Load recent pages data
  useEffect(() => {
    if (pagesTree && recentPageIds.length > 0) {
      const findPageInTree = (tree: any[], targetId: number): any | null => {
        for (const node of tree) {
          if (node.id === targetId) return node;
          if (node.children && node.children.length > 0) {
            const found = findPageInTree(node.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const recent = recentPageIds
        .map((id) => findPageInTree(pagesTree, id))
        .filter((page) => page !== null)
        .slice(0, 5);
      
      setRecentPages(recent);
    }
  }, [pagesTree, recentPageIds]);

  const handlePageClick = (pageId: number) => {
    navigate(`/page/${pageId}`);
  };

  if (isLoadingTree) {
    return (
      <div className="home-page">
        <div className="loading"><Spinner size="large" />Loading...</div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Welcome to WikiApp</h1>
        {user && (
          <Button variant="primary" onClick={() => navigate('/page/new')}>
            Create New Page
          </Button>
        )}
      </div>

      {user && (
        <>
          {recentPages.length > 0 && (
            <div className="home-section">
              <h2>Recently Visited</h2>
              <div className="pages-grid">
                {recentPages.map((page: any) => (
                  <div
                    key={page.id}
                    className="page-card"
                    onClick={() => handlePageClick(page.id)}
                  >
                    <h3>{page.title}</h3>
                    <p className="page-meta">
                      By {page.author?.username || 'Unknown'} • {new Date(page.created_at).toLocaleDateString()}
                    </p>
                    {page.like_count > 0 && (
                      <div className="page-likes-badge">❤️ {page.like_count}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoadingPopular ? (
            <div className="home-section">
              <div className="loading"><Spinner size="medium" />Loading popular pages...</div>
            </div>
          ) : popularPages && popularPages.length > 0 && (
            <div className="home-section">
              <h2>Most Popular</h2>
              <div className="pages-grid">
                {popularPages.map((page: any) => (
                  <div
                    key={page.id}
                    className="page-card"
                    onClick={() => handlePageClick(page.id)}
                  >
                    <h3>{page.title}</h3>
                    <p className="page-meta">
                      By {page.author?.username || 'Unknown'} • {new Date(page.created_at).toLocaleDateString()}
                    </p>
                    {page.like_count > 0 && (
                      <div className="page-likes-badge">❤️ {page.like_count}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!user && pagesTree && pagesTree.length > 0 && (
        <div className="home-section">
          <h2>Public Pages</h2>
          <div className="pages-grid">
            {pagesTree.map((page: any) => (
              <div
                key={page.id}
                className="page-card"
                onClick={() => handlePageClick(page.id)}
              >
                <h3>{page.title}</h3>
                <p className="page-meta">
                  By {page.author?.username || 'Unknown'} • {new Date(page.created_at).toLocaleDateString()}
                </p>
                {page.like_count > 0 && (
                  <div className="page-likes-badge">❤️ {page.like_count}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(!pagesTree || pagesTree.length === 0) && (!user || (recentPages.length === 0 && (!popularPages || popularPages.length === 0))) && (
        <div className="home-empty">
          <h2>No pages yet</h2>
          {user && (
            <Button variant="primary" onClick={() => navigate('/page/new')}>
              Create Your First Page
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default HomePage;

