import { useState, useEffect } from "react";

// Types
interface Ticket {
  id: string;
  title: string;
  description: string;
  urgency: string;
  category: string;
  priority_score: number;
  status: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [error, setError] = useState("");
  
  // New state for handling the view toggle
  const [viewMode, setViewMode] = useState<'client' | 'agent'>('client');

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_URL}/tickets`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        localStorage.setItem("token", data.access_token);
      } else {
        setError("Incorrect email or password");
      }
    } catch (err) {
      setError("Login failed");
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
    setViewMode('client'); // Auto-redirect to client view on logout
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, client_id: "demo_client" }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setSubmitSuccess(true);
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaim = async (ticketId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/tickets/${ticketId}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 selection:bg-emerald-500/30">
      
      {/* Top Navigation Bar */}
{/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/70 border-b border-zinc-800/80 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Logo & Brand (flex-1 ensures this takes equal space as the right side) */}
        <div className="flex-1 flex items-center justify-start space-x-3 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l3 3-3 3m5 0h3M4 6h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-50">Router</h1>
        </div>

        {/* View Toggle (Segmented Control) */}
        <div className="flex bg-zinc-900/80 border border-zinc-800 rounded-lg p-1 shadow-inner shrink-0">
          <button
            onClick={() => setViewMode('client')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              viewMode === 'client' 
                ? 'bg-zinc-800 text-zinc-100 shadow' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Client Portal
          </button>
          <button
            onClick={() => setViewMode('agent')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              viewMode === 'agent' 
                ? 'bg-zinc-800 text-zinc-100 shadow' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Agent Workspace
          </button>
        </div>

        {/* Right Side: Social Links & Logout (flex-1 balances the left side) */}
        <div className="flex-1 flex justify-end items-center space-x-5 w-full sm:w-auto min-w-[80px]">
          
          <div className="flex items-center space-x-3 text-zinc-500">
            <a href="https://github.com/AbhinavJD7/auto-ticket-router" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-200 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <a href="https://x.com/abhinav_rai966" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-200 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="mailto:abhinavrai966@gmail.com" className="hover:text-zinc-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </a>
          </div>

          {token && viewMode === 'agent' && (
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-red-500/80 hover:text-red-400 transition-colors duration-200"
            >
              Sign out
            </button>
          )}
        </div>
      </nav>

      {/* Hero Header (Shared) */}
      <header className="max-w-3xl mx-auto pt-16 pb-12 px-6 text-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-6 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <div className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span>System Active</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
          Intelligent Ticket Routing
        </h2>
        <p className="text-zinc-400 max-w-xl mx-auto">
          {viewMode === 'client' 
            ? "Submit your request below. Our AI triage system will route your issue to the right agent instantly." 
            : "Agent view active. Manage the queue, claim high-priority tickets, and resolve issues fast."}
        </p>
      </header>

      {/* Main Content Area */}
      <main className="px-4 pb-24">
        
        {/* ================= CLIENT VIEW ================= */}
        {viewMode === 'client' && (
          <div className="max-w-2xl mx-auto">
            {submitSuccess ? (
              <div className="bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-emerald-500/30 p-8 shadow-[0_0_30px_rgba(16,185,129,0.1)] text-center transition-all duration-300 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">Issue Registered Successfully</h3>
                <p className="text-zinc-400 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                  Our AI triage system has analyzed and routed your request. One of our agents will look into it shortly.
                </p>
                <button 
                  onClick={() => setSubmitSuccess(false)}
                  className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-semibold rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600 shadow-sm"
                >
                  Submit Another Issue
                </button>
              </div>
            ) : (
              <div className="bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800/80 p-6 shadow-xl transition-all duration-300 hover:border-zinc-700">
                <div className="border-b border-zinc-800/60 pb-3 mb-6">
                  <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Submit New Issue</h3>
                </div>
                
                <form onSubmit={handleCreateTicket} className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Issue Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Cannot access the billing dashboard"
                      className="w-full bg-zinc-950/80 border border-zinc-700/70 text-zinc-100 placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Description</label>
                    <textarea
                      placeholder="Describe the issue in detail. Include steps to reproduce if applicable..."
                      className="w-full bg-zinc-950/80 border border-zinc-700/70 text-zinc-100 placeholder-zinc-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all min-h-[120px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-bold shadow-lg transition-all rounded-lg py-3 text-sm active:scale-[0.98] mt-2"
                  >
                    Create Issue
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================= AGENT VIEW ================= */}
        {viewMode === 'agent' && (
          <div className="max-w-4xl mx-auto">
            
            {/* Not Logged In -> Show Login Form */}
            {!token ? (
              <div className="max-w-md mx-auto bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800/80 p-6 shadow-xl transition-all duration-300 hover:border-zinc-700">
                <div className="border-b border-zinc-800/60 pb-3 mb-6 flex justify-between items-center">
                  <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Agent Authentication</h3>
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                
                {error && (
                  <div className="bg-red-950/40 border border-red-800/50 text-red-300 text-xs px-3 py-2.5 rounded-lg flex items-center gap-2 mb-5">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <input
                    type="email"
                    placeholder="agent@company.com"
                    className="w-full bg-zinc-950/80 border border-zinc-700/70 text-zinc-100 placeholder-zinc-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full bg-zinc-950/80 border border-zinc-700/70 text-zinc-100 placeholder-zinc-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="submit" 
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all rounded-lg py-3 text-sm active:scale-[0.98] mt-2"
                  >
                    Authenticate
                  </button>
                </form>
              </div>
            ) : (
              
              /* Logged In -> Show Live Queue */
              <div className="bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800/80 p-6 shadow-xl min-h-[400px] flex flex-col transition-all duration-300 hover:border-zinc-700">
                <div className="flex justify-between items-end border-b border-zinc-800/60 pb-3 mb-6">
                  <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Priority Queue
                  </h3>
                  <span className="text-xs font-medium text-zinc-500 bg-zinc-950/50 px-2.5 py-1 rounded-md border border-zinc-800/50">
                    {tickets.filter(t => t.status === 'open').length} pending items
                  </span>
                </div>

                {/* Empty State */}
                {tickets.filter(t => t.status === 'open').length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4 py-12">
                    <div className="p-4 rounded-full bg-zinc-800/30 border border-zinc-800/50">
                      <svg className="w-8 h-8 opacity-40 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium">Inbox zero. All issues routed and resolved.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tickets.filter(t => t.status === 'open').map((t) => (
                      <div 
                        key={t.id} 
                        className="group relative bg-zinc-950/80 border border-zinc-800/80 p-5 rounded-lg hover:border-emerald-500/50 transition-all duration-300 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                              ID-{t.id.slice(0, 6)}
                            </span>
                            <div className="flex space-x-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                                t.urgency === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                t.urgency === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                'bg-zinc-800 text-zinc-400 border-zinc-700'
                              }`}>
                                {t.urgency}
                              </span>
                            </div>
                          </div>
                          <h4 className="text-base font-medium text-zinc-100 mb-1">{t.title}</h4>
                          <span className="inline-block px-2 py-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] font-semibold tracking-wider uppercase mb-4">
                            {t.category}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2 pt-4 border-t border-zinc-800/50">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">AI Score</span>
                            <span className="text-xs font-mono text-emerald-400">{(t.priority_score || 0).toFixed(2)}</span>
                          </div>
                          <button 
                            onClick={() => handleClaim(t.id)}
                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-zinc-950 text-emerald-400 text-xs font-bold rounded-md transition-all duration-200 border border-emerald-500/20 hover:border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                          >
                            Claim Issue
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;