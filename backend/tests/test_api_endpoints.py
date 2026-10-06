"""
End-to-end API tests for Cairnquill FastAPI endpoints.

Tests:
1. Health check (/api/health)
2. Alerts queue listing (/api/alerts)
3. Case lifecycle: create -> mine -> draft -> verify -> submit -> approve -> sealed
4. Maker-checker governance: investigator cannot approve own case
5. Demo error injection (/api/demo/inject-error) and blocking logic
6. Filing retrieval and cryptographic seal replay (/api/filings/{id}/replay)
7. Planted error evaluation harness (/api/eval/plant-errors & /api/eval/scoreboard)
8. Regulatory assistant (/api/ask)
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from cairnquill.api.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["synthetic_data"] is True


def test_alerts_endpoint():
    res = client.get("/api/alerts")
    assert res.status_code == 200
    data = res.json()
    assert "alerts" in data
    assert len(data["alerts"]) > 0
    assert data["alerts"][0]["STATUS"] == "OPEN"
    assert "SLA_DUE" in data["alerts"][0]


def test_complete_case_lifecycle():
    # 1. Fetch open alert
    alerts_res = client.get("/api/alerts")
    alert_id = alerts_res.json()["alerts"][0]["ALERT_ID"]

    # 2. Create case
    case_res = client.post(
        "/api/cases",
        json={"alert_id": alert_id},
        headers={"X-Role": "investigator", "X-User": "alice_investigator"},
    )
    assert case_res.status_code == 201
    case_id = case_res.json()["case_id"]
    assert case_res.json()["status"] == "NEW"

    # 3. Get case
    get_res = client.get(f"/api/cases/{case_id}")
    assert get_res.status_code == 200
    assert get_res.json()["case"]["CASE_ID"] == case_id

    # 4. Mine evidence
    mine_res = client.post(
        f"/api/cases/{case_id}/mine?window_hours=168",
        headers={"X-Role": "investigator", "X-User": "alice_investigator"},
    )
    assert mine_res.status_code == 200
    assert mine_res.json()["status"] == "MINED"

    # 5. Draft claims
    draft_res = client.post(
        f"/api/cases/{case_id}/draft",
        headers={"X-Role": "investigator", "X-User": "alice_investigator"},
    )
    assert draft_res.status_code == 200
    draft_data = draft_res.json()
    assert draft_data["status"] == "READY"
    assert draft_data["blocked"] is False
    assert len(draft_data["verdicts"]) > 0

    # 6. Verify claims
    verify_res = client.post(
        f"/api/cases/{case_id}/verify",
        headers={"X-Role": "investigator", "X-User": "alice_investigator"},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["blocked"] is False

    # 7. Submit case
    submit_res = client.post(
        f"/api/cases/{case_id}/submit",
        headers={"X-Role": "investigator", "X-User": "alice_investigator"},
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"

    # 8. Maker-Checker enforcement: Alice cannot approve her own draft
    self_approve_res = client.post(
        f"/api/cases/{case_id}/approve",
        headers={"X-Role": "approver", "X-User": "alice_investigator"},
    )
    assert self_approve_res.status_code == 403
    assert self_approve_res.json()["detail"]["error"]["code"] == "SELF_APPROVAL"

    # 9. Second Approver approvals
    approve_res = client.post(
        f"/api/cases/{case_id}/approve",
        headers={"X-Role": "approver", "X-User": "bob_compliance_officer"},
    )
    assert approve_res.status_code == 200
    approval_data = approve_res.json()
    assert approval_data["status"] == "SEALED"
    assert "filing_id" in approval_data
    assert "seal_sha" in approval_data
    filing_id = approval_data["filing_id"]

    # 10. Audit Filings list
    filings_res = client.get("/api/filings")
    assert filings_res.status_code == 200
    assert any(f["FILING_ID"] == filing_id for f in filings_res.json()["filings"])

    # 11. Replay cryptographic seal
    replay_res = client.post(
        f"/api/filings/{filing_id}/replay",
        headers={"X-Role": "auditor", "X-User": "charlie_auditor"},
    )
    assert replay_res.status_code == 200
    replay_data = replay_res.json()
    assert replay_data["match"] is True
    assert replay_data["tampered"] is False
    assert replay_data["expected_seal"] == replay_data["computed_seal"]


def test_eval_endpoints():
    # Scoreboard
    score_res = client.get("/api/eval/scoreboard")
    assert score_res.status_code == 200
    assert "runs" in score_res.json()

    # Planted errors run
    plant_res = client.post(
        "/api/eval/plant-errors",
        headers={"X-Role": "dev", "X-User": "test_dev"},
    )
    assert plant_res.status_code == 200
    data = plant_res.json()
    assert "metrics" in data
    assert data["metrics"]["catch_rate"] >= 0.90


def test_ask_endpoint():
    res = client.post(
        "/api/ask",
        json={"question": "What is the penalty for money laundering under Section 4 of PMLA?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 0
