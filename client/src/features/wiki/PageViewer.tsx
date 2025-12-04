import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  useGetPageQuery, 
  useGetPagesQuery, 
  useGetCollaboratorsQuery,
  useGetPageLikesQuery,
  useLikePageMutation,
  useUnlikePageMutation
} from '../../services/api';
import { RootState } from '../../app/store';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import './PageViewer.css';

const PageViewer: React.FC = () => {
  const navigate = useNavigate();
  const { pageId } = useParams<{ pageId: string }>();
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Support both numeric ID and slug
  const pageIdOrSlug = pageId || undefined;
  const { data: page, isLoading, error } = useGetPageQuery(pageIdOrSlug!, { skip: !pageIdOrSlug });
  const { data: pagesTree } = useGetPagesQuery();
  const { data: collaborators } = useGetCollaboratorsQuery(pageIdOrSlug!, { skip: !pageIdOrSlug || !user });
  const { data: likesData } = useGetPageLikesQuery(pageIdOrSlug!, { skip: !pageIdOrSlug || !user });
  const [likePage] = useLikePageMutation();
  const [unlikePage] = useUnlikePageMutation();

  // Track page visit (per user)
  useEffect(() => {
    if (page && page.id && user) {
      const key = `recentPages_${user.id}`;
      const recent = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [page.id, ...recent.filter((id: number) => id !== page.id)].slice(0, 5);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  }, [page, user]);

  // Find page by ID in tree
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

  const parentPage = page?.parent_id && pagesTree 
    ? findPageInTree(pagesTree, page.parent_id) 
    : null;

  // Find child pages
  const childPages = pagesTree && page
    ? (() => {
        const currentPage = findPageInTree(pagesTree, page.id);
        return currentPage?.children || [];
      })()
    : [];

  const handleEdit = () => {
    if (pageId) {
      navigate(`/page/${pageId}/edit`);
    }
  };

  const handleHistory = () => {
    if (pageId) {
      navigate(`/page/${pageId}/history`);
    }
  };

  const handleCollaborators = () => {
    if (pageId) {
      navigate(`/page/${pageId}/collaborators`);
    }
  };

  const handleCreateChild = () => {
    if (pageId) {
      navigate(`/page/new?parent=${pageId}`);
    }
  };

  const handleLike = async () => {
    if (!pageIdOrSlug || !user) return;
    try {
      if (likesData?.user_liked) {
        await unlikePage(pageIdOrSlug).unwrap();
      } else {
        await likePage(pageIdOrSlug).unwrap();
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  if (isLoading) {
    return <div className="loading"><Spinner size="large" />Loading...</div>;
  }

  if (error || !page) {
    return <div className="no-page">Page not found</div>;
  }

  const canEdit = user && (user.role === 'admin' || page.author.id === user.id);
  
  // Check if user can create child pages (must be author or write collaborator)
  const isWriteCollaborator = user && collaborators && collaborators.some(
    (c: any) => c.user.id === user.id && c.access_level === 'write'
  );
  
  const canCreateChild = user && (
    user.role === 'admin' || 
    page.author.id === user.id ||
    isWriteCollaborator
  );

  return (
    <div className="page-viewer">
      <div className="page-header">
        <h1>{page.title}</h1>
        <div className="page-actions">
          {user && (
            <>
              {canEdit && (
                <Button variant="primary" onClick={handleEdit}>
                  Edit
                </Button>
              )}
              <Button variant="secondary" onClick={handleHistory}>
                History
              </Button>
              {canEdit && (
                <Button variant="secondary" onClick={handleCollaborators}>
                  Collaborators
                </Button>
              )}
              {canCreateChild && (
                <Button variant="secondary" onClick={handleCreateChild}>
                  Create Child Page
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {parentPage && (
        <div className="page-breadcrumb">
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate(`/page/${parentPage.id}`)}
          >
            ← {parentPage.title}
          </Button>
        </div>
      )}

      <div className="page-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {page.content || ''}
        </ReactMarkdown>
      </div>

      {childPages.length > 0 && (
        <div className="child-pages-section">
          <h2>Child Pages</h2>
          <div className="child-pages-list">
            {childPages.map((child: any) => (
              <div
                key={child.id}
                className="child-page-item"
                onClick={() => navigate(`/page/${child.id}`)}
              >
                <h3>{child.title}</h3>
                {child.like_count > 0 && (
                  <span className="child-page-likes">❤️ {child.like_count}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="page-footer">
        <div className="page-footer-left">
          <p>
            Created by {page.author?.username || 'Unknown'} on{' '}
            {new Date(page.created_at).toLocaleDateString()}
            {page.updated_at !== page.created_at && (
              <> • Updated on {new Date(page.updated_at).toLocaleDateString()}</>
            )}
          </p>
        </div>
        {user && (
          <div className="page-footer-right">
            <button
              className={`like-button ${likesData?.user_liked ? 'liked' : ''}`}
              onClick={handleLike}
              title={likesData?.user_liked ? 'Unlike this page' : 'Like this page'}
            >
              <span className="like-icon">❤️</span>
              <span className="like-count">{likesData?.like_count || page.like_count || 0}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageViewer;