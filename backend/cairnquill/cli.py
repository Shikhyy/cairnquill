import argparse
import json
import sys
import logging
from typing import Optional

from cairnquill.adapters.snowflake import get_connection, execute_query
from cairnquill.core.verify import verify_draft
from cairnquill.core.seal import replay_seal, verify_chain
from cairnquill.core.claims import Draft, CairnquillClaim

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def fetch_draft(conn, draft_id: str) -> Draft:
    rows = execute_query(conn, "SELECT * FROM CASES.DRAFTS WHERE draft_id = %s", (draft_id,))
    if not rows:
        raise ValueError(f"Draft {draft_id} not found")
    d = rows[0]
    claims_raw = json.loads(d["CLAIMS"]) if isinstance(d["CLAIMS"], str) else d["CLAIMS"]
    claims = [CairnquillClaim.model_validate(c) for c in claims_raw]
    return Draft(
        draft_id=d["DRAFT_ID"], case_id=d["CASE_ID"], version=d["VERSION"],
        claims=claims, model=d["MODEL"], prompt_version=d["PROMPT_VERSION"], author=d["AUTHOR"]
    )

def cmd_mine(args):
    conn = get_connection()
    try:
        case_id = args.case_id
        account = args.account
        window_hours = args.window
        
        logger.info(f"Mining evidence for {case_id} (account: {account}, window: {window_hours}h)")
        with conn.cursor() as cur:
            cur.execute("CALL EVIDENCE.MINE_EVIDENCE(%s, %s, %s)", (case_id, account, window_hours))
            res = cur.fetchone()
            print(json.dumps(res[0] if res else None, indent=2))
    finally:
        conn.close()

def cmd_verify(args):
    conn = get_connection()
    try:
        draft = fetch_draft(conn, args.draft_id)
        logger.info(f"Verifying draft {args.draft_id} for case {draft.case_id}...")
        result = verify_draft(draft, conn)
        
        print(f"Blocked: {result.blocked}")
        print(f"Verified: {result.verified_count}")
        print(f"Failed: {len(result.failed_verdicts)}")
        
        if result.failed_verdicts:
            print("\nFailed Claims:")
            for v in result.failed_verdicts:
                print(f"  [{v.claim_id}] {v.verdict}: {v.error or ''} (asserted: {v.asserted}, actual: {v.actual})")
    finally:
        conn.close()

def cmd_replay(args):
    conn = get_connection()
    try:
        filings = execute_query(conn, "SELECT * FROM AUDIT.FILINGS WHERE filing_id = %s", (args.filing_id,))
        if not filings:
            logger.error("Filing not found")
            sys.exit(1)
            
        f = filings[0]
        draft = fetch_draft(conn, f["DRAFT_ID"])
        case_rows = execute_query(conn, "SELECT * FROM EVIDENCE.CASE_ROWS WHERE case_id = %s", (f["CASE_ID"],))
        
        verification = verify_draft(draft, conn)
        versions = json.loads(f["VERSIONS"]) if isinstance(f["VERSIONS"], str) else f["VERSIONS"]
        
        match, computed = replay_seal(
            f["CASE_ID"], draft, case_rows, verification, versions, f["PREV_SEAL_SHA"], f["SEAL_SHA"]
        )
        
        print(f"Replay Match:  {match}")
        print(f"Expected Seal: {f['SEAL_SHA']}")
        print(f"Computed Seal: {computed}")
        
        if not match:
            sys.exit(1)
    finally:
        conn.close()

def cmd_chain(args):
    conn = get_connection()
    try:
        logger.info("Verifying audit hash chain...")
        filings = execute_query(conn, "SELECT filing_id, seal_sha, prev_seal_sha, approved_ts FROM AUDIT.FILINGS ORDER BY approved_ts ASC")
        if not filings:
            logger.info("No filings found in audit trail.")
            return
            
        results = verify_chain(filings)
        broken = False
        for r in results:
            status = "PASS" if r["valid"] else "FAIL"
            print(f"[{status}] Filing {r['filing_id']}: {r['reason']}")
            if not r["valid"]:
                broken = True
                
        if broken:
            logger.error("Hash chain validation failed! Audit trail tampered.")
            sys.exit(1)
        else:
            logger.info("Hash chain is cryptographically intact.")
    finally:
        conn.close()

def app():
    parser = argparse.ArgumentParser(description="Cairnquill CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # mine
    p_mine = subparsers.add_parser("mine", help="Mine evidence for a case")
    p_mine.add_argument("case_id")
    p_mine.add_argument("account")
    p_mine.add_argument("--window", type=int, default=168, help="Window hours")
    
    # verify
    p_verify = subparsers.add_parser("verify", help="Run Surveyor on a draft")
    p_verify.add_argument("draft_id")
    
    # replay
    p_replay = subparsers.add_parser("replay", help="Replay and verify a sealed filing")
    p_replay.add_argument("filing_id")
    
    # chain
    p_chain = subparsers.add_parser("chain", help="Verify the entire audit hash chain")
    
    args = parser.parse_args()
    
    if args.command == "mine":
        cmd_mine(args)
    elif args.command == "verify":
        cmd_verify(args)
    elif args.command == "replay":
        cmd_replay(args)
    elif args.command == "chain":
        cmd_chain(args)

if __name__ == "__main__":
    app()
