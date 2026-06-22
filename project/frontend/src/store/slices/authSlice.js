import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getCurrentUser } from '../../services/authService';

const initialState = {
  user: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
};

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      return await getCurrentUser();
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Unable to load current user'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.error = null;
      state.status = 'succeeded';
    },
    clearUser(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.status = 'idle';
    },
    setAuthStatus(state, action) {
      state.status = action.payload;
    },
    setAuthError(state, action) {
      state.error = action.payload;
      state.status = 'failed';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = 'failed';
        state.error = action.payload || 'Unable to load current user';
      });
  },
});

export const { setUser, clearUser, setAuthStatus, setAuthError } = authSlice.actions;
export default authSlice.reducer;