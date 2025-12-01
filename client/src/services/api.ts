import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { RootState } from '../app/store'

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  prepareHeaders: (headers, { getState }) => {
    // Try to get token from Redux state first, then fallback to localStorage
    const state = getState() as RootState
    const token = state.auth.token || localStorage.getItem('token')
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  },
  fetchFn: async (...args) => {
    try {
      const response = await fetch(...args)
      return response
    } catch (error: any) {
      console.error('Fetch error:', error)
      // Re-throw to let RTK Query handle it
      throw error
    }
  },
})

// Add response interceptor to handle 401 errors and invalid tokens
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  try {
    let result = await baseQuery(args, api, extraOptions)
    
    // If we get a 401, the token might be invalid - clear it
    if (result.error && 'status' in result.error && result.error.status === 401) {
      // Token is invalid, clear it
      localStorage.removeItem('token')
      // Clear token from Redux state by dispatching logout
      // Import dynamically to avoid circular dependency
      const authSlice = await import('../features/auth/authSlice')
      api.dispatch(authSlice.logout())
    }
    
    // Log fetch errors for debugging
    if (result.error && result.error.status === 'FETCH_ERROR') {
      console.error('Fetch error details:', {
        url: args.url || args,
        error: result.error,
        baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      })
    }
    
    return result
  } catch (error: any) {
    // Handle unexpected errors
    console.error('Unexpected error in baseQueryWithReauth:', error)
    return {
      error: {
        status: 'FETCH_ERROR',
        error: error?.message || 'Failed to fetch',
        data: error
      }
    }
  }
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Page', 'Pages', 'User', 'Search'],
  endpoints: (builder) => ({
    // Pages
    getPages: builder.query<any[], { myOnly?: boolean } | void>({
      query: (params) => {
        const url = '/pages';
        if (params && params.myOnly) {
          return `${url}?my_only=true`;
        }
        return url;
      },
      providesTags: ['Pages'],
      transformResponse: (response: any) => {
        // FastAPI returns array directly, RTK Query expects { data: ... }
        // If response is already an array, return it; otherwise return response.data or response
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || response || [];
      },
    }),
    // My Pages - only pages created by current user
    getMyPages: builder.query<any[], void>({
      query: () => '/my-pages',
      providesTags: ['Pages'],
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || response || [];
      },
    }),
    getPage: builder.query<any, number | string>({
      query: (idOrSlug) => `/pages/${idOrSlug}`,
      providesTags: (result, error, idOrSlug) => [{ type: 'Page', id: typeof idOrSlug === 'number' ? idOrSlug : idOrSlug }],
    }),
    createPage: builder.mutation<any, { title: string; content: string; parent_id?: number | null; is_public?: boolean }>({
      query: (body) => ({
        url: '/pages',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pages'],
    }),
    updatePage: builder.mutation<any, { id: number | string; title: string; content: string; version_comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `/pages/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Page', id: typeof id === 'number' ? id : id }, 'Pages'],
    }),
    deletePage: builder.mutation<void, number | string>({
      query: (id) => ({
        url: `/pages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pages'],
    }),
    // Page History
    getPageHistory: builder.query<any[], number | string>({
      query: (pageId) => `/pages/${pageId}/history`,
      providesTags: (result, error, pageId) => [{ type: 'Page', id: typeof pageId === 'number' ? pageId : pageId }],
    }),
    restoreVersion: builder.mutation<any, { pageId: number | string; versionId: number }>({
      query: ({ pageId, versionId }) => ({
        url: `/pages/${pageId}/restore/${versionId}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { pageId }) => [{ type: 'Page', id: typeof pageId === 'number' ? pageId : pageId }, 'Pages'],
    }),
    // Collaborators
    getCollaborators: builder.query<any[], number | string>({
      query: (pageId) => `/pages/${pageId}/collaborators`,
      providesTags: (result, error, pageId) => [{ type: 'Page', id: typeof pageId === 'number' ? pageId : pageId }],
    }),
    addCollaborator: builder.mutation<any, { pageId: number | string; user_id: number; access_level: 'read' | 'write' }>({
      query: ({ pageId, ...body }) => ({
        url: `/pages/${pageId}/collaborators`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { pageId }) => [{ type: 'Page', id: typeof pageId === 'number' ? pageId : pageId }],
    }),
    // Search
    searchPages: builder.query<any[], string>({
      query: (q) => `/search/?q=${encodeURIComponent(q)}`,
      providesTags: ['Search'],
      transformResponse: (response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || response || [];
      },
    }),
    // Likes
    getPageLikes: builder.query<any, number | string>({
      query: (pageId) => `/pages/${pageId}/likes`,
      providesTags: (result, error, pageId) => [{ type: 'Page', id: typeof pageId === 'number' ? pageId : pageId }],
    }),
    likePage: builder.mutation<any, number | string>({
      query: (pageId) => ({
        url: `/pages/${pageId}/like`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, pageId) => [{ type: 'Page', id: typeof pageId === 'number' ? pageId : pageId }],
    }),
    unlikePage: builder.mutation<any, number | string>({
      query: (pageId) => ({
        url: `/pages/${pageId}/like`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, pageId) => [{ type: 'Page', id: typeof pageId === 'number' ? pageId : pageId }],
    }),
  }),
})

export const {
  useGetPagesQuery,
  useGetMyPagesQuery,
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
} = api

