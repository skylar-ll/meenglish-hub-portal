import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Student Portal
import StudentSignUp from "./pages/student/StudentSignUp";
import StudentLogin from "./pages/student/StudentLogin";
import CourseSelection from "./pages/student/CourseSelection";
import TeacherSelection from "./pages/student/TeacherSelection";
import CourseDurationSelection from "./pages/student/CourseDurationSelection";
import BranchSelection from "./pages/student/BranchSelection";
import Payment from "./pages/student/Payment";
import CoursePage from "./pages/student/CoursePage";
import StudentAttendance from "./pages/student/StudentAttendance";

// Teacher Portal
import TeacherLogin from "./pages/teacher/TeacherLogin";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherQuizzes from "./pages/teacher/TeacherQuizzes";
import QuizAttempts from "./pages/teacher/QuizAttempts";
import QuizAttemptDetail from "./pages/teacher/QuizAttemptDetail";

// Student Quiz
import StudentQuizzes from "./pages/student/StudentQuizzes";
import TakeQuiz from "./pages/student/TakeQuiz";
import StudentNotes from "./pages/student/StudentNotes";

// Admin Portal
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherDetail from "./pages/admin/TeacherDetail";
import AdminStudentReports from "./pages/admin/StudentReports";
import StudentManagement from "./pages/admin/StudentManagement";

// Student Reports
import StudentReports from "./pages/student/StudentReports";
import StudentPayments from "./pages/student/StudentPayments";

// Teacher Features
import AssignedStudents from "./pages/teacher/AssignedStudents";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Student Portal Routes */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/signup" element={<StudentSignUp />} />
          <Route path="/student/course-selection" element={<CourseSelection />} />
          <Route path="/student/teacher-selection" element={<TeacherSelection />} />
          <Route path="/student/duration-selection" element={<CourseDurationSelection />} />
          <Route path="/student/branch-selection" element={<BranchSelection />} />
          <Route path="/student/payment" element={<Payment />} />
          <Route path="/student/course" element={<CoursePage />} />
          <Route path="/student/attendance" element={<StudentAttendance />} />
          <Route path="/student/course-page" element={<CoursePage />} />
          <Route path="/student/quizzes" element={<StudentQuizzes />} />
          <Route path="/student/quiz/:quizId" element={<TakeQuiz />} />
          <Route path="/student/notes" element={<StudentNotes />} />
          <Route path="/student/payments" element={<StudentPayments />} />
          
          {/* Teacher Portal Routes */}
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
          <Route path="/teacher/quizzes/:quizId" element={<QuizAttempts />} />
          <Route path="/teacher/quizzes/:quizId/attempts/:attemptId" element={<QuizAttemptDetail />} />
          <Route path="/teacher/students" element={<AssignedStudents />} />
          
          {/* Admin Portal Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/teacher/:teacherId" element={<TeacherDetail />} />
          <Route path="/admin/reports" element={<AdminStudentReports />} />
          <Route path="/admin/students" element={<StudentManagement />} />
          
          {/* Student Reports */}
          <Route path="/student/reports" element={<StudentReports />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
