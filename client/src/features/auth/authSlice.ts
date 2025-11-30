import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../utils/api'

interface User {
  id: string
  username: string
  email: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { username: string; email: string; password: string }) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  }
)

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async () => {
    const response = await api.get('/users/me')
    return response.data
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      localStorage.removeItem('token')
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.access_token
        localStorage.setItem('token', action.payload.access_token)
        // User data will be fetched by AppRoutes useEffect
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to login'
      })
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to register'
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false
        state.token = null
        localStorage.removeItem('token')
      })
  },
})

export const { logout } = authSlice.actions
export default authSlice.reducer