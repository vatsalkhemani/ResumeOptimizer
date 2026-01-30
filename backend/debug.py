import traceback
try:
    from app.main import app
    print("SUCCESS: Imported app")
except Exception:
    traceback.print_exc()
