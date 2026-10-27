import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import ProtectedLayout from '../components/layout/ProtectedLayout';

// Public Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import Signup from '../pages/Signup';

// Protected Pages
import Dashboard from '../pages/Dashboard';
import Upload from '../pages/Upload';
import Datasets from '../pages/Datasets';
import DatasetDetails from '../pages/DatasetDetails';
import Fleet from '../pages/Fleet';
import TurbineDetails from '../pages/TurbineDetails';
import Performance from '../pages/Performance';
import Alerts from '../pages/Alerts';
import HealthRisk from '../pages/HealthRisk';
import Explainability from '../pages/Explainability';
import LiveWind from '../pages/LiveWind';

export const router = createBrowserRouter([
  // Public Routes
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },

  // Protected Routes
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/upload',
        element: <Upload />,
      },
      {
        path: '/datasets',
        element: <Datasets />,
      },
      {
        path: '/datasets/:id',
        element: <DatasetDetails />,
      },
      {
        path: '/fleet',
        element: <Fleet />,
      },
      {
        path: '/turbines/:id',
        element: <TurbineDetails />,
      },
      {
        path: '/performance',
        element: <Performance />,
      },
      {
        path: '/alerts',
        element: <Alerts />,
      },
      {
        path: '/health-risk',
        element: <HealthRisk />,
      },
      {
        path: '/explainability',
        element: <Explainability />,
      },
      {
        path: '/live-wind',
        element: <LiveWind />,
      },
    ],
  },

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});
