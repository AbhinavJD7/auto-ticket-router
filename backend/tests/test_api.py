def test_unauthenticated_access(client):
    response = client.get("/tickets/")
    assert response.status_code == 401

def test_agent_registration_and_login(client):
    # Register
    reg_response = client.post("/register", json={
        "name": "Test Agent",
        "email": "test@example.com",
        "password": "securepassword",
        "skill_tags": ["general"]
    })
    assert reg_response.status_code == 200
    
    # Login
    login_response = client.post("/token", data={
        "username": "test@example.com",
        "password": "securepassword"
    })
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
    return login_response.json()["access_token"]

def test_ticket_creation_and_claim(client):
    token = test_agent_registration_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create ticket (unprotected)
    create_res = client.post("/tickets/", json={
        "title": "API is crashing",
        "description": "500 errors",
        "client_id": "CLIENT-123"
    })
    assert create_res.status_code == 200
    ticket_id = create_res.json()["id"]
    
    # Fetch tickets (protected)
    fetch_res = client.get("/tickets/", headers=headers)
    assert fetch_res.status_code == 200
    assert len(fetch_res.json()) >= 1
    
    # Claim ticket
    claim_res = client.post(f"/tickets/{ticket_id}/claim", headers=headers)
    assert claim_res.status_code == 200
    assert claim_res.json()["ticket"]["status"] == "in-progress"
