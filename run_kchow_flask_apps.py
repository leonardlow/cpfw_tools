import subprocess
import time
import webbrowser
import os

# Define the paths to the Flask applications
app1_path = r"C:\Checkpoint Build\kchow.py"
app2_path = r"C:\Checkpoint Build\get info\app.py"
#app3_path = r"C:\Checkpoint Build\kcapp.py"

# Print the paths to verify
print(f"App1 Path: {app1_path}")
print(f"App2 Path: {app2_path}")
#print(f"App3 Path: {app3_path}")


# Define the commands to run the Flask applications
cmd1 = f"python \"{app1_path}\""
cmd2 = f"python \"{app2_path}\""
#cmd3 = f"python \"{app3_path}\""

# Start the first Flask application on port 5000
process1 = subprocess.Popen(cmd1, shell=True, env={"FLASK_APP": app1_path, "FLASK_RUN_PORT": "5000", **dict(os.environ)})

# Start the second Flask application on port 5001
process2 = subprocess.Popen(cmd2, shell=True, env={"FLASK_APP": app2_path, "FLASK_RUN_PORT": "5001", **dict(os.environ)})

# Start the third Flask application on port 5003
#process2 = subprocess.Popen(cmd3, shell=True, env={"FLASK_APP": app3_path, "FLASK_RUN_PORT": "5003", **dict(os.environ)})

# Wait for a few seconds to ensure the servers start
time.sleep(5)

# Open the web pages in the default browser
webbrowser.open("http://127.0.0.1:5000")
webbrowser.open("http://127.0.0.1:5001")
#webbrowser.open("http://127.0.0.1:5003")

print("Both Flask applications have been started and their web interfaces opened.")