import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGetPagesQuery, useGetPageQuery } from '../../services/api';
import { RootState } from '../../app/store';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import './Sidebar.css';

interface PageNode {
  id: number;
  title: string;
  children?: PageNode[];
  like_count?: number;
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
        {(page.like_count !== undefined && page.like_count > 0) && (
          <span className="tree-likes">❤️ {page.like_count}</span>
        )}
      </div>
      {expanded && page.children && page.children.length > 0 && (
        <div className="tree-children">
          {[...page.children]
            .sort((a: PageNode, b: PageNode) => {
              const aLikes = a.like_count || 0;
              const bLikes = b.like_count || 0;
              return bLikes - aLikes; // Sort by likes descending
            })
            .map((child) => (
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

// Component to load and display a recent page
const RecentPageItem: React.FC<{ pageId: number; onPageClick: (id: number) => void }> = ({ pageId, onPageClick }) => {
  const { data: page, isLoading } = useGetPageQuery(pageId, { skip: !pageId });
  
  if (isLoading) {
    return <div className="sidebar-page-item">Loading...</div>;
  }
  
  if (!page) {
    return null;
  }
  
  return (
    <div
      className="sidebar-page-item"
      onClick={() => onPageClick(pageId)}
    >
      <span className="page-title">{page.title}</span>
    </div>
  );
};

// Helper to manage recently visited pages in localStorage (per user)
const getRecentPagesKey = (userId: number | string | null): string => {
  if (!userId) return 'recentPages_guest';
  return `recentPages_${userId}`;
};

const getRecentPages = (userId: number | string | null): number[] => {
  try {
    const key = getRecentPagesKey(userId);
    const recent = localStorage.getItem(key);
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

const addRecentPage = (pageId: number, userId: number | string | null) => {
  try {
    if (!userId) return; // Don't track for guests
    const key = getRecentPagesKey(userId);
    let recent = getRecentPages(userId);
    // Remove if already exists
    recent = recent.filter((id: number) => id !== pageId);
    // Add to beginning
    recent.unshift(pageId);
    // Keep only last 5
    recent = recent.slice(0, 5);
    localStorage.setItem(key, JSON.stringify(recent));
  } catch {
    // Ignore errors
  }
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: pagesTree, isLoading: isLoadingTree } = useGetPagesQuery();
  
  const [recentPageIds, setRecentPageIds] = useState<number[]>([]);
  const [recentPages, setRecentPages] = useState<any[]>([]);

  // Load recent pages for current user
  useEffect(() => {
    if (user) {
      const recent = getRecentPages(user.id);
      setRecentPageIds(recent);
    } else {
      setRecentPageIds([]);
    }
  }, [user]);

  // Track page visits
  useEffect(() => {
    if (!user) return; // Don't track for guests
    const pageIdMatch = location.pathname.match(/\/page\/(\d+)/);
    if (pageIdMatch) {
      const pageId = parseInt(pageIdMatch[1]);
      addRecentPage(pageId, user.id);
      setRecentPageIds(getRecentPages(user.id));
    }
  }, [location, user]);

  // Store recent page IDs - pages will be loaded by RecentPageItem components
  useEffect(() => {
    setRecentPages(recentPageIds.slice(0, 5).map(id => ({ id })));
  }, [recentPageIds]);

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
                    <RecentPageItem key={page.id} pageId={page.id} onPageClick={handlePageClick} />
                  ))}
                </div>
              </div>
            )}

            {pagesTree && pagesTree.length > 0 && (
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">All Pages</h4>
                <div className="tree-container">
                  {[...pagesTree]
                    .sort((a: PageNode, b: PageNode) => {
                      const aLikes = a.like_count || 0;
                      const bLikes = b.like_count || 0;
                      return bLikes - aLikes; // Sort by likes descending
                    })
                    .map((page: PageNode) => (
                      <PageTreeItem
                        key={page.id}
                        page={page}
                        onPageClick={handlePageClick}
                      />
                    ))}
                </div>
              </div>
            )}

            {(!pagesTree || pagesTree.length === 0) && (
              <div className="no-pages">No pages yet</div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;