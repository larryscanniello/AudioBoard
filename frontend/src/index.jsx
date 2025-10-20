import ReactDOM from 'react-dom/client';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import Layout from './Components/Layout';
import Landing from './Components/Landing';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthProvider from './Components/AuthProvider';

const router = createBrowserRouter([
    {
      element: <AuthProvider><Layout/></AuthProvider>,
      children: [
        { path: "/", element: <Landing/>},
        /*{ path: "/account", element: <Account/>},
        { path: "/home", element: <Home/>},
        { path: "/room/:roomID", element: <AudioBoard/>}*/
      ]
        }
])

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <RouterProvider router = {router} />
      </GoogleOAuthProvider>
);