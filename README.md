# CPFW Tools

This project contains internal tools for running Checkpoint expert commands via Flask-based web apps.

## ✅ Primary App: cpGet

The `cp_getinfo` folder contains a standalone Flask app called `cpGet.py` that:
- Allows selection of local directories
- Transfers scripts to remote systems via SSH
- Executes those scripts and returns results

---

## 🚀 How to Run

### Option 1: Manual Launch (Cross-Platform)

1. Install Python: https://www.python.org/downloads/
2. Open a terminal or command prompt:
   ```bash
   pip install -r requirements.txt
   python cp_getinfo/cpGet.py
   ```

### Option 2: One-Click Launch (Windows)

Double-click:
```
run_cpGet.bat
```

This will open your browser to: http://localhost:5001

---

## 📁 Project Structure

```
cpfw_tools/
├── cp_getinfo/
│   ├── cpGet.py
│   ├── templates/
│   │   └── cpGet.html
│   └── static/
├── run_cpGet.bat
├── requirements.txt
├── .gitignore
└── README.md
```

---

## 🧪 Development Notes

- All scripts are local to each user for security
- SSH credentials are not stored or transmitted externally
- Logging is done to `script.log` (excluded from Git)

---

## 📜 License

Internal use only. Not licensed for external distribution.
