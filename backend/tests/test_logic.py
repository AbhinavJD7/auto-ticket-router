from main import auto_classify_ticket

def test_auto_classify_technical_critical():
    title = "API is down urgently"
    desc = "Server crashing 500 errors"
    cat, urg, deadline = auto_classify_ticket(title, desc)
    assert cat == "technical"
    assert urg == "critical"

def test_auto_classify_billing_low():
    title = "Question about my bill"
    desc = "Just curious about a charge from last month"
    cat, urg, deadline = auto_classify_ticket(title, desc)
    assert cat == "billing"
    assert urg == "low"

def test_auto_classify_general_medium():
    title = "General feedback medium priority"
    desc = "I have some thoughts"
    cat, urg, deadline = auto_classify_ticket(title, desc)
    assert cat == "general"
    assert urg == "medium"
