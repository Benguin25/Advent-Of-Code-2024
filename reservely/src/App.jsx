import React from 'react';
import { Analytics } from "@vercel/analytics/react";
import EditReservationPage from './components/EditReservationPage';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import './App.css';
import NotFound from './pages/NotFound';
import About from './components/About';
import RestaurantSearch from './components/RestaurantSearch';
import ReservationForm from './components/ReservationForm';
import ReservationManager from './components/ReservationManager';
import Login from './components/Login';
import CreateRestaurant from './components/CreateRestaurant'; // Added import
import OwnerDashboard from './components/OwnerDashboard';
import EditSeating from './components/EditSeating';
import MapEditor from './components/MapEditor';
import ManageRestaurant from './components/ManageRestaurant';
import ViewReservations from './components/ViewReservations';
import ManualReservationPage from './components/ManualReservationPage';
import ProtectedRoute from './components/ProtectedRoute'; // Added import
import CustomerLayout from './components/CustomerLayout';
import BusinessLayout from './components/BusinessLayout';
import ForBusinesses from './components/ForBusinesses';
import Pricing from './components/Pricing';
import BusinessContact from './components/BusinessContact';
import BusinessFAQs from './components/BusinessFAQs';
import ContactSuccess from './pages/ContactSuccess';

function HomePage() {
  return (
    <CustomerLayout>
      <RestaurantSearch />
    </CustomerLayout>
  );
}

// Renamed from RestaurantContext to RestaurantContextRoutes
function RestaurantContextRoutes() {
  const { restaurantSlug } = useParams();
  // const location = useLocation(); // Optional: for more detailed path logging

  if (!restaurantSlug) {
    // This case should ideally not be hit if the parent route regex works
    return <div>Error: Restaurant slug not found in URL for RestaurantContextRoutes.</div>;
  }

  return (
    <>
      <Routes>
        {/* Paths are relative to the parent route that rendered this component */}
        <Route path="book" element={<ReservationForm restaurantSlug={restaurantSlug} />} />
        <Route path="admin" element={<OwnerDashboard restaurantSlug={restaurantSlug} />} />
        <Route path="admin/seating" element={<EditSeating restaurantSlug={restaurantSlug} />} />
        <Route path="admin/manage" element={<ManageRestaurant restaurantSlug={restaurantSlug} />} />
        <Route
          path="admin/reservations"
          element={<ViewReservations restaurantSlug={restaurantSlug} />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

// New AppLayout component to contain elements needing router context
function AppLayout() {
  return (
    <Routes>
      {/* Customer routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/reservation/:reservationId" element={<ReservationManager />} />
      <Route path="/:restaurantSlug/*" element={<RestaurantContextRoutes />} />

      {/* Business routes */}
      <Route
        path="/for-businesses"
        element={
          <BusinessLayout>
            <ForBusinesses />
          </BusinessLayout>
        }
      />
      <Route
        path="/for-businesses/about"
        element={
          <BusinessLayout>
            <About />
          </BusinessLayout>
        }
      />
      <Route
        path="/for-businesses/contact"
        element={
          <BusinessLayout>
            <BusinessContact />
          </BusinessLayout>
        }
      />
      <Route
        path="/for-businesses/contact-success"
        element={
          <BusinessLayout>
            <ContactSuccess />
          </BusinessLayout>
        }
      />
      <Route
        path="/for-businesses/faqs"
        element={
          <BusinessLayout>
            <BusinessFAQs />
          </BusinessLayout>
        }
      />
      <Route
        path="/for-businesses/pricing"
        element={
          <BusinessLayout>
            <Pricing />
          </BusinessLayout>
        }
      />

      {/* Shared routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/create-restaurant" element={<CreateRestaurant />} />
        <Route
          path="/owner-dashboard"
          element={
            <BusinessLayout>
              <OwnerDashboard />
            </BusinessLayout>
          }
        />
        <Route path="/owner/manage/:restaurantId" element={<ManageRestaurant />} />
        <Route path="/owner/reservations/:restaurantId" element={<ViewReservations />} />
        <Route path="/owner/manual-reservation/:restaurantId" element={<ManualReservationPage />} />
        <Route path="/owner/seating/:restaurantId" element={<EditSeating />} />
        <Route path="/owner/map/:restaurantId" element={<MapEditor />} />
        <Route path="/owner/edit-reservation/:reservationId" element={<EditReservationPage />} />
      </Route>
      {/* Catch-all 404 route for unmatched paths */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
      <Analytics />
    </Router>
  );
}

export default App;
