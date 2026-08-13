// frontend/src/App.tsx
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Ticket, Activity, Clock } from 'lucide-react'

// Define the TypeScript interfaces matching our Python backend schemas
interface TicketData {
  id: string
  client_id: string
  title: string
  description: string
  category: string
  urgency: string
  status: string
  created_at: string
  sla_deadline: string
}

function App() {
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [queueCount, setQueueCount] = useState<number>(0)

  // Fetch data from FastAPI backend when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all tickets
        const ticketRes = await axios.get('http://127.0.0.1:8000/tickets/')
        setTickets(ticketRes.data)

        // Fetch live queue data
        const queueRes = await axios.get('http://127.0.0.1:8000/queue/')
        setQueueCount(queueRes.data.queue.length)
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [])

  // Helper function to color-code urgency badges
  const getUrgencyColor = (urgency: string) => {
    switch(urgency) {
      case 'critical': return 'red'
      case 'high': return 'orange'
      case 'medium': return 'blue'
      default: return 'gray'
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Dashboard Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={32} color="#2563eb" />
          Support Agent Dashboard
        </h1>
        <div style={{ background: '#fef2f2', padding: '10px 20px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
          <strong>Live Queue:</strong> {queueCount} Tickets Waiting
        </div>
      </header>

      {/* Tickets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {tickets.map((ticket) => (
          <div key={ticket.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white', background: getUrgencyColor(ticket.urgency), padding: '4px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                {ticket.urgency}
              </span>
              <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>
                {ticket.category}
              </span>
            </div>

            <h3 style={{ margin: '10px 0', fontSize: '18px' }}>{ticket.title}</h3>
            <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '15px' }}>{ticket.description}</p>
            
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '15px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6b7280' }}>
              <span>Client: <strong>{ticket.client_id}</strong></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: ticket.urgency === 'critical' ? 'red' : 'inherit' }}>
                <Clock size={14} /> 
                {new Date(ticket.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}

export default App
