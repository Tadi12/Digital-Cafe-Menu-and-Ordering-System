from fastapi import FastAPI, HTTPException, Query
from ethiobank_receipts import extract_receipt
from ethiobank_receipts.extractors.cbe import extract_cbe_receipt_info_from_ft

app = FastAPI(title="EthioBank Receipt Verifier API")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Verifier is running"}

@app.get("/verify")
def verify_payment(
    bank: str = Query(..., description="e.g. cbe, tele, dashen, awash, boa, zemen"),
    reference: str = Query(..., description="The FT number, CHQ ID, or full receipt URL"),
    account_tail: str = Query(None, description="For CBE, the last 8 digits of the account number if using FT number instead of full URL")
):
    try:
        # CBE Special Handling (FT + Account digits)
        if bank.lower() == "cbe" and not reference.startswith("http"):
            if not account_tail or len(account_tail) < 8:
                raise HTTPException(status_code=400, detail="CBE requires 'account_tail' (last 8 digits) when verifying by FT number.")
            data = extract_cbe_receipt_info_from_ft(reference, account_tail)
            return {"success": True, "data": data}
            
        # Standard extraction (Telebirr by ID, or others by URL)
        data = extract_receipt(bank.lower(), reference)
        
        if not data:
            raise ValueError("Failed to extract data or invalid reference")
            
        return {"success": True, "data": data}
        
    except Exception as e:
        # Return structured error so Node.js can parse it easily
        return {"success": False, "error": str(e)}
