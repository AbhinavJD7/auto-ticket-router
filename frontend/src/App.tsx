import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [tickets, setTickets] = useState([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem("token") || "")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchQueue = () => {
    fetch('http://localhost:8000/queue/')
      .then(res => res.json())
      .then(data => setTickets(data.queue || []))
      .catch(err => console.error("Error fetching queue:", err))
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    try {
      const formData = new URLSearchParams()
      formData.append("username", email)
      formData.append("password", password)

      const res = await fetch("http://localhost:8000/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.detail || "Login failed")
      
      setToken(data.access_token)
      localStorage.setItem("token", data.access_token)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setToken("")
    localStorage.removeItem("token")
  }

  const submitTicket = async () => {
    const res = await fetch('http://localhost:8000/tickets/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        client_id: "GUEST_USER"
      })
    })
    if (res.ok) {
      setTitle("")
      setDescription("")
      fetchQueue()
    }
  }

  const claimTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/tickets/${ticketId}/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (res.status === 401) {
        handleLogout()
        return
      }
      
      if (res.ok) {
        fetchQueue()
      } else {
        const data = await res.json()
        alert(data.detail)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <div className="logo-icon"></div>
          Router
        </div>
        <div className="auth-status">
          {token ? (
            <button className="logout-btn" onClick={handleLogout}>Log out</button>
          ) : (
            <span className="guest-badge">Client View</span>
          )}
        </div>
      </header>
      
      <main className="main-content">
        <div className="hero">
          <h1>The ticket routing system<br/>for modern teams</h1>
          <p>Purpose-built for speed and accuracy. Designed for the AI era.</p>
        </div>

        <div className="dashboard-grid">
          
          {/* Left Column: Actions */}
          <div className="action-column">
            {!token ? (
              <div className="panel" style={{ marginBottom: '2rem' }}>
                <h2>Agent Access</h2>
                {error && <div className="error-msg">{error}</div>}
                
                <form onSubmit={handleLogin} className="form-group">
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="submit" className="primary-btn" disabled={loading}>
                    {loading ? "Authenticating..." : "Log in"}
                  </button>
                </form>
              </div>
            ) : null}

            <div className="panel">
              <h2>New Issue</h2>
              <div className="form-group">
                <input 
                  placeholder="Issue Title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                />
                <textarea 
                  placeholder="Describe the issue..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows={4}
                />
                <button onClick={submitTicket} className="primary-btn">Create issue</button>
              </div>
            </div>
          </div>

          {/* Right Column: Queue */}
          <div className="queue-column">
            <div className="panel">
              <div className="queue-header">
                <h2>Priority Queue</h2>
                <span className="guest-badge">{tickets.length} items</span>
              </div>
              
              <div className="ticket-list">
                {tickets.map((item: any, i) => (
                  <div key={i} className="ticket-item">
                    <div className="ticket-header">
                      <div>
                        <div className="ticket-id">ISSUE-{item.ticket.id.split('-')[0].toUpperCase()}</div>
                        <div className="ticket-title">{item.ticket.title}</div>
                      </div>
                      <div className="badges">
                        <span className={`badge ${item.ticket.urgency.toLowerCase()}`}>
                          {item.ticket.urgency}
                        </span>
                        <span className="badge">
                          {item.ticket.category}
                        </span>
                      </div>
                    </div>
                    
                    {item.ticket.description && (
                      <div className="ticket-desc">{item.ticket.description}</div>
                    )}
                    
                    <div className="ticket-footer">
                      <div className="score">
                        Priority: {item.priority_score.toFixed(0)}
                      </div>
                      
                      {token && item.ticket.status === "open" && (
                        <button 
                          className="claim-btn"
                          onClick={() => claimTicket(item.ticket.id)}
                        >
                          Claim issue
                        </button>
                      )}
                      {item.ticket.status === "in-progress" && (
                        <span className="status-label">In progress</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {tickets.length === 0 && (
                  <div className="empty-state">No issues in the queue.</div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default App
