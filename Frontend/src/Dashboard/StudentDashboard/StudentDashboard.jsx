import { BookOpen, CalendarCheck, FileText, Megaphone, User, Wallet, LogOut } from "lucide-react";
import "./StudentDashboard.css";
import logo from "@/assets/P_LOGO.png";
import { clearAuthSession, getAuthUser } from "@/features/authStorage.js";

const cards = [
  { title: "My Profile", icon: User },
  { title: "Attendance", icon: CalendarCheck },
  { title: "Results", icon: FileText },
  { title: "Fee Details", icon: Wallet },
  { title: "Announcements", icon: Megaphone },
];

function readUser() {
  return getAuthUser();
}

export default function StudentDashboard() {
  const user = readUser();
  const logout = () => {
    clearAuthSession();
    window.location.assign("/login");
  };

  return (
    <div className="student-dashboard">
      <header className="student-topbar">
        <div className="student-brand">
          <img src={logo} alt="Pirnav College logo" />
          <div><strong>Pirnav College</strong><span>Student Portal</span></div>
        </div>
        <div className="student-actions">
          <span>{user?.name || "Student"}</span>
          <button type="button" onClick={logout}><LogOut size={16} /> Logout</button>
        </div>
      </header>
      <main className="student-main">
        <div className="student-hero">
          <span><BookOpen size={16} /> Portal</span>
          <h1>Student Dashboard</h1>
          <p>Welcome to Pirnav College portal.</p>
        </div>
        <section className="student-card-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            return <article key={card.title} className="student-card"><Icon size={22} /><h2>{card.title}</h2><p>Implementation pending</p></article>;
          })}
        </section>
      </main>
    </div>
  );
}


