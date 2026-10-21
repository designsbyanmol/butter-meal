// src/apps/TenantAdminReviewsApp.tsx
import React from 'react';
import TenantAdminSectionApp from './TenantAdminSectionApp';
import ReviewsAdminModalBody from '../components/MainDashboard/ReviewsAdminModalBody';

const TenantAdminReviewsApp: React.FC = () => (
  <TenantAdminSectionApp sectionKey="reviews">
    <ReviewsAdminModalBody />
  </TenantAdminSectionApp>
);

export default TenantAdminReviewsApp;