import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';

interface Page {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    username: string;
  };
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const usePage = (pageId?: string) => {
  const { pageId: paramPageId } = useParams<{ pageId: string }>();
  const id = pageId || paramPageId;

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchPage(id);
    }
  }, [id]);

  const fetchPage = async (pageId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/pages/${pageId}`);
      setPage(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const updatePage = async (pageData: { title: string; content: string }) => {
    if (!id) return;

    try {
      const response = await api.put(`/pages/${id}`, pageData);
      setPage(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update page');
      throw err;
    }
  };

  return {
    page,
    loading,
    error,
    updatePage,
    refetch: () => id && fetchPage(id)
  };
};