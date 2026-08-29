import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useContext, useState, useEffect, lazy, Suspense } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthContext, { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import FloatingAIChatButton from './components/ui/FloatingAIChatButton';
import { Toaster } from 'react-hot-toast';
import api from './api/axios';

// Lazy load all pages for better performance (code splitting)
// Auth
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Course management
const CourseManage = lazy(() => import('./pages/course/CourseManage'));
const CourseView = lazy(() => import('./pages/course/CourseView'));
const CourseSettings = lazy(() => import('./pages/course/CourseSettings'));
const CourseAnalytics = lazy(() => import('./pages/course/CourseAnalytics'));
const StudentCourseDetails = lazy(() => import('./pages/course/StudentCourseDetails'));
const ManageCoupons = lazy(() => import('./pages/course/ManageCoupons'));

// Quiz
const QuizManage = lazy(() => import('./pages/quiz/QuizManage'));
const QuizTake = lazy(() => import('./pages/quiz/QuizTake'));
const QuizAnalytics = lazy(() => import('./pages/quiz/QuizAnalytics'));

// Student
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentDetail = lazy(() => import('./pages/student/StudentDetail'));
const StudentProgressDetail = lazy(() => import('./pages/student/StudentProgressDetail'));
const StudentAISettings = lazy(() => import('./pages/student/StudentAISettings'));
const AIChatPage = lazy(() => import('./pages/student/AIChatPage'));

// Marketplace
const Marketplace = lazy(() => import('./pages/marketplace/Marketplace'));
const CourseLanding = lazy(() => import('./pages/marketplace/CourseLanding'));
const CheckoutSuccess = lazy(() => import('./pages/marketplace/CheckoutSuccess'));
const MyPurchases = lazy(() => import('./pages/marketplace/MyPurchases'));
const InvoicePage = lazy(() => import('./pages/marketplace/InvoicePage'));

// Instructor
const InstructorDashboard = lazy(() => import('./pages/instructor/InstructorDashboard'));
const InstructorCoupons = lazy(() => import('./pages/instructor/InstructorCoupons'));
const CreateMarketplaceCourse = lazy(() => import('./pages/instructor/CreateMarketplaceCourse'));
const BecomeInstructor = lazy(() => import('./pages/instructor/BecomeInstructor'));
const AISettings = lazy(() => import('./pages/instructor/AISettings'));
const InstructorPaymentSettings = lazy(() => import('./pages/instructor/InstructorPaymentSettings'));

// Admin
const GlobalActivity = lazy(() => import('./pages/admin/GlobalActivity'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Shared
const Profile = lazy(() => import('./pages/Profile'));
const MyActivity = lazy(() => import('./pages/MyActivity'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotFound = lazy(() => import('./pages/NotFound'));


// Loading spinner component for Suspense fallback
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-slate-200 dark:border-slate-700 border-t-slate-600 dark:border-t-slate-400 rounded-full animate-spin"></div>
      <p className="text-slate-500 dark:text-slate-400 font-medium">Loading...</p>
    </div>
  </div>
);

// Home page: redirect enrolled users to My Learning, otherwise show Marketplace
const HomePage = () => {
  const { user } = useContext(AuthContext);
  const [redirect, setRedirect] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) { setChecked(true); return; }
    let cancelled = false;
    api.get('/courses/my/enrolled').then(res => {
      if (!cancelled && res.data && res.data.length > 0) setRedirect('/my-learning');
      if (!cancelled) setChecked(true);
    }).catch(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, [user]);

  if (redirect) return <Navigate to={redirect} replace />;
  if (!checked) return <PageLoader />;
  return <Marketplace />;
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
};

// Route for course owners (admin OR course owner - verified by backend)
const CourseOwnerRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Backend will verify ownership, frontend just ensures user is logged in
  return children;
};

// Route for instructors only
const InstructorRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'instructor' && user.role !== 'admin') {
    return <Navigate to="/become-instructor" />;
  }

  return children;
};

const AuthenticatedFloatingButton = () => {
  const { user } = useContext(AuthContext);
  if (!user) return null;
  return <FloatingAIChatButton />;
};

function App() {
  const authRoutePaths = ['/login', '/register', '/admin/login', '/teacher/register', '/teacher/login', '/admin/register'];
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <ThemeProvider>
            <Router>
              <AppShell authRoutePaths={authRoutePaths} />
            </Router>
          </ThemeProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    ) : (
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <AppShell authRoutePaths={authRoutePaths} />
          </Router>
        </ThemeProvider>
      </AuthProvider>
    )
  );
}

const AppShell = ({ authRoutePaths }) => {
  const location = useLocation();
  const isAuthRoute = authRoutePaths.includes(location.pathname);

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300 flex flex-col">
      {!isAuthRoute && <Navbar />}
      <div className="flex-1">
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={10}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              fontSize: '13.5px',
              fontWeight: 500,
              borderRadius: '12px',
              padding: '12px 16px',
              maxWidth: '420px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.06)',
            },
            success: {
              style: {
                background: '#064e3b',
                border: '1px solid #059669',
              },
              iconTheme: { primary: '#34d399', secondary: '#064e3b' },
            },
            error: {
              style: {
                background: '#450a0a',
                border: '1px solid #dc2626',
              },
              iconTheme: { primary: '#f87171', secondary: '#450a0a' },
              duration: 4000,
            },
          }}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/teacher/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/teacher/register" element={<Register />} />
            <Route path="/admin/register" element={<Register />} />

            {/* Admin-only routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/activities" element={<ProtectedRoute adminOnly={true}><GlobalActivity /></ProtectedRoute>} />

            {/* Course owner routes (admin OR course owner - backend verifies ownership) */}
            <Route path="/admin/course/:id" element={<CourseOwnerRoute><CourseManage /></CourseOwnerRoute>} />
            <Route path="/admin/course/:id/settings" element={<CourseOwnerRoute><CourseSettings /></CourseOwnerRoute>} />
            <Route path="/admin/course/:id/analytics" element={<CourseOwnerRoute><CourseAnalytics /></CourseOwnerRoute>} />
            <Route path="/admin/course/:courseId/student/:studentId" element={<CourseOwnerRoute><StudentDetail /></CourseOwnerRoute>} />
            <Route path="/admin/course/:courseId/student/:studentId/progress" element={<CourseOwnerRoute><StudentProgressDetail /></CourseOwnerRoute>} />
            <Route path="/admin/course/:courseId/quizzes" element={<CourseOwnerRoute><QuizManage /></CourseOwnerRoute>} />
            <Route path="/admin/course/:courseId/quiz/:quizId/analytics" element={<CourseOwnerRoute><QuizAnalytics /></CourseOwnerRoute>} />

            {/* Home - redirects to My Learning if enrolled, otherwise Marketplace */}
            <Route path="/" element={<HomePage />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/course/:id" element={<CourseLanding />} />

            {/* My Learning & My Courses - tabs on StudentDashboard */}
            <Route path="/my-learning" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
            <Route path="/my-courses" element={<ProtectedRoute><StudentDashboard defaultTab="created" /></ProtectedRoute>} />

            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/my-activity" element={<ProtectedRoute><MyActivity /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/course/:id" element={<ProtectedRoute><StudentCourseDetails /></ProtectedRoute>} />
            {/* Public route for lecture view - checks preview status internally */}
            <Route path="/course/:id/lecture/:lectureId" element={<CourseView />} />
            <Route path="/course/:courseId/quiz/:quizId" element={<ProtectedRoute><QuizTake /></ProtectedRoute>} />

            {/* Marketplace routes - protected */}
            <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
            <Route path="/my-purchases" element={<ProtectedRoute><MyPurchases /></ProtectedRoute>} />

            {/* AI Chat - any logged-in user */}
            <Route path="/ai-chat" element={<ProtectedRoute><AIChatPage /></ProtectedRoute>} />
            <Route path="/ai-settings" element={<ProtectedRoute><StudentAISettings /></ProtectedRoute>} />

            {/* Invoice - public (shareable via link) */}
            <Route path="/invoice/:invoiceNumber" element={<InvoicePage />} />


            {/* Instructor routes */}
            <Route path="/become-instructor" element={<ProtectedRoute><BecomeInstructor /></ProtectedRoute>} />
            <Route path="/instructor/dashboard" element={<InstructorRoute><InstructorDashboard /></InstructorRoute>} />
            <Route path="/instructor/create-course" element={<InstructorRoute><CreateMarketplaceCourse /></InstructorRoute>} />
            <Route path="/instructor/courses" element={<InstructorRoute><InstructorDashboard /></InstructorRoute>} />
            <Route path="/instructor/course/:id/edit" element={<InstructorRoute><CourseManage /></InstructorRoute>} />
            <Route path="/instructor/course/:id/coupons" element={<InstructorRoute><InstructorCoupons /></InstructorRoute>} />
            <Route path="/instructor/ai-settings" element={<InstructorRoute><AISettings /></InstructorRoute>} />
            <Route path="/instructor/payment-settings" element={<InstructorRoute><InstructorPaymentSettings /></InstructorRoute>} />

            {/* 404 Not Found - Catch all undefined routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      {!isAuthRoute && <Footer />}
      {!isAuthRoute && <AuthenticatedFloatingButton />}
    </div>

  );
};

export default App;
