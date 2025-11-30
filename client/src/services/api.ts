import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { RootState } from '../app/store'

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  },
})

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Page', 'Pages', 'User', 'Search'],
  endpoints: (builder) => ({
    // Pages
    getPages: builder.query<any[], void>({
      query: () => '/pages',
      providesTags: ['Pages'],
    }),
    getPage: builder.query<any, number>({
      query: (id) => `/pages/${id}`,
      providesTags: (result, error, id) => [{ type: 'Page', id }],
    }),
    createPage: builder.mutation<any, { title: string; content: string; parent_id?: number | null; is_public?: boolean }>({
      query: (body) => ({
        url: '/pages',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pages'],
    }),
    updatePage: builder.mutation<any, { id: number; title: string; content: string; version_comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `/pages/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Page', id }, 'Pages'],
    }),
    deletePage: builder.mutation<void, number>({
      query: (id) => ({
        url: `/pages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pages'],
    }),
    // Page History
    getPageHistory: builder.query<any[], number>({
      query: (pageId) => `/pages/${pageId}/history`,
      providesTags: (result, error, pageId) => [{ type: 'Page', id: pageId }],
    }),
    restoreVersion: builder.mutation<any, { pageId: number; versionId: number }>({
      query: ({ pageId, versionId }) => ({
        url: `/pages/${pageId}/restore/${versionId}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { pageId }) => [{ type: 'Page', id: pageId }, 'Pages'],
    }),
    // Collaborators
    getCollaborators: builder.query<any[], number>({
      query: (pageId) => `/pages/${pageId}/collaborators`,
      providesTags: (result, error, pageId) => [{ type: 'Page', id: pageId }],
    }),
    addCollaborator: builder.mutation<any, { pageId: number; user_id: number; access_level: 'read' | 'write' }>({
      query: ({ pageId, ...body }) => ({
        url: `/pages/${pageId}/collaborators`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { pageId }) => [{ type: 'Page', id: pageId }],
    }),
    // Search
    searchPages: builder.query<any[], string>({
      query: (q) => `/search?q=${encodeURIComponent(q)}`,
      providesTags: ['Search'],
    }),
    // Likes
    getPageLikes: builder.query<any, number>({
      query: (pageId) => `/pages/${pageId}/likes`,
      providesTags: (result, error, pageId) => [{ type: 'Page', id: pageId }],
    }),
    likePage: builder.mutation<any, number>({
      query: (pageId) => ({
        url: `/pages/${pageId}/like`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, pageId) => [{ type: 'Page', id: pageId }, 'Pages'],
    }),
    unlikePage: builder.mutation<any, number>({
      query: (pageId) => ({
        url: `/pages/${pageId}/like`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, pageId) => [{ type: 'Page', id: pageId }, 'Pages'],
    }),
    getPopularPages: builder.query<any[], void>({
      query: () => '/pages/popular',
      providesTags: ['Pages'],
    }),
  }),
})

export const {
  useGetPagesQuery,
  useGetPageQuery,
  useCreatePageMutation,
  useUpdatePageMutation,
  useDeletePageMutation,
  useGetPageHistoryQuery,
  useRestoreVersionMutation,
  useGetCollaboratorsQuery,
  useAddCollaboratorMutation,
  useSearchPagesQuery,
  useGetPageLikesQuery,
  useLikePageMutation,
  useUnlikePageMutation,
  useGetPopularPagesQuery,
} = api

