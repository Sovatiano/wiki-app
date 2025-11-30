import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGetPagesQuery, useGetPopularPagesQuery } from '../../services/api';
import { RootState } from '../../app/store';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import './Sidebar.css';

interface PageNode {
  id: number;
  title: string;
  children?: PageNode[];
}

const PageTreeItem: React.FC<{ page: PageNode; level?: number; onPageClick: (id: number) => void }> = ({
  page,
  level = 0,
  onPageClick,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="tree-item">
      <div
        className="tree-node"
        style={{ paddingLeft: `${level * 1.5}rem` }}
        onClick={() => onPageClick(page.id)}
      >
        {page.children && page.children.length > 0 && (
          <button
            className="tree-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? '−' : '+'}
          </button>
        )}
        <span className="tree-title">{page.title}</span>
      </div>
      {expanded && page.children && page.children.length > 0 && (
        <div className="tree-children">
          {page.children.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              level={level + 1}
              onPageClick={onPageClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper to manage recently visited pages in localStorage
const getRecentPages = (): number[] => {
  try {
    const recent = localStorage.getItem('recentPages');
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

const addRecentPage = (pageId: number) => {
  try {
    let recent = getRecentPages();
    // Remove if already exists
    recent = recent.filter((id: number) => id !== pageId);
    // Add to beginning
    recent.unshift(pageId);
    // Keep only last 5
    recent = recent.slice(0, 5);
    localStorage.setItem('recentPages', JSON.stringify(recent));
  } catch {
    // Ignore errors
  }
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: pagesTree, isLoading: isLoadingTree } = useGetPagesQuery();
  const { data: popularPages, isLoading: isLoadingPopular } = useGetPopularPagesQuery();
  
  const [recentPageIds, setRecentPageIds] = useState<number[]>([]);
  const [recentPages, setRecentPages] = useState<any[]>([]);

  // Track page visits
  useEffect(() => {
    const pageIdMatch = location.pathname.match(/\/page\/(\d+)/);
    if (pageIdMatch) {
      const pageId = parseInt(pageIdMatch[1]);
      addRecentPage(pageId);
      setRecentPageIds(getRecentPages());
    }
  }, [location]);

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

  const handleCreatePage = () => {
    navigate('/page/new');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Pages</h3>
        {user && (
          <Button variant="primary" size="small" onClick={handleCreatePage}>
            New
          </Button>
        )}
      </div>

      <div className="sidebar-content">
        {isLoadingTree ? (
          <div className="sidebar-loading">
            <Spinner size="small" />
          </div>
        ) : (
          <>
            {user && recentPages.length > 0 && (
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Recently Visited</h4>
                <div className="sidebar-pages-list">
                  {recentPages.map((page: any) => (
                    <div
                      key={page.id}
                      className="sidebar-page-item"
                      onClick={() => handlePageClick(page.id)}
                    >
                      <span className="page-title">{page.title}</span>
                      {page.like_count > 0 && (
                        <span className="page-likes">❤️ {page.like_count}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user && isLoadingPopular ? (
              <div className="sidebar-loading">
                <Spinner size="small" />
              </div>
            ) : user && popularPages && popularPages.length > 0 && (
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Most Popular</h4>
                <div className="sidebar-pages-list">
                  {popularPages.map((page: any) => (
                    <div
                      key={page.id}
                      className="sidebar-page-item"
                      onClick={() => handlePageClick(page.id)}
                    >
                      <span className="page-title">{page.title}</span>
                      {page.like_count > 0 && (
                        <span className="page-likes">❤️ {page.like_count}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!user && pagesTree && pagesTree.length > 0 && (
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">All Pages</h4>
                <div className="tree-container">
                  {pagesTree.map((page: PageNode) => (
                    <PageTreeItem
                      key={page.id}
                      page={page}
                      onPageClick={handlePageClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {user && (!recentPages || recentPages.length === 0) && (!popularPages || popularPages.length === 0) ? (
              <div className="no-pages">No pages yet</div>
            ) : null}
            
            {!user && (!pagesTree || pagesTree.length === 0) ? (
              <div className="no-pages">No pages yet</div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;