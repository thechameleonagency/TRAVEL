import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Users, Image as ImageIcon, MessageSquare, User } from 'lucide-react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import HomePage from './pages/Home';
import GroupsPage from './pages/Groups';
import MemoriesPage from './pages/Memories';
import LoginPage from './pages/Login';
import CreateExperiencePage from './pages/CreateExperience';
import ExperienceDetail from './pages/ExperienceDetail';
import ChatsPage from './pages/Chats';
import ChatRoomPage from './pages/ChatRoom';
import ProfilePage from './pages/Profile';
import Onboarding from './pages/Onboarding';
import GroupDetail from './pages/GroupDetail';

function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="bottom-nav">
      <Link to="/" className={`nav-item ${path === '/' ? 'active' : ''}`}>
        <Home size={24} />
        <span>Plans</span>
      </Link>
      <Link to="/groups" className={`nav-item ${path === '/groups' ? 'active' : ''}`}>
        <Users size={24} />
        <span>My People</span>
      </Link>
      <Link to="/chats" className={`nav-item ${path === '/chats' ? 'active' : ''}`}>
        <MessageSquare size={24} />
        <span>Chats</span>
      </Link>
      <Link to="/memories" className={`nav-item ${path === '/memories' ? 'active' : ''}`}>
        <ImageIcon size={24} />
        <span>Memories</span>
      </Link>
      <Link to="/profile" className={`nav-item ${path === '/profile' ? 'active' : ''}`}>
        <User size={24} />
        <span>Profile</span>
      </Link>
    </div>
  );
}

function MainApp() {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  if (!currentUser) return <LoginPage />;

  // Quick check for Onboarding
  const needsOnboarding = !localStorage.getItem(`onboarded_${currentUser.uid}`);
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Onboarding />;
  }

  // Hide nav on certain full screen views if needed
  const hideNav = location.pathname === '/onboarding';

  return (
    <>
      <div className="content-area">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/group/:id" element={<GroupDetail />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/chat/:id" element={<ChatRoomPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/create-experience" element={<CreateExperiencePage />} />
          <Route path="/experience/:id" element={<ExperienceDetail />} />
        </Routes>
      </div>
      {!hideNav && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainApp />
      </Router>
    </AuthProvider>
  );
}

export default App;
