from flask import Flask, request, render_template, jsonify, session, redirect, url_for
import paramiko
import time
import webbrowser
import threading

app = Flask(__name__)
app.secret_key = 'your_secret_key'

@app.route('/')
def index():
    results = session.get('results', {})
    print("Rendering index with results:", results)  # Debug statement
    print("Session data:", session)  # Debug statement
    return render_template('index.html', results=results)

@app.route('/set_credentials', methods=['POST'])
def set_credentials():
    username = request.form['username']
    password = request.form['password']
    hosts = request.form['hosts'].strip().split('\n')
    hosts = [host.strip() for host in hosts]  # Strip both newline and carriage return characters
    hosts = ','.join(hosts)  # Convert to comma-separated format
    print(f"Received username: {username}")  # Debug statement
    print(f"Received password: {password}")  # Debug statement
    print(f"Received hosts: {hosts}")  # Debug statement
    session['username'] = username
    session['password'] = password
    session['hosts'] = hosts.split(',')  # Store as a list
    return redirect(url_for('index'))

@app.route('/execute', methods=['POST'])
def execute():
    commands = request.form.getlist('command')
    results = {}
    for host in session['hosts']:
        print(f"Connecting to host: {host}")  # Debug statement
        results[host] = {}
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            ssh.connect(host, username=session['username'], password=session['password'])
            combined_command = " && ".join(commands)  # Combine all commands into one
            start_time = time.time()
            stdin, stdout, stderr = ssh.exec_command(combined_command)
            execution_time = time.time() - start_time
            print(f"Executed combined commands on {host} in {execution_time:.2f} seconds")  # Timing log
            output = stdout.read().decode()
            print(f"Combined command output for {host}: {output}")  # Debug statement
            
            # Split the output by command
            command_outputs = output.split('\n\n')  # Assuming each command's output is separated by a blank line
            for i, command in enumerate(commands):
                if i < len(command_outputs):
                    results[host][command] = command_outputs[i]
            
            ssh.close()
        except Exception as e:
            print(f"Failed to connect to host {host}: {e}")  # Error handling
            results[host]['error'] = str(e)
    session['results'] = results
    print("Results stored in session:", results)  # Debug statement
    return redirect(url_for('index', tab='results'))

@app.route('/reset', methods=['POST'])
def reset():
    session.clear()
    return redirect(url_for('index'))

def open_browser():
    webbrowser.open_new("http://localhost:5001")

if __name__ == '__main__':
    threading.Timer(1.0, open_browser).start()
    app.run(debug=True, port=5001)