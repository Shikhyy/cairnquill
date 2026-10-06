"""
Local SQLite-backed Snowflake emulator for Cairnquill.

Provides full offline/dev compatibility when Snowflake credentials are not configured
or snowflake-connector-python is not installed. Supports:
- Snowflake SQL translation (schemas, %s placeholders, casts, functions)
- Custom SQLite functions: DATEDIFF, DATEADD, PARSE_JSON, CURRENT_TIMESTAMP, CURRENT_DATE
- Stored procedure execution: CALL EVIDENCE.MINE_EVIDENCE(...)
- Snowflake Cortex AI_COMPLETE mock synthesis for claim compilation
- Uppercase column dictionary access (matching Snowflake DictCursor)
- Complete synthetic AML world schema seeded with realistic alerts, KYC, and evidence
"""

from __future__ import annotations

import datetime
import hashlib
import json
import logging
import os
import re
import sqlite3
import uuid
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterator

logger = logging.getLogger(__name__)

# DB File path: persist in backend directory
_DB_PATH = Path(__file__).resolve().parent.parent.parent / "cairnquill_local.db"


# ── SQLite Custom Functions ───────────────────────────────────────────────────

def _sqlite_datediff(unit: str, d1_val: Any, d2_val: Any) -> int | None:
    """Calculate date/time difference between d1 and d2 in specified units (d2 - d1)."""
    if d1_val is None or d2_val is None:
        return None

    def _parse(val: Any) -> datetime.datetime:
        if isinstance(val, (datetime.date, datetime.datetime)):
            if isinstance(val, datetime.date) and not isinstance(val, datetime.datetime):
                return datetime.datetime(val.year, val.month, val.day)
            return val
        s = str(val).strip()
        # Handle 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DD'
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d", "%Y/%m/%d %H:%M", "%Y/%m/%d"):
            try:
                return datetime.datetime.strptime(s, fmt)
            except ValueError:
                pass
        # Fallback to date from string
        try:
            return datetime.datetime.fromisoformat(s)
        except Exception:
            return datetime.datetime.now()

    try:
        dt1 = _parse(d1_val)
        dt2 = _parse(d2_val)
        u = str(unit).strip().lower()

        diff_seconds = (dt2 - dt1).total_seconds()
        if u in ("day", "days", "d"):
            return (dt2.date() - dt1.date()).days
        elif u in ("hour", "hours", "h"):
            return int(round(diff_seconds / 3600.0))
        elif u in ("minute", "minutes", "m"):
            return int(round(diff_seconds / 60.0))
        elif u in ("second", "seconds", "s"):
            return int(diff_seconds)
        return int(diff_seconds)
    except Exception as exc:
        logger.debug("DATEDIFF error: %s", exc)
        return 0


def _sqlite_dateadd(unit: str, amount: Any, d_val: Any) -> str:
    """Add amount of unit to date/time."""
    if d_val is None:
        return ""
    try:
        amt = float(amount)
        s = str(d_val).strip()
        dt = datetime.datetime.fromisoformat(s) if "T" in s else datetime.datetime.strptime(s, "%Y-%m-%d %H:%M:%S" if " " in s else "%Y-%m-%d")
        u = str(unit).strip().lower()
        if u in ("day", "days", "d"):
            dt += datetime.timedelta(days=amt)
        elif u in ("hour", "hours", "h"):
            dt += datetime.timedelta(hours=amt)
        elif u in ("minute", "minutes", "m"):
            dt += datetime.timedelta(minutes=amt)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(d_val)


def _sqlite_parse_json(val: Any) -> str:
    """Return JSON string as-is or serialized."""
    if val is None:
        return "null"
    if isinstance(val, (dict, list)):
        return json.dumps(val, default=str)
    return str(val)


def _sqlite_current_date() -> str:
    return datetime.date.today().isoformat()


def _sqlite_current_timestamp() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ── Row & Cursor Wrappers ─────────────────────────────────────────────────────

class CaseInsensitiveRow(dict):
    """
    Dictionary wrapper that allows both UPPERCASE ('ALERT_ID')
    and lowercase ('alert_id') key lookups, plus tuple index access row[0].
    """
    def __init__(self, items: list[tuple[str, Any]], values_tuple: tuple[Any, ...]) -> None:
        self._values = values_tuple
        super().__init__()
        for col_name, val in items:
            key_upper = col_name.upper()
            key_lower = col_name.lower()
            self[key_upper] = val
            self[key_lower] = val

    def __getitem__(self, key: Any) -> Any:
        if isinstance(key, int):
            return self._values[key]
        if isinstance(key, str):
            k_up = key.upper()
            if k_up in self:
                return super().__getitem__(k_up)
            k_low = key.lower()
            if k_low in self:
                return super().__getitem__(k_low)
        return super().__getitem__(key)

    def get(self, key: Any, default: Any = None) -> Any:
        try:
            return self[key]
        except (KeyError, IndexError):
            return default


class LocalCursorWrapper:
    """Cursor wrapper that executes translated Snowflake queries on SQLite."""

    def __init__(self, raw_cursor: sqlite3.Cursor, conn: "LocalConnectionWrapper") -> None:
        self._cursor = raw_cursor
        self._conn = conn
        self._last_result: list[Any] = []
        self._row_idx = 0

    def __enter__(self) -> "LocalCursorWrapper":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def close(self) -> None:
        try:
            self._cursor.close()
        except Exception:
            pass

    def execute(self, sql: str, params: tuple | list = ()) -> "LocalCursorWrapper":
        self._row_idx = 0
        clean_sql = sql.strip()

        # Handle Stored Procedure: CALL EVIDENCE.MINE_EVIDENCE(...)
        if re.search(r"CALL\s+EVIDENCE\.MINE_EVIDENCE", clean_sql, re.IGNORECASE):
            result = self._conn.mine_evidence_sp(params)
            self._last_result = [CaseInsensitiveRow([("RESULT", result)], (result,))]
            return self

        # Handle Snowflake Cortex Complete query: SELECT SNOWFLAKE.CORTEX.COMPLETE(...)
        if re.search(r"SNOWFLAKE\.CORTEX\.COMPLETE", clean_sql, re.IGNORECASE):
            prompt_str = params[1] if len(params) > 1 else (params[0] if params else "")
            response = self._conn.cortex_complete(prompt_str)
            self._last_result = [CaseInsensitiveRow([("RESPONSE", response)], (response,))]
            return self

        translated_sql = translate_sql(clean_sql)
        clean_params = list(params)

        try:
            self._cursor.execute(translated_sql, clean_params)
            if clean_sql.upper().startswith(("INSERT", "UPDATE", "DELETE", "REPLACE")):
                self._conn._sqlite_conn.commit()

            desc = self._cursor.description
            if desc:
                col_names = [d[0] for d in desc]
                raw_rows = self._cursor.fetchall()
                self._last_result = [
                    CaseInsensitiveRow(list(zip(col_names, row)), row)
                    for row in raw_rows
                ]
            else:
                self._last_result = []
        except Exception as exc:
            logger.error("SQLite query error: %s on SQL:\n%s", exc, translated_sql)
            raise

        return self

    def fetchone(self) -> Any:
        if self._row_idx < len(self._last_result):
            row = self._last_result[self._row_idx]
            self._row_idx += 1
            return row
        return None

    def fetchall(self) -> list[Any]:
        res = self._last_result[self._row_idx :]
        self._row_idx = len(self._last_result)
        return res


class LocalConnectionWrapper:
    """Snowflake-compatible connection wrapper backed by local SQLite."""

    def __init__(self, db_path: Path = _DB_PATH) -> None:
        self.db_path = db_path
        self._sqlite_conn = sqlite3.connect(str(db_path), check_same_thread=False)
        self._register_functions()
        self._init_schema()

    def _register_functions(self) -> None:
        self._sqlite_conn.create_function("DATEDIFF", 3, _sqlite_datediff)
        self._sqlite_conn.create_function("DATEADD", 3, _sqlite_dateadd)
        self._sqlite_conn.create_function("PARSE_JSON", 1, _sqlite_parse_json)
        self._sqlite_conn.create_function("CURRENT_DATE", 0, _sqlite_current_date)
        self._sqlite_conn.create_function("CURRENT_TIMESTAMP", 0, _sqlite_current_timestamp)
        self._sqlite_conn.create_function("ARRAY_CONSTRUCT", -1, lambda *args: json.dumps(list(args)))
        self._sqlite_conn.create_function("OBJECT_CONSTRUCT", -1, lambda *args: json.dumps(dict(zip(args[0::2], args[1::2]))))

    def cursor(self, cursor_type: Any = None) -> LocalCursorWrapper:
        return LocalCursorWrapper(self._sqlite_conn.cursor(), self)

    def close(self) -> None:
        # Keep open in singleton for memory/file re-use or close safely
        pass

    def _init_schema(self) -> None:
        """Create all tables and seed data if not present."""
        cur = self._sqlite_conn.cursor()
        cur.executescript("""
            CREATE TABLE IF NOT EXISTS CASES_ALERTS (
                alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_key TEXT NOT NULL,
                score REAL NOT NULL,
                model_version TEXT NOT NULL,
                created_ts TEXT DEFAULT (datetime('now')),
                sla_due TEXT NOT NULL,
                status TEXT DEFAULT 'OPEN'
            );

            CREATE TABLE IF NOT EXISTS CASES_CASES (
                case_id TEXT PRIMARY KEY,
                alert_id INTEGER,
                account_key TEXT,
                typology_detected TEXT,
                status TEXT NOT NULL,
                maker TEXT,
                created_ts TEXT DEFAULT (datetime('now')),
                sla_due TEXT,
                updated_ts TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS CASES_DRAFTS (
                draft_id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                version INTEGER DEFAULT 1,
                claims TEXT NOT NULL,
                model TEXT,
                prompt_version TEXT,
                author TEXT NOT NULL,
                created_ts TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS CASES_VERDICTS (
                draft_id TEXT NOT NULL,
                claim_id TEXT NOT NULL,
                verdict TEXT NOT NULL,
                asserted TEXT,
                actual TEXT,
                checked_ts TEXT DEFAULT (datetime('now')),
                PRIMARY KEY (draft_id, claim_id)
            );

            CREATE TABLE IF NOT EXISTS CASES_COMMENTS (
                comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL,
                author TEXT NOT NULL,
                body TEXT NOT NULL,
                created_ts TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS EVIDENCE_CAIRNS (
                cairn_id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                pattern_type TEXT NOT NULL,
                params TEXT NOT NULL,
                txn_ids TEXT NOT NULL,
                summary TEXT NOT NULL,
                created_ts TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS EVIDENCE_CASE_ROWS (
                case_id TEXT NOT NULL,
                cairn_id TEXT NOT NULL,
                txn_id INTEGER NOT NULL,
                ts TEXT NOT NULL,
                src TEXT NOT NULL,
                dst TEXT NOT NULL,
                amt_paid REAL,
                paid_ccy TEXT,
                amt_received REAL,
                recv_ccy TEXT,
                pay_format TEXT,
                row_sha TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS AUDIT_FILINGS (
                filing_id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                draft_id TEXT NOT NULL,
                evidence_sha TEXT NOT NULL,
                seal_sha TEXT NOT NULL,
                prev_seal_sha TEXT,
                versions TEXT NOT NULL,
                maker TEXT NOT NULL,
                approver TEXT NOT NULL,
                approved_ts TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS AUDIT_EVENTS (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT,
                ts TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS EVAL_RUNS (
                run_id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                metrics TEXT NOT NULL,
                ts TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS EVAL_PLANTED (
                run_id TEXT NOT NULL,
                claim_id TEXT NOT NULL,
                mutation TEXT NOT NULL,
                caught INTEGER NOT NULL,
                PRIMARY KEY (run_id, claim_id)
            );

            CREATE TABLE IF NOT EXISTS REG_CHUNKS (
                chunk_id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                section TEXT,
                url TEXT,
                chunk_text TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS RAW_KYC (
                account_key TEXT PRIMARY KEY,
                customer_id TEXT,
                customer_name_synth TEXT,
                occupation TEXT,
                declared_monthly_income REAL,
                income_ccy TEXT,
                branch TEXT,
                risk_rating TEXT
            );

            CREATE TABLE IF NOT EXISTS RAW_TXNS (
                txn_id INTEGER PRIMARY KEY,
                ts TEXT NOT NULL,
                src TEXT NOT NULL,
                dst TEXT NOT NULL,
                amt_paid REAL,
                paid_ccy TEXT,
                amt_received REAL,
                recv_ccy TEXT,
                pay_format TEXT,
                is_laundering INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS RAW_FX_RATES (
                ccy TEXT PRIMARY KEY,
                to_usd REAL,
                note TEXT
            );
        """)
        self._sqlite_conn.commit()

        # Seed initial data if tables are empty
        self._seed_data()

    def _seed_data(self) -> None:
        cur = self._sqlite_conn.cursor()
        cur.execute("SELECT COUNT(*) FROM CASES_ALERTS")
        if cur.fetchone()[0] == 0:
            today = datetime.date.today()
            alerts = [
                ("BANK_US:ACC_0142", 0.94, "v1.2.0", (today + datetime.timedelta(days=5)).isoformat(), "OPEN"),
                ("BANK_UK:ACC_0089", 0.89, "v1.2.0", (today + datetime.timedelta(days=6)).isoformat(), "OPEN"),
                ("BANK_SG:ACC_0205", 0.84, "v1.2.0", (today + datetime.timedelta(days=7)).isoformat(), "OPEN"),
                ("BANK_DE:ACC_0311", 0.78, "v1.2.0", (today + datetime.timedelta(days=9)).isoformat(), "OPEN"),
            ]
            cur.executemany("""
                INSERT INTO CASES_ALERTS (account_key, score, model_version, sla_due, status)
                VALUES (?, ?, ?, ?, ?)
            """, alerts)

        cur.execute("SELECT COUNT(*) FROM RAW_KYC")
        if cur.fetchone()[0] == 0:
            kyc = [
                ("BANK_US:ACC_0142", "CUST_9912", "Helios Trade Logistics Ltd", "Cross-Border Trade Intermediary", 45000.0, "USD", "New York Metro", "HIGH"),
                ("BANK_UK:ACC_0089", "CUST_4418", "Vanguard Meridian Holdings", "Investment Vehicle", 120000.0, "GBP", "London City", "HIGH"),
                ("BANK_SG:ACC_0205", "CUST_7721", "Apex Marine Logistics Pte", "Maritime Freight Services", 85000.0, "SGD", "Marina Bay", "MEDIUM"),
                ("BANK_DE:ACC_0311", "CUST_3309", "Klausen Rohstoff Import GMBH", "Wholesale Commodities", 60000.0, "EUR", "Frankfurt West", "MEDIUM"),
            ]
            cur.executemany("""
                INSERT INTO RAW_KYC (account_key, customer_id, customer_name_synth, occupation, declared_monthly_income, income_ccy, branch, risk_rating)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, kyc)

        cur.execute("SELECT COUNT(*) FROM RAW_FX_RATES")
        if cur.fetchone()[0] == 0:
            fx = [
                ("USD", 1.0, "base"),
                ("EUR", 1.085, "illustrative"),
                ("GBP", 1.27, "illustrative"),
                ("INR", 0.012, "illustrative"),
                ("AED", 0.272, "illustrative"),
                ("SGD", 0.74, "illustrative"),
                ("HKD", 0.128, "illustrative"),
                ("MYR", 0.213, "illustrative"),
            ]
            cur.executemany("INSERT INTO RAW_FX_RATES VALUES (?, ?, ?)", fx)

        cur.execute("SELECT COUNT(*) FROM RAW_TXNS")
        if cur.fetchone()[0] == 0:
            txns = [
                (101, "2024-01-10 09:00:00", "BANK_US:ACC_0142", "BANK_B:222", 500000.0, "USD", 500000.0, "USD", "Wire", 1),
                (102, "2024-01-10 15:00:00", "BANK_B:222", "BANK_C:333", 500000.0, "USD", 500000.0, "USD", "Wire", 1),
                (103, "2024-01-11 11:30:00", "BANK_C:333", "BANK_US:ACC_0142", 500000.0, "USD", 500000.0, "USD", "Wire", 1),
                (201, "2024-01-12 10:00:00", "BANK_UK:ACC_0089", "BANK_X:401", 120000.0, "GBP", 120000.0, "GBP", "Wire", 1),
                (202, "2024-01-12 10:15:00", "BANK_UK:ACC_0089", "BANK_X:402", 130000.0, "GBP", 130000.0, "GBP", "Wire", 1),
                (203, "2024-01-12 10:30:00", "BANK_UK:ACC_0089", "BANK_X:403", 115000.0, "GBP", 115000.0, "GBP", "Wire", 1),
                (204, "2024-01-12 10:45:00", "BANK_UK:ACC_0089", "BANK_X:404", 125000.0, "GBP", 125000.0, "GBP", "Wire", 1),
                (205, "2024-01-12 11:00:00", "BANK_UK:ACC_0089", "BANK_X:405", 110000.0, "GBP", 110000.0, "GBP", "Wire", 1),
            ]
            cur.executemany("INSERT INTO RAW_TXNS VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", txns)

        cur.execute("SELECT COUNT(*) FROM EVAL_RUNS")
        if cur.fetchone()[0] == 0:
            runs = [
                ("run_hist_01", "SCOREBOARD", json.dumps({
                    "catch_rate": 0.985,
                    "false_block_rate": 0.000,
                    "latency_ms": 412,
                    "total_claims_evaluated": 250,
                    "mutations_caught": 246,
                }), "2024-10-01 12:00:00"),
                ("run_hist_02", "PLANTED_ERROR", json.dumps({
                    "catch_rate": 0.992,
                    "false_block_rate": 0.000,
                    "latency_ms": 388,
                    "total_claims_evaluated": 120,
                    "mutations_caught": 119,
                }), "2024-10-03 15:30:00"),
            ]
            cur.executemany("INSERT INTO EVAL_RUNS VALUES (?, ?, ?, ?)", runs)

        cur.execute("SELECT COUNT(*) FROM REG_CHUNKS")
        if cur.fetchone()[0] == 0:
            chunks = [
                ("reg_pmla_03", "PMLA_2002", "Section 3", "https://fiuindia.gov.in/pmla.html",
                 "Offence of money-laundering: Whosoever directly or indirectly attempts to indulge or knowingly assists or knowingly is a party or is actually involved in any process or activity connected with the proceeds of crime including its concealment, possession, acquisition or use and projecting or claiming it as untainted property shall be guilty of offence of money-laundering."),
                ("reg_fatf_20", "FATF_40", "Recommendation 20", "https://fatf-gafi.org/recommendations.html",
                 "Reporting of suspicious transactions: If a financial institution suspects or has reasonable grounds to suspect that funds are the proceeds of a criminal activity, or are related to terrorist financing, it should be required, by law, to report promptly its suspicions to the Financial Intelligence Unit (FIU)."),
                ("reg_fincen_01", "FINCEN_GUIDANCE", "SAR Rule 31 CFR 1020.320", "https://fincen.gov/sar-guidance",
                 "Financial institutions must file a Suspicious Activity Report (SAR) for any transaction conducted or attempted by, at, or through the financial institution involving or aggregating at least $5,000 where the bank knows, suspects, or has reason to suspect that the transaction involves funds derived from illegal activities or is intended to hide or disguise funds."),
            ]
            cur.executemany("INSERT INTO REG_CHUNKS VALUES (?, ?, ?, ?, ?)", chunks)

        self._sqlite_conn.commit()

    def mine_evidence_sp(self, params: tuple | list) -> dict:
        """
        Executes evidence mining logic matching EVIDENCE.MINE_EVIDENCE stored procedure.
        Finds patterns in RAW_TXNS, creates cairn records in EVIDENCE_CAIRNS and rows in EVIDENCE_CASE_ROWS.
        """
        case_id = params[0] if len(params) > 0 else f"case_{uuid.uuid4().hex[:6]}"
        account_key = params[1] if len(params) > 1 else "BANK_US:ACC_0142"
        window_hours = int(params[2]) if len(params) > 2 else 168

        cur = self._sqlite_conn.cursor()

        # 1. Try finding a 3-hop cycle anchored on account_key
        cur.execute("""
            SELECT t1.txn_id, t2.txn_id, t3.txn_id
            FROM RAW_TXNS t1
            JOIN RAW_TXNS t2 ON t2.src = t1.dst
            JOIN RAW_TXNS t3 ON t3.src = t2.dst AND t3.dst = t1.src
            WHERE t1.src = ?
            LIMIT 1
        """, (account_key,))
        cycle = cur.fetchone()

        if cycle:
            t_ids = (cycle[0], cycle[1], cycle[2])
            cur.execute("""
                SELECT txn_id, ts, src, dst, amt_paid, paid_ccy, amt_received, recv_ccy, pay_format
                FROM RAW_TXNS
                WHERE txn_id IN (?, ?, ?)
                ORDER BY ts ASC
            """, t_ids)
            c_txns = cur.fetchall()
        else:
            cur.execute("""
                SELECT txn_id, ts, src, dst, amt_paid, paid_ccy, amt_received, recv_ccy, pay_format
                FROM RAW_TXNS
                WHERE src = ? OR dst = ?
                ORDER BY ts ASC
            """, (account_key, account_key))
            c_txns = cur.fetchall()

        if not c_txns:
            # Generate synthetic 3-hop cycle transactions anchored on this account
            c_txns = [
                (1001, "2024-01-10 09:00:00", account_key, "BANK_INTERMEDIARY:ACC_77", 450000.0, "USD", 450000.0, "USD", "Wire"),
                (1002, "2024-01-10 14:30:00", "BANK_INTERMEDIARY:ACC_77", "BANK_OVERSEAS:ACC_99", 450000.0, "USD", 450000.0, "USD", "Wire"),
                (1003, "2024-01-11 11:00:00", "BANK_OVERSEAS:ACC_99", account_key, 450000.0, "USD", 450000.0, "USD", "Wire"),
            ]

        cairn_id = f"CAIRN-{case_id}-CYCLE"
        txn_ids = [r[0] for r in c_txns]
        total_paid = sum(float(r[4]) for r in c_txns)
        ccy = c_txns[0][5]

        cur.execute("DELETE FROM EVIDENCE_CAIRNS WHERE case_id = ?", (case_id,))
        cur.execute("DELETE FROM EVIDENCE_CASE_ROWS WHERE case_id = ?", (case_id,))

        summary = {
            "n_txns": len(txn_ids),
            "currency": ccy,
            "total_paid": total_paid,
            "pattern": "CYCLE",
        }
        params_dict = {
            "account_key": account_key,
            "window_hours": window_hours,
            "hop1": txn_ids[0] if len(txn_ids) > 0 else 0,
            "hop2": txn_ids[1] if len(txn_ids) > 1 else 0,
            "hop3": txn_ids[2] if len(txn_ids) > 2 else 0,
        }

        cur.execute("""
            INSERT INTO EVIDENCE_CAIRNS (cairn_id, case_id, pattern_type, params, txn_ids, summary)
            VALUES (?, ?, 'CYCLE', ?, ?, ?)
        """, (cairn_id, case_id, json.dumps(params_dict), json.dumps(txn_ids), json.dumps(summary)))

        for r in c_txns:
            tid, ts, src, dst, amt_p, p_ccy, amt_r, r_ccy, pay_fmt = r
            row_sha = hashlib.sha256(f"{case_id}|{cairn_id}|{tid}|{amt_p}|{p_ccy}".encode()).hexdigest()
            cur.execute("""
                INSERT INTO EVIDENCE_CASE_ROWS
                (case_id, cairn_id, txn_id, ts, src, dst, amt_paid, paid_ccy, amt_received, recv_ccy, pay_format, row_sha)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (case_id, cairn_id, tid, ts, src, dst, amt_p, p_ccy, amt_r, r_ccy, pay_fmt, row_sha))

        self._sqlite_conn.commit()
        return {
            "mined_cairns": 1,
            "pattern": "CYCLE",
            "cairn_id": cairn_id,
            "txn_count": len(txn_ids),
            "total_amount": total_paid,
            "currency": ccy,
        }

    def cortex_complete(self, prompt: str) -> str:
        """
        Emulates Snowflake Cortex AI_COMPLETE by synthesizing verifiable claims
        from the evidence snapshot referenced in the prompt.
        """
        total_amount = 1500000.0
        ccy = "USD"
        n_txns = 3
        txn_ids = [101, 102, 103]
        time_span_hours = 26

        try:
            m = re.search(r"EVIDENCE FACTS:\s*(\{[\s\S]*?\})\s*(?:\n\s*\n|Now output|$)", prompt)
            if m:
                facts = json.loads(m.group(1))
                txn_ids = facts.get("txn_ids") or txn_ids
                n_txns = len(txn_ids)
                amounts = facts.get("amounts_by_currency") or {}
                if amounts:
                    ccy = list(amounts.keys())[0]
                    total_amount = float(amounts[ccy])
                ts_min = facts.get("ts_min")
                ts_max = facts.get("ts_max")
                if ts_min and ts_max:
                    diff = _sqlite_datediff("hour", ts_min, ts_max)
                    if diff is not None and diff > 0:
                        time_span_hours = diff
        except Exception as exc:
            logger.debug("Prompt extraction fallback: %s", exc)

        pattern_val = ",".join(str(x) for x in sorted(txn_ids))

        claims = [
            {
                "claim_id": f"c-sum-{uuid.uuid4().hex[:6]}",
                "type": "SUM_AMOUNT",
                "text": f"Total amount transferred across the detected pattern is {total_amount:,.2f} {ccy}.",
                "params": {"currency": ccy},
                "asserted": {"value": total_amount, "currency": ccy},
                "evidence_ids": txn_ids,
            },
            {
                "claim_id": f"c-count-{uuid.uuid4().hex[:6]}",
                "type": "COUNT_TXNS",
                "text": f"The detected suspicious flow consists of exactly {n_txns} structured transactions.",
                "params": {},
                "asserted": {"value": n_txns},
                "evidence_ids": txn_ids,
            },
            {
                "claim_id": f"c-time-{uuid.uuid4().hex[:6]}",
                "type": "TIME_SPAN_HOURS",
                "text": f"All transactions in this sequence were executed within a {time_span_hours}-hour window.",
                "params": {},
                "asserted": {"value": time_span_hours},
                "evidence_ids": txn_ids,
            },
            {
                "claim_id": f"c-pattern-{uuid.uuid4().hex[:6]}",
                "type": "PATTERN_EXISTS",
                "text": "Evidence verifies a closed 3-hop circular flow routing funds back to source account.",
                "params": {},
                "asserted": {"value": pattern_val},
                "evidence_ids": txn_ids,
            },
            {
                "claim_id": f"c-judge-{uuid.uuid4().hex[:6]}",
                "type": "JUDGEMENT",
                "text": "The rapid return of capital to the originating jurisdiction without identifiable commercial purpose constitutes anomalous layering.",
                "params": {},
                "asserted": None,
                "evidence_ids": txn_ids,
            },
        ]
        return json.dumps(claims)


# ── SQL Dialect Translator ───────────────────────────────────────────────────

_SCHEMA_REPLACEMENTS = [
    (r"\bCASES\.ALERTS\b", "CASES_ALERTS"),
    (r"\bCASES\.CASES\b", "CASES_CASES"),
    (r"\bCASES\.DRAFTS\b", "CASES_DRAFTS"),
    (r"\bCASES\.VERDICTS\b", "CASES_VERDICTS"),
    (r"\bCASES\.COMMENTS\b", "CASES_COMMENTS"),
    (r"\bEVIDENCE\.CAIRNS\b", "EVIDENCE_CAIRNS"),
    (r"\bEVIDENCE\.CASE_ROWS\b", "EVIDENCE_CASE_ROWS"),
    (r"\bRAW\.KYC\b", "RAW_KYC"),
    (r"\bRAW\.TXNS\b", "RAW_TXNS"),
    (r"\bRAW\.FX_RATES\b", "RAW_FX_RATES"),
    (r"\bAUDIT\.FILINGS\b", "AUDIT_FILINGS"),
    (r"\bAUDIT\.EVENTS\b", "AUDIT_EVENTS"),
    (r"\bEVAL\.RUNS\b", "EVAL_RUNS"),
    (r"\bEVAL\.PLANTED\b", "EVAL_PLANTED"),
    (r"\bREG\.CHUNKS\b", "REG_CHUNKS"),
    (r"\bGT\.PATTERNS\b", "GT_PATTERNS"),
]


def translate_sql(sql: str) -> str:
    """Translate Snowflake SQL dialect to SQLite SQL."""
    out = sql

    # Replace Snowflake schemas (e.g. CASES.ALERTS -> CASES_ALERTS)
    for pattern, repl in _SCHEMA_REPLACEMENTS:
        out = re.sub(pattern, repl, out, flags=re.IGNORECASE)

    # Strip Snowflake CAST syntax (::STRING, ::NUMBER, etc.)
    out = re.sub(r"::\w+(\([^\)]*\))?", "", out)

    # SQLite built-in date/time keywords do not accept ()
    out = re.sub(r"\bCURRENT_DATE\s*\(\s*\)", "CURRENT_DATE", out, flags=re.IGNORECASE)
    out = re.sub(r"\bCURRENT_TIMESTAMP\s*\(\s*\)", "CURRENT_TIMESTAMP", out, flags=re.IGNORECASE)

    # Convert LISTAGG(...) WITHIN GROUP (ORDER BY ...) to GROUP_CONCAT(...)
    out = re.sub(
        r"LISTAGG\s*\(\s*DISTINCT\s+([^,]+?)\s*,\s*'([^']+)'\s*\)\s*WITHIN\s+GROUP\s*\([^)]*\)",
        r"GROUP_CONCAT(DISTINCT \1)",
        out,
        flags=re.IGNORECASE,
    )
    out = re.sub(
        r"LISTAGG\s*\(\s*([^,]+?)\s*,\s*'([^']+)'\s*\)\s*WITHIN\s+GROUP\s*\([^)]*\)",
        r"GROUP_CONCAT(\1)",
        out,
        flags=re.IGNORECASE,
    )

    # Convert %s placeholders to SQLite ? placeholders
    # (safely ignoring % inside string literals)
    tokens = []
    i = 0
    in_string = False
    str_char = ""
    while i < len(out):
        ch = out[i]
        if in_string:
            tokens.append(ch)
            if ch == str_char:
                in_string = False
            i += 1
        else:
            if ch in ("'", '"'):
                in_string = True
                str_char = ch
                tokens.append(ch)
                i += 1
            elif ch == "%" and i + 1 < len(out) and out[i + 1] == "s":
                tokens.append("?")
                i += 2
            else:
                tokens.append(ch)
                i += 1
    out = "".join(tokens)

    return out


# Singleton instance for local connection
_LOCAL_CONN: LocalConnectionWrapper | None = None


def get_local_connection() -> LocalConnectionWrapper:
    global _LOCAL_CONN
    if _LOCAL_CONN is None:
        _LOCAL_CONN = LocalConnectionWrapper()
    return _LOCAL_CONN
