import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import pagesReducer from '../features/wiki/pagesSlice'
import { api } from '../services/api'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pages: pagesReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch