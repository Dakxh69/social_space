import { StrictMode } from 'react'
import { Provider } from 'react-redux';
import { BrowserRouter } from "react-router-dom";
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import store from './store';
import AuthBootstrap from './components/AuthBootstrap.jsx';

createRoot(document.getElementById('root')).render(
<StrictMode>
  <Provider store={store}>
    <BrowserRouter>
      <AuthBootstrap>
        <App />
      </AuthBootstrap>
    </BrowserRouter>
  </Provider>
</StrictMode>
)
