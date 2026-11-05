import React, { useState, useEffect, useCallback } from 'react';
import { authAPI, carsAPI, servicesAPI, bookingsAPI } from './api';

/* ============================================================
   CSMS — Car Service Management System
   Complete React Frontend (Single-File)
   ============================================================ */

// ── Helpers ──────────────────────────────────────────────────
const TOKEN_KEY = 'csms_token';
const USER_KEY = 'csms_user';

function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
function getSavedUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}
function getSavedToken() {
  return localStorage.getItem(TOKEN_KEY);
}

const CAR_DATABASE = {
  'Toyota': ['Camry', 'Corolla', 'Fortuner', 'Innova', 'Glanza', 'Urban Cruiser', 'Other'],
  'Honda': ['City', 'Civic', 'Amaze', 'Elevate', 'WR-V', 'Other'],
  'Hyundai': ['i20', 'Creta', 'Venue', 'Verna', 'Tucson', 'Other'],
  'Maruti Suzuki': ['Baleno', 'Swift', 'WagonR', 'Brezza', 'Dzire', 'Fronx', 'Other'],
  'Mahindra': ['XUV700', 'Thar', 'Scorpio', 'XUV300', 'Bolero', 'Other'],
  'Tata': ['Nexon', 'Harrier', 'Safari', 'Punch', 'Tiago', 'Other'],
  'Kia': ['Seltos', 'Sonet', 'Carens', 'Other'],
  'Volkswagen': ['Polo', 'Vento', 'Taigun', 'Virtus', 'Other'],
  'Ford': ['EcoSport', 'Endeavour', 'Figo', 'Other'],
  'Skoda': ['Slavia', 'Kushaq', 'Octavia', 'Other'],
  'MG': ['Hector', 'Astor', 'Gloster', 'Other'],
  'Renault': ['Duster', 'Kiger', 'Triber', 'Other'],
  'Jeep': ['Compass', 'Meridian', 'Other'],
  'Nissan': ['Magnite', 'Kicks', 'Other'],
  'Other': ['Other']
};

const SERVICE_TYPES = [
  'Oil Change', 'Brake Inspection', 'Tyre Rotation / Replacement',
  'Engine Check', 'Battery Replacement', 'AC Service',
  'Wheel Alignment', 'Full Service', 'Suspension Check',
  'Transmission Service', 'Other'
];

const SERVICE_PRICES = {
  'Oil Change': 599,
  'Brake Inspection': 399,
  'Tyre Rotation / Replacement': 799,
  'Engine Check': 999,
  'Battery Replacement': 1499,
  'AC Service': 1299,
  'Wheel Alignment': 699,
  'Full Service': 3499,
  'Suspension Check': 899,
  'Transmission Service': 1999,
  'Other': 0,
};

const PICKUP_OPTIONS = [
  '-- Select Details --', 'Standard Pickup', 'Express Pickup',
  'Home Delivery', 'Owner Pickup', 'Requires Towing'
];

const STATUS_STEPS = ['pending', 'accepted', 'in_progress', 'completed'];
const STATUS_LABELS = { pending: 'Submitted', accepted: 'Accepted', in_progress: 'In Progress', completed: 'Completed' };
const STATUS_ICONS = { pending: '📋', accepted: '✅', in_progress: '🔧', completed: '⚙️' };

// Helper: calculate estimated amount from a service description
const calcServiceAmount = (description) => {
  if (!description) return 0;
  return Object.entries(SERVICE_PRICES).reduce((sum, [name, price]) => {
    return description.toLowerCase().includes(name.toLowerCase()) ? sum + price : sum;
  }, 0);
};

// Helper: parse individual service types from a description string
const parseServices = (description) => {
  if (!description) return [];
  // Description format: "Oil Change, Brake Inspection — notes"
  const mainPart = description.split('—')[0].split('–')[0];
  return SERVICE_TYPES.filter(t => mainPart.toLowerCase().includes(t.toLowerCase()));
};

function getTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatBookingDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day}-${months[monthIdx]}-${year}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(getSavedUser);
  const [page, setPage] = useState('home');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
  }, [darkMode]);

  // Auto-validate token on mount
  useEffect(() => {
    const token = getSavedToken();
    if (token && user) {
      authAPI.me().then(u => {
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        setPage(u.is_staff ? 'admin' : 'dashboard');
      }).catch(() => { clearAuth(); setUser(null); });
    }
  }, []);

  const handleLogin = (token, userData) => {
    saveAuth(token, userData);
    setUser(userData);
    setPage(userData.is_staff ? 'admin' : 'dashboard');
  };

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    clearAuth();
    setUser(null);
    setPage('home');
  };

  const toggleTheme = () => setDarkMode(d => !d);

  // ── Routing ──────────────────────────────────────────────
  if (!user) {
    // Public pages
    if (page === 'login') return <LoginPage onLogin={handleLogin} setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} />;
    if (page === 'register') return <RegisterPage onLogin={handleLogin} setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} />;
    if (page === 'admin-login') return <AdminLoginPage onLogin={handleLogin} setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} />;
    if (page === 'about') return <AboutPage setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} />;
    return <HomePage setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} />;
  }

  if (user.is_staff) {
    return <AdminDashboard user={user} onLogout={handleLogout} setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} />;
  }

  return (
    <UserLayout user={user} page={page} setPage={setPage} onLogout={handleLogout} darkMode={darkMode} toggleTheme={toggleTheme}>
      {page === 'dashboard' && <DashboardPage user={user} setPage={setPage} />}
      {page === 'add-car' && <AddCarPage user={user} />}
      {page === 'garage' && <GarageStatusPage />}
      {page === 'services' && <ServiceRequestPage user={user} />}
      {page === 'settings' && <SettingsPage user={user} setUser={setUser} onLogout={handleLogout} />}
    </UserLayout>
  );
}


/* ============================================================
   PUBLIC PAGES
   ============================================================ */

// ── Public Navbar ────────────────────────────────────────────
function PublicNavbar({ setPage, darkMode, toggleTheme, activePage }) {
  return (
    <nav className="public-navbar">
      <div className="nav-brand" onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
        <span className="brand-icon">🚗</span>
        <span>Car services</span>
      </div>
      <div className="nav-links">
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle Dark/Light Mode">{darkMode ? '🌙' : '☀️'}</button>
        <button className={`nav-btn ${activePage === 'home' ? 'active' : ''}`} onClick={() => setPage('home')}>🏠 Home</button>
        <button className={`nav-btn ${activePage === 'about' ? 'active' : ''}`} onClick={() => setPage('about')}>ℹ️ About</button>
        <button className={`nav-btn ${activePage === 'login' ? 'active' : ''}`} onClick={() => setPage('login')}>🔑 Sign In</button>
        <button className={`nav-btn ${activePage === 'admin-login' ? 'active' : ''}`} onClick={() => setPage('admin-login')}>🔐 Admin</button>
      </div>
    </nav>
  );
}

// ── Home / Landing Page ──────────────────────────────────────
function HomePage({ setPage, darkMode, toggleTheme }) {
  return (
    <div className="landing-wrap">
      <PublicNavbar setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} activePage="home" />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1>
            Your Car Deserves<br/>
            <span className="highlight">Expert Care<span className="cursor-blink"></span></span>
          </h1>
          <p>
            From routine checkups and high-precision diagnostics to doorstep pickups and transparent digital invoicing — we bring complete convenience and reliability to your car care.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="landing-stats-grid">
        <div className="landing-stat-card">
          <div className="landing-stat-num">5,000+</div>
          <div className="landing-stat-label">Services Completed</div>
        </div>
        <div className="landing-stat-card">
          <div className="landing-stat-num">99.4%</div>
          <div className="landing-stat-label">On-Time Turnaround</div>
        </div>
        <div className="landing-stat-card">
          <div className="landing-stat-num">15+</div>
          <div className="landing-stat-label">Certified Mechanics</div>
        </div>
        <div className="landing-stat-card">
          <div className="landing-stat-num">4.9 / 5</div>
          <div className="landing-stat-label">Customer Satisfaction</div>
        </div>
      </div>

      {/* Services Section */}
      <section className="landing-section">
        <div className="landing-header">
          <div className="landing-badge">🛠️ What We Offer</div>
          <h2 className="landing-title">Complete Automotive Care & Solutions</h2>
          <p className="landing-subtitle">
            Every service is conducted by qualified automotive technicians using industry-standard tools and 100% genuine parts.
          </p>
        </div>

        <div className="landing-grid">
          <div className="landing-card">
            <span className="landing-card-icon">🛢️</span>
            <h3>Engine Oil & Filter Service</h3>
            <p>Premium grade synthetic and mineral oil replacements with OEM filters for maximum engine life and fuel efficiency.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icon">🛑</span>
            <h3>Brake & Suspension Overhaul</h3>
            <p>Precision pad replacements, rotor resurfacing, caliper testing, and suspension tuning for supreme road safety.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icon">❄️</span>
            <h3>AC & Climate Diagnostics</h3>
            <p>Comprehensive refrigerant top-ups, compressor inspection, leak checks, and deep cabin filter disinfection.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icon">⚡</span>
            <h3>Battery & Electrical Systems</h3>
            <p>Battery computerized health checks, alternator testing, and warranty-backed replacements with zero hassle.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icon">🚚</span>
            <h3>Home Delivery & Doorstep Pickup</h3>
            <p>Convenient pickup and drop options right from your doorstep, with live real-time coordination.</p>
          </div>
          <div className="landing-card">
            <span className="landing-card-icon">🔍</span>
            <h3>40-Point Comprehensive Inspection</h3>
            <p>Full-spectrum safety analysis covering powertrain, tires, brakes, fluids, lighting, and onboard computers.</p>
          </div>
        </div>
      </section>

      {/* About Preview Section */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="about-preview-box">
          <div>
            <div className="landing-badge">ℹ️ About Our Platform</div>
            <h2 className="landing-title" style={{ textAlign: 'left', fontSize: '2rem' }}>
              Built for Modern Car Owners & Garages
            </h2>
            <p className="landing-subtitle" style={{ textAlign: 'left', marginBottom: 24 }}>
              Our platform bridges the gap between drivers and certified service centers. We eliminate repair guesswork through live status tracking, transparent non-negative costs, and reliable date scheduling.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-hero-primary" onClick={() => setPage('about')}>
                Read Full Story
              </button>
              <button className="btn-hero-outline" onClick={() => setPage('admin-login')}>
                Admin Portal 🔐
              </button>
            </div>
          </div>

          <div className="about-preview-points">
            <div className="about-point">
              <span className="about-point-icon">⚡</span>
              <div>
                <h4>Live Service Status</h4>
                <p>Track every milestone: Accepted → In Progress → Ready for Delivery.</p>
              </div>
            </div>
            <div className="about-point">
              <span className="about-point-icon">💰</span>
              <div>
                <h4>Zero Hidden Costs</h4>
                <p>Clear, positive pricing upfront with complete itemized parts transparency.</p>
              </div>
            </div>
            <div className="about-point">
              <span className="about-point-icon">📅</span>
              <div>
                <h4>Smart Date Scheduling</h4>
                <p>Prevent outdated schedule conflicts with real-time pickup date management.</p>
              </div>
            </div>
            <div className="about-point">
              <span className="about-point-icon">🛡️</span>
              <div>
                <h4>Certified Guarantee</h4>
                <p>Every single service is backed by strict quality and satisfaction standards.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-cta-banner">
          <h2>Ready To Experience Hassle-Free Car Care?</h2>
          <p>
            Register your vehicle in seconds, choose your preferred service, and let our verified experts take care of the rest.
          </p>
          <div className="landing-cta-btns">
            <button className="btn-cta-white" onClick={() => setPage('register')}>
              🚀 Get Started Now
            </button>
            <button className="btn-cta-ghost" onClick={() => setPage('login')}>
              🔑 Sign In to Your Account
            </button>
            <button className="btn-cta-ghost" onClick={() => setPage('admin-login')}>
              🔐 Admin Portal
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── About Page ───────────────────────────────────────────────
function AboutPage({ setPage, darkMode, toggleTheme }) {
  return (
    <div className="landing-wrap">
      <PublicNavbar setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} activePage="about" />

      <section className="about-page">
        <div className="landing-section">
          <div className="landing-header">
            <div className="landing-badge">ℹ️ About Us</div>
            <h1 className="landing-title">Empowering Smarter, Transparent Car Care</h1>
            <p className="landing-subtitle">
              We connect vehicle owners with verified mechanics through digital convenience, transparent pricing, and dependable workmanship.
            </p>
          </div>

          <div className="about-preview-box" style={{ marginBottom: 50 }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: 16 }}>Our Mission</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                Car servicing has historically suffered from opaque repair charges, unclear schedules, and no visibility into workshop progress.
              </p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Car Service Management System (CSMS) was designed to make car care as transparent as ordering food online. With instant booking, live tracking, fair positive pricing, and doorstep delivery options, you stay in full control.
              </p>
            </div>
            <div className="about-preview-points">
              <div className="about-point">
                <span className="about-point-icon">🎯</span>
                <div>
                  <h4>100% Transparent</h4>
                  <p>Upfront billing with zero hidden fees or unexpected charges.</p>
                </div>
              </div>
              <div className="about-point">
                <span className="about-point-icon">👨‍🔧</span>
                <div>
                  <h4>Master Technicians</h4>
                  <p>Equipped with state-of-the-art diagnostic computers and OEM tools.</p>
                </div>
              </div>
              <div className="about-point">
                <span className="about-point-icon">⚡</span>
                <div>
                  <h4>Rapid Turnaround</h4>
                  <p>Optimized garage management ensures on-time vehicle completion.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-header" style={{ marginTop: 60, marginBottom: 40 }}>
            <div className="landing-badge">🔄 How It Works</div>
            <h2 className="landing-title">Four Simple Steps to Quality Car Care</h2>
          </div>

          <div className="landing-grid">
            <div className="landing-card">
              <span className="landing-card-icon">1️⃣</span>
              <h3>Register Your Vehicle</h3>
              <p>Add your car details including make, model, year, and plate number in under 30 seconds.</p>
            </div>
            <div className="landing-card">
              <span className="landing-card-icon">2️⃣</span>
              <h3>Select Services & Date</h3>
              <p>Pick the services you need (oil change, brake repair, inspections) and choose your preferred date.</p>
            </div>
            <div className="landing-card">
              <span className="landing-card-icon">3️⃣</span>
              <h3>Live Progress Tracking</h3>
              <p>Watch your repair progress update in real-time from Accepted to In Progress and Ready for Pickup.</p>
            </div>
            <div className="landing-card">
              <span className="landing-card-icon">4️⃣</span>
              <h3>Doorstep Delivery or Pickup</h3>
              <p>Receive your fully serviced car with an itemized digital receipt and health overview.</p>
            </div>
          </div>

          <div className="landing-cta-banner" style={{ marginTop: 70 }}>
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of drivers who keep their vehicles running smoothly with our platform.</p>
            <div className="landing-cta-btns">
              <button className="btn-cta-white" onClick={() => setPage('register')}>
                🚀 Get Started
              </button>
              <button className="btn-cta-ghost" onClick={() => setPage('login')}>
                🔑 Sign In
              </button>
              <button className="btn-cta-ghost" onClick={() => setPage('admin-login')}>
                🔐 Admin Access
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Login Page ───────────────────────────────────────────────
function LoginPage({ onLogin, setPage, darkMode, toggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await authAPI.login(username, password);
      onLogin(data.token, data.user);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <>
      <PublicNavbar setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} activePage="login" />
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-icon">🚙</div>
          <h2>car service</h2>
          <p className="auth-subtitle">Welcome back! Please enter your details.</p>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label>Username</label>
            <input className="form-input" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          <p className="auth-footer">Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setPage('register'); }}>Register</a></p>
        </form>
      </div>
    </>
  );
}

// ── Register Page ────────────────────────────────────────────
function RegisterPage({ onLogin, setPage, darkMode, toggleTheme }) {
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', phone: '', password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await authAPI.register(form);
      onLogin(data.token, data.user);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <>
      <PublicNavbar setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} activePage="register" />
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
          <div className="auth-icon">📝</div>
          <h2>Create Account</h2>
          <p className="auth-subtitle">Join us and manage your vehicles effortlessly.</p>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label>Username *</label>
            <input className="form-input" placeholder="Choose a username" value={form.username} onChange={e => update('username', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input className="form-input" type="email" placeholder="Enter your email" value={form.email} onChange={e => update('email', e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input className="form-input" placeholder="First name" value={form.first_name} onChange={e => update('first_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input className="form-input" placeholder="Last name" value={form.last_name} onChange={e => update('last_name', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input className="form-input" placeholder="Phone number" value={form.phone} onChange={e => update('phone', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input className="form-input" type="password" placeholder="Password" value={form.password} onChange={e => update('password', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input className="form-input" type="password" placeholder="Confirm" value={form.confirm_password} onChange={e => update('confirm_password', e.target.value)} required />
            </div>
          </div>
          <button className="btn-submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
          <p className="auth-footer">Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setPage('login'); }}>Sign In</a></p>
        </form>
      </div>
    </>
  );
}

// ── Admin Login Page ─────────────────────────────────────────
function AdminLoginPage({ onLogin, setPage, darkMode, toggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await authAPI.login(username, password);
      if (!data.user.is_staff) { setError('Access denied. Admin accounts only.'); setLoading(false); return; }
      onLogin(data.token, data.user);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <>
      <PublicNavbar setPage={setPage} darkMode={darkMode} toggleTheme={toggleTheme} activePage="admin-login" />
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-icon">🛡️</div>
          <h2>Admin Login</h2>
          <p className="auth-subtitle">Restricted access — administrators only.</p>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label>Admin ID</label>
            <input className="form-input" placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn-submit" disabled={loading}>🔒 {loading ? 'Logging in...' : 'Login'}</button>
        </form>
      </div>
    </>
  );
}


/* ============================================================
   AUTHENTICATED USER LAYOUT (Sidebar)
   ============================================================ */
function UserLayout({ user, page, setPage, onLogout, children, darkMode, toggleTheme }) {
  const links = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'add-car', icon: '🚗', label: 'Add Car Details' },
    { id: 'garage', icon: '🏗️', label: 'Garage Status' },
    { id: 'services', icon: '🔧', label: 'Request Service' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  const pageTitle = links.find(l => l.id === page)?.label || 'Dashboard';
  const pageSubtitle = {
    dashboard: 'Overview and status of your vehicle service appointments',
    'add-car': 'Register your vehicles for service tracking',
    garage: 'Monitor vehicle repair status in real time',
    services: 'Track maintenance and service records',
    settings: '',
  }[page] || '';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">🚗</div>
          <div className="brand-text">
            <span className="brand-name">car service</span>
            <span className="brand-sub">Management System</span>
          </div>
        </div>
        <div className="sidebar-label">MAIN MENU</div>
        <nav className="sidebar-nav">
          {links.map(l => (
            <button key={l.id} className={`sidebar-link ${page === l.id ? 'active' : ''}`} onClick={() => setPage(l.id)}>
              <span className="link-icon">{l.icon}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="theme-switch" onClick={toggleTheme}>
            {darkMode ? '🌙' : '☀️'} {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div className="sidebar-version">CarManager v1.0</div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <h1>{page === 'services' ? 'Services' : page === 'settings' ? 'car service' : pageTitle}</h1>
              {pageSubtitle && <span className="topbar-subtitle">{pageSubtitle}</span>}
            </div>
          </div>
          <div className="topbar-right">
            {page === 'services' && (
              <button className="topbar-action-btn" onClick={() => document.dispatchEvent(new Event('open-service-modal'))}>
                + Request Service
              </button>
            )}
            <button className="theme-toggle" onClick={toggleTheme} style={{background:'none',border:'none',fontSize:'1.2rem',cursor:'pointer'}}>
              {darkMode ? '🌙' : '☀️'}
            </button>
            <span className="topbar-user">
              <span className="user-emoji">👋</span>
              Hi, {user.first_name || user.username} {user.last_name || ''}
            </span>
            <button className="btn-logout" onClick={onLogout}>🚪 Logout</button>
          </div>
        </header>
        <div className="page-container">{children}</div>
      </div>
    </div>
  );
}


/* ============================================================
   USER PAGES
   ============================================================ */

// ── Dashboard ────────────────────────────────────────────────
function DashboardPage({ user, setPage }) {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [myCars, setMyCars] = useState([]);

  const loadData = useCallback(() => {
    bookingsAPI.stats().then(setStats).catch(() => {});
    bookingsAPI.list().then(data => setBookings(Array.isArray(data) ? data : data.results || [])).catch(() => {});
    carsAPI.list().then(data => setMyCars(Array.isArray(data) ? data : data.results || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalBookings = stats?.total_bookings ?? bookings.length;
  const upcomingCount = stats?.upcoming_bookings ?? bookings.filter(b => ['Pending', 'Confirmed', 'Mechanic Assigned', 'pending', 'confirmed'].includes(b.status)).length;
  const completedCount = stats?.completed_bookings ?? bookings.filter(b => (b.status || '').toLowerCase() === 'completed').length;
  const cancelledCount = stats?.cancelled_bookings ?? bookings.filter(b => (b.status || '').toLowerCase() === 'cancelled').length;

  return (
    <>
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div className="stat-info">
            <h3>{totalBookings}</h3>
            <p>Total Bookings</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⏳</div>
          <div className="stat-info">
            <h3>{upcomingCount}</h3>
            <p>Upcoming</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <h3>{completedCount}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">❌</div>
          <div className="stat-info">
            <h3>{cancelledCount}</h3>
            <p>Cancelled</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>📋 My Recent Bookings</h3>
          </div>
          {bookings.length === 0 ? (
            <div className="empty-state"><p>No service bookings found.</p></div>
          ) : (
            <div className="cars-list">
              {bookings.slice(0, 5).map(b => (
                <div key={b.id} className="car-item" style={{ padding: '12px 16px' }}>
                  <div className="car-item-left">
                    <span className="car-emoji">🚗</span>
                    <div className="car-item-info">
                      <h4>{b.booking_id || `CSMS/${1000 + b.id}`} — {b.service_name}</h4>
                      <p>{b.car_model} ({b.car_registration_number}) · 📅 {formatBookingDate(b.booking_date)}</p>
                    </div>
                  </div>
                  <span className={`status-badge ${b.status}`}>{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dash-card">
          <h3>🚗 My Vehicles</h3>
          {myCars.length === 0 ? (
            <div className="empty-state"><p>No vehicles registered yet.</p></div>
          ) : (
            <div className="cars-list">
              {myCars.slice(0, 5).map(car => (
                <div key={car.id} className="car-item" style={{ padding: '12px 16px' }}>
                  <div className="car-item-left">
                    <span className="car-emoji">🚙</span>
                    <div className="car-item-info">
                      <h4>{car.make} {car.model}</h4>
                      <p>{car.year} · {car.plate_number}</p>
                    </div>
                  </div>
                  <span className={`status-badge ${car.status}`}>{car.status?.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Customer: My Bookings Page ───────────────────────────────
function MyBookingsPage({ user, setPage }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmBooking, setConfirmBooking] = useState(null);
  const [successBooking, setSuccessBooking] = useState(null);
  const [noticeBooking, setNoticeBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingsAPI.list();
      setBookings(Array.isArray(data) ? data : data.results || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const canCancel = (b) => {
    const s = (b.status || '').toLowerCase();
    return s === 'pending' || s === 'confirmed' || s === 'mechanic assigned' || s === 'assigned';
  };

  const handleConfirmCancel = async () => {
    if (!confirmBooking) return;
    setCancelling(true);
    setErrorMessage('');
    try {
      const res = await bookingsAPI.cancel(confirmBooking.id, { cancelled_by: 'customer' });
      const target = confirmBooking;
      setConfirmBooking(null);
      setSuccessBooking(res || {
        ...target,
        status: 'Cancelled',
        cancelled_by: 'customer'
      });
      loadBookings();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to cancel service booking.');
    }
    setCancelling(false);
  };

  return (
    <>
      <div className="service-page-header">
        <h2>📋 My Bookings</h2>
        <p>View your scheduled car service appointments and track cancellation status</p>
      </div>

      {errorMessage && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No service bookings found. Click "Request Service" to book an appointment.</p>
        </div>
      ) : (
        <div className="garage-grid">
          {bookings.map(b => {
            const bId = b.booking_id || `CSMS/${1000 + b.id}`;
            const isEligible = canCancel(b);
            const isCancelled = (b.status || '').toLowerCase() === 'cancelled';

            return (
              <div key={b.id} className="garage-card">
                <div className="garage-card-header">
                  <div>
                    <h4>🚗 {bId}</h4>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{b.service_name || 'Car Service'}</p>
                  </div>
                  <span className={`status-badge ${b.status}`}>{b.status}</span>
                </div>

                <div className="garage-card-details" style={{ marginTop: 12 }}>
                  <div className="garage-detail-row">
                    <span className="label">Car Model</span>
                    <span className="value">{b.car_model}</span>
                  </div>
                  <div className="garage-detail-row">
                    <span className="label">Reg Number</span>
                    <span className="value">{b.car_registration_number}</span>
                  </div>
                  <div className="garage-detail-row">
                    <span className="label">Booking Date</span>
                    <span className="value">📅 {formatBookingDate(b.booking_date)}</span>
                  </div>
                  <div className="garage-detail-row">
                    <span className="label">Price</span>
                    <span className="value">₹{Number(b.price || 0).toLocaleString()}</span>
                  </div>
                  {b.notes && (
                    <div className="garage-detail-row">
                      <span className="label">Notes</span>
                      <span className="value">{b.notes}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {isEligible ? (
                    <button className="btn-cancel-danger" onClick={() => setConfirmBooking(b)}>
                      Cancel Booking
                    </button>
                  ) : isCancelled ? (
                    <button className="btn-keep-secondary" style={{ fontSize: '0.82rem' }} onClick={() => setNoticeBooking(b)}>
                      ℹ️ View Cancellation Info
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Status: {b.status}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmBooking && (
        <div className="cancellation-modal-overlay" onClick={() => setConfirmBooking(null)}>
          <div className="cancellation-modal-card" onClick={e => e.stopPropagation()}>
            <div className="cancellation-modal-header">
              <h3>Cancel Booking</h3>
              <button className="modal-close" onClick={() => setConfirmBooking(null)}>✕</button>
            </div>
            <p style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '16px 0 24px 0' }}>
              Are you sure you want to cancel this service booking?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-cancel-danger" onClick={handleConfirmCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
              <button className="btn-keep-secondary" onClick={() => setConfirmBooking(null)} disabled={cancelling}>
                No, Keep Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS NOTIFICATION MODAL */}
      {successBooking && (
        <div className="cancellation-modal-overlay" onClick={() => setSuccessBooking(null)}>
          <div className="cancellation-modal-card" onClick={e => e.stopPropagation()}>
            <div className="cancellation-success-box">
              <div className="success-title">
                <span>{successBooking.email_sent === false ? '⚠️' : '✅'}</span> Service Cancelled Successfully
              </div>
              <p style={{ margin: '8px 0', fontSize: '0.95rem', fontWeight: 500 }}>
                {successBooking.website_message || `Your car service booking ${successBooking.booking_id || `CSMS/${1000 + successBooking.id}`} has been cancelled successfully.`}
              </p>
              <div className="cancellation-details-list">
                <div><strong>Booking ID:</strong> {successBooking.booking_id || `CSMS/${1000 + successBooking.id}`}</div>
                <div><strong>Service:</strong> {successBooking.service_name || 'Car Service'}</div>
                <div><strong>Car Model:</strong> {successBooking.car_model}</div>
                <div><strong>Date:</strong> {formatBookingDate(successBooking.booking_date)}</div>
                <div><strong>Status:</strong> Cancelled</div>
              </div>
              <p style={{ margin: '12px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                If you need the service again, you can book a new appointment anytime.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setSuccessBooking(null)}>
                OK, Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLED BOOKING NOTICE MODAL */}
      {noticeBooking && (
        <div className="cancellation-modal-overlay" onClick={() => setNoticeBooking(null)}>
          <div className="cancellation-modal-card" onClick={e => e.stopPropagation()}>
            {noticeBooking.cancelled_by === 'admin' ? (
              <div className="cancellation-admin-box">
                <div className="admin-cancel-title">
                  <span>⚠️</span> Service Booking Cancelled
                </div>
                <p style={{ margin: '8px 0', fontSize: '0.95rem' }}>
                  Your car service booking <strong>{noticeBooking.booking_id || `CSMS/${1000 + noticeBooking.id}`}</strong> has been cancelled by the service center.
                </p>
                <div className="cancellation-details-list">
                  <div><strong>Service:</strong> {noticeBooking.service_name || 'Car Service'}</div>
                  <div><strong>Date:</strong> {formatBookingDate(noticeBooking.booking_date)}</div>
                </div>
                <p style={{ margin: '12px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Please contact the service center or book another appointment.
                </p>
              </div>
            ) : (
              <div className="cancellation-success-box">
                <div className="success-title">
                  <span>ℹ️</span> Service Cancelled Successfully
                </div>
                <p style={{ margin: '8px 0', fontSize: '0.95rem' }}>
                  Your car service booking <strong>{noticeBooking.booking_id || `CSMS/${1000 + noticeBooking.id}`}</strong> has been cancelled successfully.
                </p>
                <div className="cancellation-details-list">
                  <div><strong>Service:</strong> {noticeBooking.service_name || 'Car Service'}</div>
                  <div><strong>Date:</strong> {formatBookingDate(noticeBooking.booking_date)}</div>
                  <div><strong>Status:</strong> Cancelled</div>
                </div>
                <p style={{ margin: '12px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  If you need the service again, you can book a new appointment anytime.
                </p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setNoticeBooking(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Customer: Service History Page ───────────────────────────
function ServiceHistoryPage({ user }) {
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    bookingsAPI.list().then(data => {
      const list = Array.isArray(data) ? data : data.results || [];
      // Service history contains ONLY completed services
      setCompletedBookings(list.filter(b => (b.status || '').toLowerCase() === 'completed'));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="service-page-header">
        <h2>📜 Service History</h2>
        <p>Archive of all completed vehicle maintenance and repair services</p>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : completedBookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <p>No completed services found in your history.</p>
        </div>
      ) : (
        <div className="garage-grid">
          {completedBookings.map(b => (
            <div key={b.id} className="garage-card">
              <div className="garage-card-header">
                <div>
                  <h4>🚗 {b.booking_id || `CSMS/${1000 + b.id}`}</h4>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{b.service_name || 'Car Service'}</p>
                </div>
                <span className="status-badge completed">Completed</span>
              </div>
              <div className="garage-card-details" style={{ marginTop: 12 }}>
                <div className="garage-detail-row">
                  <span className="label">Car Model</span>
                  <span className="value">{b.car_model}</span>
                </div>
                <div className="garage-detail-row">
                  <span className="label">Reg Number</span>
                  <span className="value">{b.car_registration_number}</span>
                </div>
                <div className="garage-detail-row">
                  <span className="label">Completed Date</span>
                  <span className="value">📅 {formatBookingDate(b.booking_date)}</span>
                </div>
                <div className="garage-detail-row">
                  <span className="label">Price</span>
                  <span className="value">₹{Number(b.price || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Add Car Details Page ─────────────────────────────────────
function AddCarPage({ user }) {
  const [form, setForm] = useState({ make: '', model: '', year: new Date().getFullYear(), color: '', plate_number: '', mileage: 0 });
  const [myCars, setMyCars] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCars = () => carsAPI.list().then(d => setMyCars(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  useEffect(() => { loadCars(); }, []);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.mileage !== '' && Number(form.mileage) < 0) {
      setError('Mileage must be a positive number (0 or greater).');
      return;
    }
    setError(''); setMsg(''); setLoading(true);
    try {
      await carsAPI.create({ ...form, mileage: Math.max(0, parseInt(form.mileage, 10) || 0) });
      setMsg('Vehicle added successfully!');
      setForm({ make: '', model: '', year: new Date().getFullYear(), color: '', plate_number: '', mileage: 0 });
      loadCars();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleRemoveCar = async (id) => {
    if (window.confirm("Are you sure you want to remove this vehicle?")) {
      setError(''); setMsg('');
      try {
        await carsAPI.remove(id);
        setMsg('Vehicle removed successfully!');
        loadCars();
      } catch (err) {
        setError('Failed to remove vehicle: ' + err.message);
      }
    }
  };

  return (
    <div className="car-form-page">
      <div className="card-section">
        <h2>🚗 Add New Vehicle</h2>
        <p className="section-desc">Register a vehicle to request services and track its status</p>
        {error && <div className="form-error">{error}</div>}
        {msg && <div className="form-success">{msg}</div>}
        <form onSubmit={handleSubmit}>
          <div className="car-grid">
            <div className="form-group">
              <label>Make *</label>
              <select className="form-input" value={form.make} onChange={e => { update('make', e.target.value); update('model', ''); }} required>
                <option value="">-- Select Make --</option>
                {Object.keys(CAR_DATABASE).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Model *</label>
              <select className="form-input" value={form.model} onChange={e => update('model', e.target.value)} required disabled={!form.make}>
                <option value="">-- Select Model --</option>
                {form.make && CAR_DATABASE[form.make]?.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Year *</label>
              <input className="form-input" type="number" value={form.year} onChange={e => update('year', parseInt(e.target.value))} required />
            </div>
            <div className="form-group">
              <label>Color</label>
              <input className="form-input" placeholder="e.g. Silver" value={form.color} onChange={e => update('color', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Plate Number *</label>
              <input className="form-input" placeholder="e.g. KA23AB1234" value={form.plate_number} onChange={e => update('plate_number', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Mileage (km)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="e.g. 15000"
                value={form.mileage}
                onKeyDown={e => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === '') {
                    update('mileage', '');
                  } else {
                    const parsed = parseInt(raw, 10);
                    update('mileage', isNaN(parsed) ? 0 : Math.max(0, parsed));
                  }
                }}
              />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <button className="btn-primary" disabled={loading}>{loading ? 'Submitting...' : '🚗 Submit Vehicle'}</button>
          </div>
        </form>
      </div>

      {myCars.length > 0 && (
        <div className="card-section">
          <h2>📋 My Registered Vehicles</h2>
          <p className="section-desc">{myCars.length} vehicle(s) registered</p>
          <div className="cars-list">
            {myCars.map(car => (
              <div key={car.id} className="car-item" style={{ alignItems: 'center' }}>
                <div className="car-item-left">
                  <span className="car-emoji">🚙</span>
                  <div className="car-item-info">
                    <h4>{car.make} {car.model} ({car.year})</h4>
                    <p>Plate: {car.plate_number} · Color: {car.color} · Mileage: {car.mileage} km</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className={`status-badge ${car.status}`}>
                    {car.status === 'available' ? '✅' : car.status === 'pending' ? '⏳' : '🔧'} {car.status?.replace('_', ' ')}
                  </span>
                  <button className="btn-cancel-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleRemoveCar(car.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Garage Status Page ───────────────────────────────────────
function GarageStatusPage() {
  const [cars, setCars] = useState([]);

  useEffect(() => {
    carsAPI.list().then(d => setCars(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  }, []);

  return (
    <>
      <div className="service-page-header">
        <h2>🏗️ Garage Status</h2>
        <p>View the current status of all your vehicles</p>
      </div>
      {cars.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏗️</div>
          <p>No vehicles found. Add a car first!</p>
        </div>
      ) : (
        <div className="garage-grid">
          {cars.map(car => (
            <div key={car.id} className="garage-card">
              <div className="garage-card-header">
                <div>
                  <h4>🚙 {car.make} {car.model}</h4>
                  <p>{car.year} · {car.color}</p>
                </div>
                <span className={`status-badge ${car.status}`}>{car.status?.replace('_', ' ')}</span>
              </div>
              <div className="garage-card-details">
                <div className="garage-detail-row">
                  <span className="label">Plate Number</span>
                  <span className="value">{car.plate_number}</span>
                </div>
                <div className="garage-detail-row">
                  <span className="label">Mileage</span>
                  <span className="value">{car.mileage?.toLocaleString()} km</span>
                </div>
                <div className="garage-detail-row">
                  <span className="label">Submitted By</span>
                  <span className="value">{car.submitted_by_username || '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Service Request Page ─────────────────────────────────────
function ServiceRequestPage({ user }) {
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [myCars, setMyCars] = useState([]);

  const loadServices = useCallback(() => {
    servicesAPI.list().then(d => setServices(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadServices();
    carsAPI.list().then(d => setMyCars(Array.isArray(d) ? d : d.results || [])).catch(() => {});

    const handler = () => setShowModal(true);
    document.addEventListener('open-service-modal', handler);
    return () => document.removeEventListener('open-service-modal', handler);
  }, [loadServices]);

  return (
    <>
      <div className="service-page-header">
        <h2>🔧 Request Service</h2>
        <p>Submit a service request and track its status in real time</p>
      </div>

      <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>📋 My Service Requests</h3>

      {services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🛠️</div>
          <p>No service requests yet. Click "+ Request Service" to get started.</p>
        </div>
      ) : (
        <div className="service-requests-list">
          {services.map(svc => (
            <ServiceRequestCard key={svc.id} svc={svc} />
          ))}
        </div>
      )}

      {showModal && (
        <ServiceRequestModal
          cars={myCars}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadServices(); }}
        />
      )}
    </>
  );
}

function ServiceRequestCard({ svc }) {
  const currentStep = STATUS_STEPS.indexOf(svc.status);
  const displayCost = Number(svc.cost) > 0 ? Number(svc.cost) : calcServiceAmount(svc.description);

  return (
    <div className="service-request-card">
      <div className="svc-card-header">
        <div>
          <h4>🚗 {svc.car_display || `Car #${svc.car}`}</h4>
          <p>📋 {svc.description}</p>
        </div>
        <span className={`status-badge ${svc.status}`}>
          {STATUS_ICONS[svc.status] || '📋'} {svc.status?.replace('_', ' ')}
        </span>
      </div>

      <div className="svc-meta-tags">
        {svc.service_date && <span className="meta-tag">📅 Ready by: {svc.service_date}</span>}
        {svc.pickup_details && <span className="meta-tag">🚚 {svc.pickup_details}</span>}
        {displayCost > 0 && <span className="meta-tag cost">💰 Amount: ₹{displayCost.toLocaleString('en-IN')}</span>}
      </div>

      {/* Timeline */}
      <div className="svc-timeline">
        {STATUS_STEPS.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <React.Fragment key={step}>
              <div className="timeline-step">
                <div className={`timeline-dot ${isCompleted ? 'completed' : isCurrent ? 'current' : ''}`}>
                  {isCompleted ? '✓' : STATUS_ICONS[step]}
                </div>
                <span className={`timeline-label ${isCompleted ? 'active' : isCurrent ? 'current' : ''}`}>
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`timeline-line ${isCompleted ? 'active' : isCurrent ? 'partial' : ''}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function ServiceRequestModal({ cars, onClose, onCreated }) {
  const today = getTodayDate();
  const [form, setForm] = useState({ car: '', service_date: today, description: '', notes: '' });
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleType = (t) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const totalAmount = selectedTypes.reduce((sum, t) => sum + (SERVICE_PRICES[t] || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.car || !form.service_date || selectedTypes.length === 0) {
      setError('Please fill in car, date, and at least one service type.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const desc = selectedTypes.join(', ') + (form.notes ? ` — ${form.notes}` : '');
      await servicesAPI.create({
        car: parseInt(form.car),
        service_date: form.service_date,
        description: desc,
        cost: totalAmount,
      });
      onCreated();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔧 Submit Service Request</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Your Car *</label>
            <select className="form-input" value={form.car} onChange={e => update('car', e.target.value)} required>
              <option value="">-- Choose a car --</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.make} {c.model} ({c.plate_number})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Service Date *</label>
            <input className="form-input" type="date" min={today} value={form.service_date} onChange={e => update('service_date', e.target.value)} required />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ margin: 0 }}>Select Services Required *</label>
              {selectedTypes.length > 0 && (
                <span className="service-total-badge">
                  {selectedTypes.length} service{selectedTypes.length > 1 ? 's' : ''} · ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <div className="service-chips">
              {SERVICE_TYPES.map(t => (
                <button
                  type="button"
                  key={t}
                  className={`service-chip ${selectedTypes.includes(t) ? 'selected' : ''}`}
                  onClick={() => toggleType(t)}
                >
                  <span className="chip-name">{t}</span>
                  {SERVICE_PRICES[t] > 0 && (
                    <span className="chip-price">₹{SERVICE_PRICES[t].toLocaleString('en-IN')}</span>
                  )}
                  {SERVICE_PRICES[t] === 0 && (
                    <span className="chip-price">Custom</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Additional Notes (optional)</label>
            <textarea className="form-input" rows={3} placeholder="Any extra details..." value={form.notes} onChange={e => update('notes', e.target.value)} />
          </div>
          {selectedTypes.length > 0 && (
            <div className="service-summary-box">
              <div className="service-summary-row">
                <span>Selected Services ({selectedTypes.length})</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedTypes.join(', ')}</span>
              </div>
              <div className="service-summary-row service-summary-total">
                <span>Estimated Total</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
          <button className="btn-submit" disabled={loading}>{loading ? 'Submitting...' : '🔧 Submit Request'}</button>
        </form>
      </div>
    </div>
  );
}

// ── Settings Page ────────────────────────────────────────────
function SettingsPage({ user, setUser, onLogout }) {
  const [profile, setProfile] = useState({ first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '' });
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [notifications, setNotifications] = useState({ inApp: true, email: true });
  const [currency] = useState('₹ INR (Indian Rupee)');
  const [delConfirm, setDelConfirm] = useState(false);

  const updateProfile = async () => {
    setProfileErr(''); setProfileMsg('');
    try {
      const data = await authAPI.updateProfile(profile);
      setProfileMsg(data.message || 'Profile updated!');
      if (data.user) {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
    } catch (err) { setProfileErr(err.message); }
  };

  const changePassword = async () => {
    setPwErr(''); setPwMsg('');
    try {
      const data = await authAPI.changePassword(pwForm);
      setPwMsg(data.message || 'Password changed!');
      setPwForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) { setPwErr(err.message); }
  };

  const deleteAccount = async () => {
    try {
      await fetch('/api/auth/delete-account/', { method: 'DELETE', headers: { Authorization: `Token ${getSavedToken()}` } });
      clearAuth();
      onLogout();
    } catch {}
  };

  const initials = (user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase();

  return (
    <div className="settings-page">
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Account & System Settings</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 24 }}>
        Manage your profile details, update password, and configure application settings
      </p>

      {/* Profile Section */}
      <div className="settings-section">
        <div className="profile-header">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-header-info">
            <h4>{user.first_name} {user.last_name}</h4>
            <p>{user.email}</p>
            <span className={`role-badge ${user.is_staff ? 'admin' : 'user'}`}>
              {user.is_staff ? 'Admin' : 'Standard User'}
            </span>
          </div>
        </div>
        {profileErr && <div className="form-error">{profileErr}</div>}
        {profileMsg && <div className="form-success">{profileMsg}</div>}
        <div className="form-row">
          <div className="form-group">
            <label>Username</label>
            <input className="form-input" value={user.username} disabled />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input className="form-input" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <input className="form-input" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input className="form-input" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn-primary" onClick={updateProfile}>Save Profile</button>
        </div>
      </div>

      {/* Change Password */}
      <div className="settings-section">
        <h3>🔑 Change Password</h3>
        <p className="section-desc">Update your login security credentials</p>
        {pwErr && <div className="form-error">{pwErr}</div>}
        {pwMsg && <div className="form-success">{pwMsg}</div>}
        <div className="form-group">
          <label>Old Password *</label>
          <input className="form-input" type="password" placeholder="Enter current password" value={pwForm.old_password} onChange={e => setPwForm(p => ({ ...p, old_password: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>New Password *</label>
            <input className="form-input" type="password" placeholder="Enter new password" value={pwForm.new_password} onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Confirm New Password *</label>
            <input className="form-input" type="password" placeholder="Re-enter new password" value={pwForm.confirm_password} onChange={e => setPwForm(p => ({ ...p, confirm_password: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn-primary" onClick={changePassword}>Update Password</button>
        </div>
      </div>

      {/* System Preferences */}
      <div className="settings-section">
        <h3>⚙️ System Preferences</h3>
        <p className="section-desc">Configure general application settings</p>
        <div className="form-group">
          <label>Currency Symbol</label>
          <input className="form-input" value={currency} disabled />
        </div>
        <div className="toggle-row">
          <div className="toggle-row-info">
            <h4>In-App Notifications</h4>
            <p>Receive live alerts for vehicle status changes</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={notifications.inApp} onChange={e => setNotifications(n => ({ ...n, inApp: e.target.checked }))} />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="toggle-row">
          <div className="toggle-row-info">
            <h4>Email Notifications</h4>
            <p>Get email reports for completed service appointments</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={notifications.email} onChange={e => setNotifications(n => ({ ...n, email: e.target.checked }))} />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn-primary" onClick={() => alert('Preferences saved!')}>Save Preferences</button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section danger-section">
        <h3>⚠️ Danger Zone</h3>
        <p className="section-desc">Permanently delete your account and all associated data</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Once you delete your account, there is no going back. Please be certain.
        </p>
        {!delConfirm ? (
          <button className="btn-danger" onClick={() => setDelConfirm(true)}>Delete My Account</button>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn-danger" onClick={deleteAccount}>⚠️ Yes, Delete Permanently</button>
            <button className="btn-sm" onClick={() => setDelConfirm(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
function AdminDashboard({ user, onLogout, setPage, darkMode, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [cars, setCars] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, usersData, carsData, svcData] = await Promise.all([
        bookingsAPI.stats().catch(() => ({})),
        authAPI.listUsers().catch(() => []),
        carsAPI.list().catch(() => []),
        servicesAPI.list().catch(() => []),
      ]);
      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCars(Array.isArray(carsData) ? carsData : carsData?.results || []);
      setServices(Array.isArray(svcData) ? svcData : svcData?.results || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const nonAdminUsers = users.filter(u => !u.is_staff);
  const pendingCars = cars.filter(c => c.status === 'pending');
  const pendingServices = services.filter(s => s.status === 'pending');
  const activeServices = services.filter(s => s.status !== 'completed' && s.status !== 'rejected');

  const TABS = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'users', icon: '👥', label: 'User Accounts' },
    { id: 'vehicles', icon: '🚗', label: 'Vehicle Approval' },
    { id: 'service-requests', icon: '📋', label: 'Service Requests' },
    { id: 'service-update', icon: '🔄', label: 'Service Update', badge: activeServices.length || null },
  ];

  return (
    <div className="admin-layout">
      {/* Admin Top Bar */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <h1>Admin Dashboard</h1>
          <p>System control panel</p>
        </div>
        <div className="admin-topbar-right">
          <button className="nav-btn" onClick={() => { clearAuth(); onLogout(); }}>🏠 Home</button>
          <button className="btn-logout" onClick={onLogout}>🚪 Logout</button>
        </div>
      </header>

      <div className="admin-body">
        {/* Welcome Banner */}
        <div className="admin-welcome">
          <div className="welcome-icon">🛡️</div>
          <h2>Welcome, {user.username}!</h2>
          <p>Review service requests, manage user accounts, approve vehicles, and control the system.</p>
          <div className="admin-welcome-links">
            <a href="#" onClick={e => { e.preventDefault(); setActiveTab('service-requests'); }}>📋 View Service Requests</a>
            <a href="#" onClick={e => { e.preventDefault(); setActiveTab('service-update'); }}>
              🔧 Update Service Progress {activeServices.length > 0 && <span className="badge-count">{activeServices.length}</span>}
            </a>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="admin-stats-bar">
          <div className="admin-stat-item">
            <div className="stat-value">{nonAdminUsers.length}</div>
            <div className="stat-bar blue"></div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="admin-stat-item">
            <div className="stat-value">{cars.length}</div>
            <div className="stat-bar green"></div>
            <div className="stat-label">Vehicles</div>
          </div>
          <div className="admin-stat-item">
            <div className="stat-value">{activeServices.length}</div>
            <div className="stat-bar orange"></div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="admin-stat-item">
            <div className="stat-value">{services.filter(s => s.status === 'completed').length}</div>
            <div className="stat-bar purple"></div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="admin-stat-item">
            <div className="stat-value">₹{services.reduce((sum, s) => sum + (Number(s.cost) || calcServiceAmount(s.description) || 0), 0).toLocaleString('en-IN')}</div>
            <div className="stat-bar green"></div>
            <div className="stat-label">Total Amount</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`admin-tab ${activeTab === tab.id ? 'active' : ''} ${tab.id === 'service-update' && activeTab === tab.id ? 'orange' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
              {tab.badge && <span className="tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <>
            {activeTab === 'overview' && <AdminOverviewTab stats={stats} users={nonAdminUsers} cars={cars} services={services} />}
            {activeTab === 'users' && <AdminUsersTab users={nonAdminUsers} onRefresh={loadData} />}
            {activeTab === 'vehicles' && <AdminVehiclesTab cars={cars} onRefresh={loadData} />}
            {activeTab === 'service-requests' && <AdminServiceRequestsTab services={services} onRefresh={loadData} />}
            {activeTab === 'service-update' && <AdminServiceUpdateTab services={services} onRefresh={loadData} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Admin: Bookings Tab ──────────────────────────────────────
function AdminBookingsTab({ onRefresh }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingsAPI.list();
      setBookings(Array.isArray(data) ? data : data.results || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdminCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking as Admin?")) return;
    try {
      const res = await bookingsAPI.cancel(id, { cancelled_by: 'admin' });
      alert(res?.website_message || "Booking cancelled successfully.");
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking.');
    }
  };

  return (
    <div className="admin-tab-content">
      <h3>📋 Service Bookings Management</h3>
      <p className="tab-desc">{bookings.length} total bookings recorded in the system</p>
      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>BOOKING ID</th>
              <th>CUSTOMER</th>
              <th>CAR MODEL</th>
              <th>REGISTRATION NUMBER</th>
              <th>SERVICE</th>
              <th>DATE</th>
              <th>PRICE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => {
              const bId = b.booking_id || `CSMS/${1000 + b.id}`;
              const isEligible = ['pending', 'confirmed', 'mechanic assigned', 'assigned'].includes((b.status || '').toLowerCase());
              return (
                <tr key={b.id}>
                  <td><strong>{bId}</strong></td>
                  <td>👤 {b.customer_name || 'Customer'}</td>
                  <td>{b.car_model}</td>
                  <td>{b.car_registration_number}</td>
                  <td>{b.service_name || 'Car Service'}</td>
                  <td>📅 {formatBookingDate(b.booking_date)}</td>
                  <td>₹{Number(b.price || 0).toLocaleString()}</td>
                  <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                  <td>
                    {isEligible ? (
                      <button className="btn-sm red" onClick={() => handleAdminCancel(b.id)}>
                        ❌ Cancel Booking
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Admin: Overview Tab ──────────────────────────────────────
function AdminOverviewTab({ stats, users, cars, services }) {
  const totalAmount = services.reduce((sum, s) => sum + (Number(s.cost) || calcServiceAmount(s.description) || 0), 0);
  const completedAmount = services.filter(s => s.status === 'completed').reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
  const activeAmount = services.filter(s => s.status !== 'completed' && s.status !== 'rejected').reduce((sum, s) => sum + (Number(s.cost) || calcServiceAmount(s.description) || 0), 0);

  return (
    <div className="admin-tab-content">
      <h3>📊 System Overview</h3>
      <p className="tab-desc">Summary of system-wide activity and metrics</p>
      <div className="admin-overview-grid">
        <div className="overview-card">
          <h4 className="blue">👥 User Accounts</h4>
          <div className="overview-stat-row"><span className="label">Total:</span><span className="value">{users.length}</span></div>
          <div className="overview-stat-row"><span className="label">Active:</span><span className="value">{users.filter(u => u.is_active).length}</span></div>
          <div className="overview-stat-row"><span className="label">Pending:</span><span className="value">{users.filter(u => !u.is_active).length}</span></div>
        </div>
        <div className="overview-card">
          <h4 className="red">🚗 Vehicles</h4>
          <div className="overview-stat-row"><span className="label">Total:</span><span className="value">{cars.length}</span></div>
          <div className="overview-stat-row"><span className="label">Available:</span><span className="value">{cars.filter(c => c.status === 'available').length}</span></div>
          <div className="overview-stat-row"><span className="label">Pending Approval:</span><span className="value">{cars.filter(c => c.status === 'pending').length}</span></div>
        </div>
        <div className="overview-card">
          <h4 className="green">🔧 Service Requests</h4>
          <div className="overview-stat-row"><span className="label">Total:</span><span className="value">{services.length}</span></div>
          <div className="overview-stat-row"><span className="label">Pending Review:</span><span className="value">{services.filter(s => s.status === 'pending').length}</span></div>
          <div className="overview-stat-row"><span className="label">In Progress:</span><span className="value">{services.filter(s => s.status === 'in_progress').length}</span></div>
          <div className="overview-stat-row"><span className="label">Completed:</span><span className="value">{services.filter(s => s.status === 'completed').length}</span></div>
        </div>
        <div className="overview-card">
          <h4 className="purple">💰 Revenue & Amount</h4>
          <div className="overview-stat-row"><span className="label">Total Amount:</span><span className="value" style={{ fontWeight: 700, color: 'var(--accent-yellow, #f59e0b)' }}>₹{totalAmount.toLocaleString('en-IN')}</span></div>
          <div className="overview-stat-row"><span className="label">Completed Revenue:</span><span className="value">₹{completedAmount.toLocaleString('en-IN')}</span></div>
          <div className="overview-stat-row"><span className="label">Active Services:</span><span className="value">₹{activeAmount.toLocaleString('en-IN')}</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Admin: Users Tab ─────────────────────────────────────────
function AdminUsersTab({ users, onRefresh }) {
  const toggleUser = async (id) => {
    try {
      await fetch(`/api/auth/users/${id}/toggle-status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getSavedToken()}` },
      });
      onRefresh();
    } catch {}
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user account?")) return;
    try {
      const res = await fetch(`/api/auth/users/${id}/delete/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getSavedToken()}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete user.");
      }
      onRefresh();
    } catch (err) { alert(err.message); }
  };

  const deleteAllUsers = async () => {
    if (users.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${users.length} registered user accounts?`)) return;
    try {
      await Promise.all(users.map(u => fetch(`/api/auth/users/${u.id}/delete/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${getSavedToken()}` },
      })));
      onRefresh();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="admin-tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0 }}>👥 User Accounts Management</h3>
          <p className="tab-desc" style={{ margin: '4px 0 0' }}>{users.length} total users registered in the system</p>
        </div>
        {users.length > 0 && (
          <button className="btn-sm btn-danger" onClick={deleteAllUsers} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            🗑️ Delete All Users
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>👥</p>
          <h4 style={{ margin: '0 0 0.5rem' }}>No User Accounts Found</h4>
          <p style={{ color: 'var(--text-muted, #888)', margin: 0 }}>All standard user account data has been cleared from the system.</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>USERNAME</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>
                  <div className="user-cell">
                    <span className="name">{u.username}</span>
                    <span className="sub">{u.first_name} {u.last_name}</span>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>User</td>
                <td>
                  <span className={`status-badge ${u.is_active ? 'available' : 'rejected'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button className={`btn-sm ${u.is_active ? 'red' : 'green'}`} onClick={() => toggleUser(u.id)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn-sm" onClick={() => deleteUser(u.id)} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Admin: Vehicle Approval Tab ──────────────────────────────
function AdminVehiclesTab({ cars, onRefresh }) {
  const [statusUpdates, setStatusUpdates] = useState({});
  const [carNotes, setCarNotes] = useState({});

  const updateCar = async (id) => {
    const newStatus = statusUpdates[id];
    const note = carNotes[id];
    if (!newStatus && !note) return;
    try {
      const payload = {};
      if (newStatus) payload.status = newStatus;
      await carsAPI.update(id, payload);
      onRefresh();
    } catch (err) { alert(err.message); }
  };

  const deleteCar = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await carsAPI.remove(id);
      onRefresh();
    } catch (err) { alert(err.message); }
  };

  const deleteAllCars = async () => {
    if (cars.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${cars.length} vehicles?`)) return;
    try {
      await Promise.all(cars.map(c => carsAPI.remove(c.id)));
      onRefresh();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="admin-tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0 }}>🚗 Vehicle Status Management</h3>
          <p className="tab-desc" style={{ margin: '4px 0 0' }}>{cars.length} vehicles · {cars.filter(c => c.status === 'pending').length} pending</p>
        </div>
        {cars.length > 0 && (
          <button className="btn-sm btn-danger" onClick={deleteAllCars} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            🗑️ Delete All Cars
          </button>
        )}
      </div>

      {cars.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>🚗</p>
          <h4 style={{ margin: '0 0 0.5rem' }}>No Vehicle Records Found</h4>
          <p style={{ color: 'var(--text-muted, #888)', margin: 0 }}>All vehicle data has been cleared from the system.</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>VEHICLE</th>
              <th>PLATE</th>
              <th>SUBMITTED BY</th>
              <th>CURRENT STATUS</th>
              <th>UPDATE STATUS</th>
              <th>CAR STATUS NOTE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {cars.map((car, i) => (
              <tr key={car.id}>
                <td>{i + 1}</td>
                <td>
                  <div className="user-cell">
                    <span className="name">{car.make} {car.model}</span>
                    <span className="sub">{car.year}</span>
                  </div>
                </td>
                <td>{car.plate_number}</td>
                <td>👤 {car.submitted_by_username || 'Unknown'}</td>
                <td><span className={`status-badge ${car.status}`}>{car.status?.replace('_', ' ')}</span></td>
                <td>
                  <select className="admin-select" value={statusUpdates[car.id] || car.status} onChange={e => setStatusUpdates(s => ({ ...s, [car.id]: e.target.value }))}>
                    <option value="pending">⏳ Pending</option>
                    <option value="available">✅ Available</option>
                    <option value="in_service">🔧 In Service</option>
                    <option value="completed">⚙️ Completed</option>
                  </select>
                </td>
                <td>
                  <input
                    className="admin-status-note-input"
                    type="text"
                    placeholder="Type custom status note..."
                    value={carNotes[car.id] || ''}
                    onChange={e => setCarNotes(n => ({ ...n, [car.id]: e.target.value }))}
                  />
                  {carNotes[car.id] && (
                    <div className="admin-status-note-preview">📝 {carNotes[car.id]}</div>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      className="btn-sm"
                      style={(statusUpdates[car.id] && statusUpdates[car.id] !== car.status) || carNotes[car.id] ? { backgroundColor: 'var(--primary, #3b82f6)', color: '#fff', fontWeight: 'bold' } : {}}
                      onClick={() => updateCar(car.id)}
                    >
                      {(statusUpdates[car.id] && statusUpdates[car.id] !== car.status) || carNotes[car.id] ? 'Update' : 'No Change'}
                    </button>
                    <button className="btn-sm" onClick={() => deleteCar(car.id)} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Admin: Service Requests Tab (Accept/Reject) ──────────────
function AdminServiceRequestsTab({ services, onRefresh }) {
  const pending = services.filter(s => s.status === 'pending');

  const updateStatus = async (id, status, defaultCost) => {
    try {
      const payload = { status };
      if (defaultCost !== undefined && defaultCost > 0) {
        payload.cost = defaultCost;
      }
      const res = await servicesAPI.updateStatus(id, payload);
      if (res && res.message) alert(res.message);
      onRefresh();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="admin-tab-content">
      <h3>📋 Service Requests — Accept / Reject</h3>
      <p className="tab-desc">{pending.length} pending review · Review and accept or reject incoming requests</p>
      {pending.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No service requests to review.</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>VEHICLE</th>
              <th>REQUESTED BY</th>
              <th>DATE</th>
              <th>SERVICES &amp; AMOUNT</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((svc, i) => {
              const parsedServices = parseServices(svc.description);
              const hasCustomNote = svc.description?.includes('—') || svc.description?.includes('–');
              const customNote = hasCustomNote ? svc.description.split(/[—–]/)[1]?.trim() : '';
              const estTotal = svc.cost ? Number(svc.cost) : calcServiceAmount(svc.description);
              return (
                <tr key={svc.id}>
                  <td>{i + 1}</td>
                  <td>{svc.car_display || `Car #${svc.car}`}</td>
                  <td>👤 {svc.requested_by_username}</td>
                  <td>📅 {svc.service_date}</td>
                  <td>
                    <div className="admin-service-breakdown">
                      {parsedServices.length > 0 ? (
                        parsedServices.map(s => (
                          <div key={s} className="admin-service-line">
                            <span className="admin-service-name">🔧 {s}</span>
                            <span className="admin-service-price">₹{SERVICE_PRICES[s].toLocaleString('en-IN')}</span>
                          </div>
                        ))
                      ) : (
                        <div className="admin-service-line">
                          <span className="admin-service-name">{svc.description?.substring(0, 40)}</span>
                        </div>
                      )}
                      {customNote && (
                        <div className="admin-service-note">📝 {customNote}</div>
                      )}
                      <div className="admin-service-total">
                        <span>Total</span>
                        <span>₹{estTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-sm green" onClick={() => updateStatus(svc.id, 'accepted', estTotal)}>✅ Accept</button>
                      <button className="btn-sm red" onClick={() => updateStatus(svc.id, 'rejected')}>❌ Reject</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Admin: Service Update Tab ────────────────────────────────
function AdminServiceUpdateTab({ services, onRefresh }) {
  const today = getTodayDate();
  const active = services.filter(s => s.status !== 'rejected' && s.status !== 'pending');
  const [updates, setUpdates] = useState({});

  const setField = (id, field, val) => {
    setUpdates(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const applyUpdate = async (svc) => {
    const u = updates[svc.id] || {};
    const effectivePickupDate = u.pickup_date !== undefined
      ? u.pickup_date
      : (svc.pickup_date && svc.pickup_date >= today ? svc.pickup_date : today);

    const defaultAmount = Number(svc.cost) > 0 ? Number(svc.cost) : calcServiceAmount(svc.description);

    const payload = {};
    if (u.status && u.status !== svc.status) payload.status = u.status;
    
    // Always apply pickup date if user changed it OR if previous date was in the past / unset
    if (u.pickup_date !== undefined) {
      if (u.pickup_date !== (svc.pickup_date || '')) {
        payload.pickup_date = u.pickup_date;
      }
    } else if (!svc.pickup_date || svc.pickup_date < today) {
      payload.pickup_date = effectivePickupDate;
    }

    if (u.pickup_details && u.pickup_details !== (svc.pickup_details || '')) {
      payload.pickup_details = u.pickup_details;
    }
    if (u.cost !== undefined && u.cost !== '') {
      const cleanCost = Math.max(0, parseFloat(u.cost) || 0);
      if (String(cleanCost) !== String(svc.cost ?? '')) {
        payload.cost = cleanCost;
      }
    } else if (!svc.cost || Number(svc.cost) === 0) {
      if (defaultAmount > 0) {
        payload.cost = defaultAmount;
      }
    }

    if (Object.keys(payload).length === 0) {
      if (effectivePickupDate && effectivePickupDate !== svc.pickup_date) {
        payload.pickup_date = effectivePickupDate;
      } else {
        return;
      }
    }

    try {
      await servicesAPI.updateStatus(svc.id, payload);
      setUpdates(prev => {
        const copy = { ...prev };
        delete copy[svc.id];
        return copy;
      });
      onRefresh();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="admin-tab-content">
      <h3>🔄 Service Progress Update</h3>
      <p className="tab-desc">{active.length} active services · Update status: Accepted → In Progress → Completed</p>
      {active.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔧</div>
          <p>No active services to update.</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>VEHICLE</th>
              <th>DATE</th>
              <th>AMOUNT</th>
              <th>CURRENT STATUS</th>
              <th>UPDATE STATUS</th>
              <th>PICKUP DATE & DETAILS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {active.map((svc, i) => {
              const u = updates[svc.id] || {};
              const isPast = Boolean(svc.pickup_date && svc.pickup_date < today);
              const effectivePickupDate = u.pickup_date !== undefined
                ? u.pickup_date
                : (svc.pickup_date && svc.pickup_date >= today ? svc.pickup_date : today);

              const defaultCost = Number(svc.cost) > 0 ? Number(svc.cost) : calcServiceAmount(svc.description);
              const displayAmount = u.cost !== undefined && u.cost !== '' ? (parseFloat(u.cost) || 0) : defaultCost;
              const hasCostChange = u.cost !== undefined && u.cost !== ''
                ? String(parseFloat(u.cost) || 0) !== String(parseFloat(svc.cost) || 0)
                : (!svc.cost || Number(svc.cost) === 0) && defaultCost > 0;

              const hasChanges =
                (u.status && u.status !== svc.status) ||
                (u.pickup_date !== undefined && u.pickup_date !== (svc.pickup_date || '')) ||
                isPast ||
                (!svc.pickup_date && Boolean(effectivePickupDate)) ||
                (u.pickup_details && u.pickup_details !== (svc.pickup_details || '')) ||
                hasCostChange;

              return (
                <tr key={svc.id}>
                  <td>{i + 1}</td>
                  <td>
                    <div className="user-cell">
                      <span className="name">{svc.car_display || `Car #${svc.car}`}</span>
                      <span className="sub">{svc.description?.substring(0, 30)}</span>
                    </div>
                  </td>
                  <td>📅 {svc.service_date}</td>
                  <td>
                    <span className="admin-amount-badge">
                      ₹{displayAmount.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td><span className={`status-badge ${svc.status}`}>🔧 {svc.status?.replace('_', ' ')}</span></td>
                  <td>
                    <select className="admin-select" value={u.status || svc.status} onChange={e => setField(svc.id, 'status', e.target.value)}>
                      <option value="accepted">✅ Accepted</option>
                      <option value="in_progress">🔧 In Progress</option>
                      <option value="completed">⚙️ Completed</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        className="admin-date-input"
                        type="date"
                        min={today}
                        value={effectivePickupDate}
                        onChange={e => setField(svc.id, 'pickup_date', e.target.value)}
                        title="Pickup date (minimum: today)"
                      />
                      {isPast && (
                        <span style={{ fontSize: '0.72rem', color: '#f87171' }}>
                          ⚠️ Past date ({svc.pickup_date}) → Updated to today ({today})
                        </span>
                      )}
                      <select className="admin-select" value={u.pickup_details || svc.pickup_details || ''} onChange={e => setField(svc.id, 'pickup_details', e.target.value)}>
                        {PICKUP_OPTIONS.map(o => <option key={o} value={o === '-- Select Details --' ? '' : o}>{o}</option>)}
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--accent-yellow)' }}>₹</span>
                        <input
                          className="admin-amount-input"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Amount"
                          value={u.cost !== undefined ? u.cost : (Number(svc.cost) > 0 ? svc.cost : (defaultCost || ''))}
                          onKeyDown={e => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                          onChange={e => {
                            let val = e.target.value;
                            if (val !== '') {
                              const num = parseFloat(val);
                              if (isNaN(num) || num < 0) {
                                val = '0';
                              }
                            }
                            setField(svc.id, 'cost', val);
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn-sm"
                      style={hasChanges ? { backgroundColor: 'var(--primary, #3b82f6)', color: '#fff', fontWeight: 'bold' } : {}}
                      onClick={() => applyUpdate(svc)}
                    >
                      {hasChanges ? 'Update' : 'No Change'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
