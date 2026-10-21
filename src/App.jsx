import { App as CapacitorApp } from '@capacitor/app';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
// ... other imports ...
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CourseList from './components/CourseList';
import CoursesPageWrapper from './components/CoursesPageWrapper';
import CourseManageSidebar from './components/CourseManageSidebar';
import CourseSettings from './components/CourseSettings';
import CourseAccessControl from './components/CourseAccessControl';
import CourseChapters from './components/CourseChapters';
import ChapterContents from './components/ChapterContents';
import CourseExams from './components/CourseExams';
import CreateCourse from './components/CreateCourse';
import DeleteCourse from './components/DeleteCourse';
import CloneCourse from './components/CloneCourse';
import BatchManagement from './components/BatchManagement';
import CreateBatch from './components/CreateBatch';
import BatchDetail from './components/BatchDetail';
import MembersManagement from './components/MembersManagement';
import CreateUser from './components/CreateUser';
import EditUser from './components/EditUser';
import MemberDetails from './components/MemberDetails';
import PostList from './components/PostList';
import PostsSidebar from './components/PostsSidebar';
import PostCategories from './components/PostCategories';
import CreateCategory from './components/CreateCategory';
import EditCategory from './components/EditCategory';
import DeleteCategory from './components/DeleteCategory';
import CreatePost from './components/CreatePost';
import PostDetail from './components/PostDetail';
import PublicPosts from './components/PublicPosts';
import PostsPageWrapper from './components/PostsPageWrapper';
import ProductList from './components/ProductList';
import StoreSidebar from './components/StoreSidebar';
import CreateProduct from './components/CreateProduct';
import ProductCategories from './components/ProductCategories';
import ProductDetail from './components/ProductDetail';
import EditProduct from './components/EditProduct';
import QuestionsSidebar from './components/QuestionsSidebar';
import QuestionList from './components/QuestionList';
import CreateQuestion from './components/CreateQuestion';
import SubjectList from './components/SubjectList';
import QuestionFolderList from './components/QuestionFolderList';
import FolderQuestions from './components/FolderQuestions';
import BulkUploadQuestions from './components/BulkUploadQuestions';
import CreateExam from './components/CreateExam';
import ReportedQuestions from './components/ReportedQuestions';
import ExamsSidebar from './components/ExamsSidebar';
import ExamList from './components/ExamList';
import ExamsPage from './components/ExamsPage';
import ExamStatistics from './components/ExamStatistics';
import VideoStatistics from './components/VideoStatistics';
import ExamQuestions from './components/ExamQuestions';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ProtectedLayout from './components/ProtectedLayout';
import AdminLayout from './components/AdminLayout';
import StudentLayout from './components/StudentLayout';
import StudentSidebar from './components/StudentSidebar';
import StudentDashboard from './components/StudentDashboard';
import MyCourses from './components/MyCourses';
import ExamPortal from './components/ExamPortal';
import CoursePlayer from './components/CoursePlayer';
import TakeExam from './components/TakeExam';
import ExamResults from './components/ExamResults';
import SectionQuestions from './components/SectionQuestions';
import TestSignup from './components/TestSignup';
import StudentSignup from './components/StudentSignup';
import StudentStore from './components/StudentStore';
import StudentProductDetail from './components/StudentProductDetail';
import StudentProfile from './components/StudentProfile';
import ExamPdfViewer from './components/ExamPdfViewer';
import StudentRanking from './components/StudentRanking';
import StudentBookmarks from './components/StudentBookmarks';
import StudentAnalytics from './components/StudentAnalytics';
import StudentProgressReport from './components/StudentProgressReport';
import StudentPosts from './components/StudentPosts';
import PublicLayout from './components/PublicLayout';
import HomePage from './components/HomePage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import ShippingPolicy from './pages/ShippingPolicy';
import RefundPolicy from './pages/RefundPolicy';
import ContactUs from './pages/ContactUs';

import SettingsSidebar from './components/SettingsSidebar';
import SettingsProfile from './components/SettingsProfile';
import SettingsInstitute from './components/SettingsInstitute';
import SettingsSubscription from './components/SettingsSubscription';
import SettingsSales from './components/SettingsSales';
import SettingsCustomFields from './components/SettingsCustomFields';
import SettingsBannerAds from './components/SettingsBannerAds';
import SettingsTestimonials from './components/SettingsTestimonials';
import SettingsStatistics from './components/SettingsStatistics';
import SettingsHome from './components/SettingsHome';
import SettingsQuotes from './components/SettingsQuotes';
import SettingsSEO from './components/SettingsSEO';
import SettingsIntegrations from './components/SettingsIntegrations';
import ImportData from './components/ImportData';
import SEO from './components/SEO';
import RazorpayCheckoutTest from './components/RazorpayCheckoutTest';
import PWAInstallPrompt from './components/PWAInstallPrompt';

import { CourseProvider } from './context/CourseContext';
import { BatchProvider } from './context/BatchContext';
import { UserProvider } from './context/UserContext';
import { PostProvider } from './context/PostContext';
import { CategoryProvider } from './context/CategoryContext';
import { ProductProvider } from './context/ProductContext';
import { ProductCategoryProvider } from './context/ProductCategoryContext';
import { SubjectProvider } from './context/SubjectContext';
import { QuestionProvider } from './context/QuestionContext';
import { QuestionFolderProvider } from './context/QuestionFolderContext';
import { ExamProvider } from './context/ExamContext';
import { ChapterProvider } from './context/ChapterContext';
import { TransactionProvider } from './context/TransactionContext';
import { InstituteProvider } from './context/InstituteContext';
import { AuthProvider } from './context/AuthContext';
import { HomeSettingsProvider } from './context/HomeSettingsContext';
import { CustomFieldsProvider } from './context/CustomFieldsContext';
import { TagProvider } from './context/TagContext';
import { ToastProvider } from './context/ToastContext';
import TagManagement from './components/TagManagement';
import CreateProductCategory from './components/CreateProductCategory';
import EditProductCategory from './components/EditProductCategory';
import { OfferProvider } from './context/OfferContext';
import CreateCoupon from './components/CreateCoupon';
import CreateRepeatOffer from './components/CreateRepeatOffer';
import { SidebarProvider } from './context/SidebarContext';

import './index.css';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = async () => {
      await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (
          location.pathname === '/' ||
          location.pathname === '/home' ||
          location.pathname === '/login' ||
          location.pathname === '/student/dashboard'
        ) {
          CapacitorApp.exitApp();
        } else {
          navigate(-1);
        }
      });
    };

    handleBackButton();

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate, location]);

  useEffect(() => {
    // If arriving on root domain edustacks.co.in during password recovery, redirect to academy subdomain
    const isRootDomain = window.location.hostname === 'edustacks.co.in' || window.location.hostname === 'www.edustacks.co.in';
    const isRecovery = (window.location.hash && window.location.hash.includes('type=recovery')) ||
                       (window.location.search && window.location.search.includes('type=recovery')) ||
                       location.pathname === '/reset-password';

    if (isRootDomain && isRecovery) {
      window.location.href = `https://maheshiesacademy.edustacks.co.in/reset-password${window.location.search}${window.location.hash}`;
      return;
    }

    // If arriving with Supabase password recovery token in URL hash on subdomain
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      if (location.pathname !== '/reset-password') {
        navigate('/reset-password' + window.location.hash, { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return (

    <HelmetProvider>
      <AuthProvider>
        <UserProvider>
          <BatchProvider>
            <CourseProvider>
              <PostProvider>
                <CategoryProvider>
                  <ProductProvider>
                    <ProductCategoryProvider>
                      <SubjectProvider>
                        <QuestionProvider>
                          <QuestionFolderProvider>
                            <ExamProvider>
                              <ChapterProvider>
                                <InstituteProvider>
                                  <HomeSettingsProvider>
                                    <CustomFieldsProvider>
                                      <TagProvider>
                                        <ToastProvider>
                                          <TransactionProvider>
                                            <OfferProvider>
                                              <SidebarProvider>
                                                <SEO />
                                                <PWAInstallPrompt />
                                                <Routes>
                                                  {/* Public Routes */}
                                                  <Route path="/test-payment" element={<RazorpayCheckoutTest />} />
                                                   <Route path="/student/test-payment" element={<RazorpayCheckoutTest />} />
                                                   <Route path="/login" element={
                                                    <PublicLayout>
                                                      <Login />
                                                    </PublicLayout>
                                                  } />
                                                  <Route path="/student/signup" element={
                                                    <PublicLayout>
                                                      <StudentSignup />
                                                    </PublicLayout>
                                                  } />
                                                  <Route path="/forgot-password" element={
                                                    <PublicLayout>
                                                      <ForgotPassword />
                                                    </PublicLayout>
                                                  } />
                                                  <Route path="/reset-password" element={
                                                    <PublicLayout>
                                                      <ResetPassword />
                                                    </PublicLayout>
                                                  } />
                                                  <Route path="/home" element={
                                                    <PublicLayout>
                                                      <HomePage />
                                                    </PublicLayout>
                                                  } />
                                                  <Route path="/post/:id" element={
                                                    <PublicLayout>
                                                      <PostDetail />
                                                    </PublicLayout>
                                                  } />
                                                  <Route path="/shipping-policy" element={
                                                    <PublicLayout>
                                                      <ShippingPolicy />
                                                    </PublicLayout>
                                                  } />

                                                  {/* Protected Routes */}
                                                  <Route path="/" element={<Navigate to="/home" replace />} />

                                                  {/* Student Routes */}
                                                  <Route path="/student/dashboard" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area" style={{ padding: 0 }}>
                                                        <StudentDashboard />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/courses" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area">
                                                        <MyCourses />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/course/:id" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area" style={{ padding: 0 }}>
                                                        <CoursePlayer />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/exams" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area">
                                                        <ExamPortal />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/exam/:id/take" element={<TakeExam />} />
                                                  <Route path="/student/exam/:id/results" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area">
                                                        <ExamResults />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/store" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area">
                                                        <StudentStore />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/store/product/:id" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area" style={{ padding: 0 }}>
                                                        <StudentProductDetail />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/profile" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area">
                                                        <StudentProfile />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/exam/:id/pdf" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area">
                                                        <ExamPdfViewer />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/ranking" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area ranking-content-area">
                                                        <StudentRanking />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/bookmarks" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area" style={{ padding: 0 }}>
                                                        <StudentBookmarks />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/analytics" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area" style={{ padding: 0 }}>
                                                        <StudentAnalytics />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/posts" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area" style={{ padding: 0 }}>
                                                        <StudentPosts />
                                                      </div>
                                                    </StudentLayout>
                                                  } />
                                                  <Route path="/student/posts/:id" element={
                                                    <StudentLayout>
                                                      <StudentSidebar />
                                                      <div className="content-area" style={{ padding: 0 }}>
                                                        <PostDetail />
                                                      </div>
                                                    </StudentLayout>
                                                  } />

                                                  <Route path="/test-signup" element={<ProtectedLayout><TestSignup /></ProtectedLayout>} />

                                                  {/* Course Routes */}
                                                  <Route path="/courses" element={
                                                    <AdminLayout>
                                                      <CoursesPageWrapper />
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/courses/:id/settings" element={
                                                    <AdminLayout>
                                                      <CourseManageSidebar />
                                                      <div className="content-area">
                                                        <CourseSettings />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/courses/:id/access-control" element={
                                                    <AdminLayout>
                                                      <CourseManageSidebar />
                                                      <div className="content-area">
                                                        <CourseAccessControl />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/courses/:id/chapters" element={
                                                    <AdminLayout>
                                                      <CourseManageSidebar />
                                                      <div className="content-area">
                                                        <CourseChapters />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/courses/:id/chapters/:chapterId/contents" element={
                                                    <AdminLayout>
                                                      <CourseManageSidebar />
                                                      <div className="content-area">
                                                        <ChapterContents />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/courses/:id/exams" element={
                                                    <AdminLayout>
                                                      <CourseManageSidebar />
                                                      <div className="content-area">
                                                        <CourseExams />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/courses/:courseId/content/:contentId/statistics" element={
                                                    <AdminLayout>
                                                      <CourseManageSidebar />
                                                      <div className="content-area">
                                                        <VideoStatistics />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/courses/create" element={
                                                    <AdminLayout>
                                                      <Sidebar />
                                                      <div className="content-area">
                                                        <CreateCourse />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/courses/:id/delete" element={
                                                    <AdminLayout>
                                                      <Sidebar />
                                                      <div className="content-area">
                                                        <DeleteCourse />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/courses/:id/clone" element={
                                                    <AdminLayout>
                                                      <CourseManageSidebar />
                                                      <div className="content-area">
                                                        <CloneCourse />
                                                      </div>
                                                    </AdminLayout>
                                                  } />

                                                  {/* Batch Routes */}
                                                  <Route path="/batches" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <BatchManagement />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/batches/create" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <CreateBatch />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/batches/edit/:id" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <CreateBatch />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/batches/:id" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <BatchDetail />
                                                      </div>
                                                    </AdminLayout>
                                                  } />

                                                  {/* User Routes */}
                                                  <Route path="/users" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <MembersManagement />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/members" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <MembersManagement />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/members/create" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <CreateUser />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/users/create" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <CreateUser />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/create-user" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <CreateUser />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/users/:id/edit" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <EditUser />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/edit-user/:id" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <EditUser />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/members/:id/progress" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <StudentProgressReport />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/members/:id" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <MemberDetails />
                                                      </div>
                                                    </AdminLayout>
                                                  } />

                                                  {/* Post Routes */}
                                                  <Route path="/admin/posts" element={
                                                    <AdminLayout>
                                                      <PostsPageWrapper />
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/admin/posts/deleted" element={
                                                    <AdminLayout>
                                                      <PostsPageWrapper />
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/admin/posts/create" element={
                                                    <AdminLayout>
                                                      <PostsSidebar />
                                                      <div className="content-area">
                                                        <CreatePost />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/admin/posts/categories" element={
                                                    <AdminLayout>
                                                      <PostsSidebar />
                                                      <div className="content-area">
                                                        <PostCategories />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/admin/posts/categories/create" element={
                                                    <AdminLayout>
                                                      <PostsSidebar />
                                                      <div className="content-area">
                                                        <CreateCategory />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/admin/posts/categories/edit/:id" element={
                                                    <AdminLayout>
                                                      <PostsSidebar />
                                                      <div className="content-area">
                                                        <EditCategory />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/admin/posts/categories/delete/:id" element={
                                                    <AdminLayout>
                                                      <PostsSidebar />
                                                      <div className="content-area">
                                                        <DeleteCategory />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/admin/posts/edit/:id" element={
                                                    <AdminLayout>
                                                      <PostsSidebar />
                                                      <div className="content-area">
                                                        <CreatePost />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/admin/posts/:id" element={
                                                    <AdminLayout>
                                                      <PostsSidebar />
                                                      <div className="content-area">
                                                        <PostDetail />
                                                      </div>
                                                    </AdminLayout>
                                                  } />

                                                  {/* Public Posts Feed */}
                                                  <Route path="/posts" element={
                                                    <PublicLayout>
                                                      <PublicPosts />
                                                    </PublicLayout>
                                                  } />

                                                  {/* Backward Compatibility Redirects */}
                                                  <Route path="/posts/deleted" element={<Navigate to="/admin/posts/deleted" replace />} />
                                                  <Route path="/posts/create" element={<Navigate to="/admin/posts/create" replace />} />
                                                  <Route path="/posts/categories" element={<Navigate to="/admin/posts/categories" replace />} />
                                                  <Route path="/posts/categories/create" element={<Navigate to="/admin/posts/categories/create" replace />} />
                                                  <Route path="/posts/categories/edit/:id" element={<Navigate to="/admin/posts/categories" replace />} />
                                                  <Route path="/posts/categories/delete/:id" element={<Navigate to="/admin/posts/categories" replace />} />
                                                  <Route path="/posts/edit/:id" element={<Navigate to="/admin/posts" replace />} />

                                                  {/* Settings Routes */}
                                                  <Route path="/settings/home" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsHome />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/profile" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsProfile />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/institute" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsInstitute />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/subscription" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsSubscription />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/sales" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsSales />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/custom-fields" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsCustomFields />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/banner-ads" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsBannerAds />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/quotes" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsQuotes />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/testimonials" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsTestimonials />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/statistics" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsStatistics />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/tags" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <TagManagement />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/seo" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsSEO />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/import-data" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <ImportData />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/settings/integrations" element={
                                                    <AdminLayout>
                                                      <SettingsSidebar />
                                                      <div className="content-area">
                                                        <SettingsIntegrations />
                                                      </div>
                                                    </AdminLayout>
                                                  } />

                                                  {/* Exam Routes */}
                                                  <Route path="/exams" element={
                                                    <AdminLayout>
                                                      <ExamsPage />
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/exams/:status" element={
                                                    <AdminLayout>
                                                      <ExamsPage />
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/exams/create" element={
                                                    <AdminLayout>
                                                      <ExamsSidebar />
                                                      <div className="content-area">
                                                        <CreateExam />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/exams/edit/:id" element={
                                                    <AdminLayout>
                                                      <ExamsSidebar />
                                                      <div className="content-area">
                                                        <CreateExam />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/exams/:id/questions" element={
                                                    <AdminLayout>
                                                      <ExamsSidebar />
                                                      <div className="content-area">
                                                        <ExamQuestions />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/exams/:id/statistics" element={
                                                    <AdminLayout>
                                                      <aside style={{ width: '250px', padding: '0 20px' }}>
                                                        {/* Empty sidebar or minimal sidebar */}
                                                      </aside>
                                                      <div className="content-area">
                                                        <ExamStatistics />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/exams/result/:attemptId" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <ExamResults />
                                                      </div>
                                                    </AdminLayout>
                                                  } />

                                                  {/* Question Routes */}
                                                  <Route path="/questions" element={
                                                    <AdminLayout>
                                                      <QuestionsSidebar />
                                                      <div className="content-area">
                                                        <QuestionList />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/questions/create" element={
                                                    <AdminLayout>
                                                      <QuestionsSidebar />
                                                      <div className="content-area">
                                                        <CreateQuestion />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/questions/folders" element={
                                                    <AdminLayout>
                                                      <QuestionsSidebar />
                                                      <div className="content-area">
                                                        <QuestionFolderList />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/questions/subjects" element={
                                                    <AdminLayout>
                                                      <QuestionsSidebar />
                                                      <div className="content-area">
                                                        <SubjectList />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/questions/edit/:id" element={
                                                    <AdminLayout>
                                                      <QuestionsSidebar />
                                                      <div className="content-area">
                                                        <CreateQuestion />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/questions/folders/:id" element={
                                                    <AdminLayout>
                                                      <QuestionsSidebar />
                                                      <div className="content-area">
                                                        <FolderQuestions />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/questions/folders/:folderId/bulk-upload" element={
                                                    <AdminLayout>
                                                      <QuestionsSidebar />
                                                      <div className="content-area">
                                                        <BulkUploadQuestions />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/questions/bulk-upload" element={
                                                    <AdminLayout>
                                                      <QuestionsSidebar />
                                                      <div className="content-area">
                                                        <BulkUploadQuestions />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/questions/reported" element={
                                                    <AdminLayout>
                                                      <QuestionsSidebar />
                                                      <div className="content-area">
                                                        <ReportedQuestions />
                                                      </div>
                                                    </AdminLayout>
                                                  } />

                                                  {/* Store Routes */}
                                                  <Route path="/store" element={
                                                    <AdminLayout>
                                                      <StoreSidebar />
                                                      <div className="content-area">
                                                        <ProductList />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/store/product/:id" element={
                                                    <AdminLayout>
                                                      <StoreSidebar />
                                                      <div className="content-area">
                                                        <ProductDetail />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/store/create" element={
                                                    <AdminLayout>
                                                      <StoreSidebar />
                                                      <div className="content-area">
                                                        <CreateProduct />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/store/product/:id/edit" element={
                                                    <AdminLayout>
                                                      <StoreSidebar />
                                                      <div className="content-area">
                                                        <EditProduct />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/store/categories/create" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <CreateProductCategory />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/store/categories/edit/:id" element={
                                                    <AdminLayout>
                                                      <div className="content-area">
                                                        <EditProductCategory />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/store/categories" element={
                                                    <AdminLayout>
                                                      <StoreSidebar />
                                                      <div className="content-area">
                                                        <ProductCategories />
                                                      </div>
                                                    </AdminLayout>
                                                  } />

                                                  {/* Offers Routes */}
                                                  <Route path="/offers/create-coupon" element={
                                                    <AdminLayout>
                                                      <StoreSidebar />
                                                      <div className="content-area">
                                                        <CreateCoupon />
                                                      </div>
                                                    </AdminLayout>
                                                  } />
                                                  <Route path="/offers/create-repeat-offer" element={
                                                    <AdminLayout>
                                                      <StoreSidebar />
                                                      <div className="content-area">
                                                        <CreateRepeatOffer />
                                                      </div>
                                                    </AdminLayout>
                                                  } />

                                                  {/* Policy Pages (Public - for Razorpay compliance) */}
                                                  <Route path="/privacy-policy" element={
                                                    <PublicLayout>
                                                      <PrivacyPolicy />
                                                    </PublicLayout>
                                                  } />
                                                  <Route path="/terms-and-conditions" element={
                                                    <PublicLayout>
                                                      <TermsAndConditions />
                                                    </PublicLayout>
                                                  } />
                                                  <Route path="/refund-policy" element={
                                                    <PublicLayout>
                                                      <RefundPolicy />
                                                    </PublicLayout>
                                                  } />
                                                  <Route path="/contact-us" element={
                                                    <PublicLayout>
                                                      <ContactUs />
                                                    </PublicLayout>
                                                  } />

                                                </Routes>
                                              </SidebarProvider>
                                            </OfferProvider>
                                          </TransactionProvider>
                                        </ToastProvider>
                                      </TagProvider>
                                    </CustomFieldsProvider>
                                  </HomeSettingsProvider>
                                </InstituteProvider>
                              </ChapterProvider>
                            </ExamProvider>
                          </QuestionFolderProvider>
                        </QuestionProvider>
                      </SubjectProvider>
                    </ProductCategoryProvider>
                  </ProductProvider>
                </CategoryProvider>
              </PostProvider>
            </CourseProvider>
          </BatchProvider>
        </UserProvider>
      </AuthProvider >
    </HelmetProvider>
  );
}

export default App;
