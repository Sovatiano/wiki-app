import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../utils/api'

interface Page {
  id: string
  title: string
  content: string
  author: {
    id: string
    username: string
  }
  is_public: boolean
  parent_id: string | null
  created_at: string
  updated_at: string
}

interface PagesState {
  pages: Page[]
  activePage: Page | null
  loading: boolean
  error: string | null
}

const initialState: PagesState = {
  pages: [],
  activePage: null,
  loading: false,
  error: null,
}

export const fetchPages = createAsyncThunk(
  'pages/fetchPages',
  async () => {
    const response = await api.get('/pages')
    return response.data
  }
)

export const fetchPage = createAsyncThunk(
  'pages/fetchPage',
  async (pageId: string) => {
    const response = await api.get(`/pages/${pageId}`)
    return response.data
  }
)

export const createPage = createAsyncThunk(
  'pages/createPage',
  async (pageData: { title: string; content: string; parent_id?: string | null; is_public?: boolean }) => {
    const response = await api.post('/pages', pageData)
    return response.data
  }
)

export const updatePage = createAsyncThunk(
  'pages/updatePage',
  async ({ id, ...pageData }: { id: string; title: string; content: string }) => {
    const response = await api.put(`/pages/${id}`, pageData)
    return response.data
  }
)

const pagesSlice = createSlice({
  name: 'pages',
  initialState,
  reducers: {
    setActivePage: (state, action) => {
      state.activePage = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPages.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchPages.fulfilled, (state, action) => {
        state.loading = false
        state.pages = action.payload
      })
      .addCase(fetchPages.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch pages'
      })
      .addCase(fetchPage.fulfilled, (state, action) => {
        state.activePage = action.payload
      })
      .addCase(createPage.fulfilled, (state, action) => {
        state.pages.push(action.payload)
      })
      .addCase(updatePage.fulfilled, (state, action) => {
        if (state.activePage && state.activePage.id === action.payload.id) {
          state.activePage = action.payload
        }
      })
  },
})

export const { setActivePage } = pagesSlice.actions
export default pagesSlice.reducer