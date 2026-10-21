import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SuperAdminSectionApp from './SuperAdminSectionApp';
import ReviewsModalBody from '../components/MainDashboard/Modals/ReviewsModalBody';

const SuperAdminReviewsApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  return (
    <SuperAdminSectionApp
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      isPlatformAdmin={!!user?.isPlatformAdmin}
      sectionKey="reviews"
    >
      <ReviewsModalBody />
    </SuperAdminSectionApp>
  );
};

export default SuperAdminReviewsApp;