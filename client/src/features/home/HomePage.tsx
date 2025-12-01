import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useGetMyPagesQuery, useGetPagesQuery } from '../../services/api';
import { RootState } from '../../app/store';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import './HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  // For authenticated users, get only their pages using my_only parameter
  const { data: pagesTree, isLoading } = useGetPagesQuery(
    user ? { myOnly: true } : undefined,
    { skip: false }
  );

  // Get root pages
  const rootPages = useMemo(() => {
    if (!pagesTree) return [];
    return pagesTree;
  }, [pagesTree]);

  if (isLoading) {
    return (
      <div className="home-page">
        <div className="loading">
          <Spinner size="large" />
          <span>Загрузка страниц...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Добро пожаловать в WikiApp</h1>
        {user && (
          <Button variant="primary" onClick={() => navigate('/page/new')}>
            Создать страницу
          </Button>
        )}
      </div>

      {rootPages && rootPages.length > 0 ? (
        <div className="home-section">
          <h2>{user ? 'Мои страницы' : 'Публичные страницы'}</h2>
          <div className="pages-grid">
            {rootPages.map((page: any) => (
              <div
                key={page.id}
                className="page-card"
                onClick={() => navigate(`/page/${page.id}`)}
              >
                {page.like_count > 0 && (
                  <span className="page-likes-badge">❤️ {page.like_count}</span>
                )}
                <h3>{page.title}</h3>
                <p className="page-meta">
                  {page.is_public ? 'Публичная' : 'Приватная'}
                  {page.children && page.children.length > 0 && (
                    <> • {page.children.length} подстраниц</>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className="home-empty">
            <h2>Добро пожаловать в WikiApp</h2>
            <p>Используйте боковую панель для навигации по страницам или создайте новую.</p>
            {user && (
              <Button variant="primary" onClick={() => navigate('/page/new')}>
                Создать первую страницу
              </Button>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default HomePage;

