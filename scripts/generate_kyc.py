#!/usr/bin/env python3
"""
Generate synthetic KYC data for unique accounts in the RAW.TXNS table.
Loads the data into RAW.KYC.
"""
import os
import random
import string
import uuid
import logging
from typing import Any

logger = logging.getLogger(__name__)

OCCUPATIONS = [
    "Retail", "Software Engineer", "Consultant", "Restaurant Owner", 
    "Unemployed", "Student", "Director", "Real Estate Agent"
]
BRANCHES = ["Downtown", "Westside", "North Hills", "Online", "East End"]
CCYS = ["USD", "EUR", "GBP", "INR", "SGD"]

def generate_kyc_data(conn) -> None:
    logger.info("Fetching unique accounts from RAW.TXNS...")
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT src FROM RAW.TXNS UNION SELECT DISTINCT dst FROM RAW.TXNS")
        accounts = [row[0] for row in cur.fetchall() if row[0]]

    logger.info(f"Generating KYC for {len(accounts)} accounts...")
    
    # We'll insert in batches
    insert_sql = """
        INSERT INTO RAW.KYC 
        (account_key, customer_name_synth, occupation, declared_monthly_income, income_ccy, branch, risk_rating)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    
    batch = []
    with conn.cursor() as cur:
        for acc in accounts:
            name = f"Synth_{''.join(random.choices(string.ascii_uppercase, k=4))} {''.join(random.choices(string.ascii_uppercase, k=6))}"
            occ = random.choice(OCCUPATIONS)
            income = random.randint(2000, 15000)
            if occ in ("Director", "Real Estate Agent", "Restaurant Owner"):
                income = random.randint(10000, 50000)
            ccy = random.choice(CCYS)
            branch = random.choice(BRANCHES)
            risk = "HIGH" if income > 30000 or occ == "Real Estate Agent" else ("LOW" if income < 5000 else "MEDIUM")
            
            batch.append((acc, name, occ, income, ccy, branch, risk))
            
            if len(batch) >= 10000:
                cur.executemany(insert_sql, batch)
                batch = []
        
        if batch:
            cur.executemany(insert_sql, batch)

    logger.info("KYC generation complete.")

if __name__ == "__main__":
    from cairnquill.adapters.snowflake import get_connection
    logging.basicConfig(level=logging.INFO)
    conn = get_connection()
    try:
        generate_kyc_data(conn)
    finally:
        conn.close()
