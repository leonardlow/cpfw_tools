import json
from flask import Flask, render_template, request, jsonify
import paramiko
import os
import logging
import glob

app = Flask(__name__)

def create_ssh_client(hostname, username, password):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)
    return client


@app.route('/')
def index():
    return render_template('index1.html', log_content=None)

@app.route('/directories')
def directories():
    path = request.args.get('path', '')
    try:
        if os.name == 'nt':  # Windows
            if not path:
                drives = [f'{d}:\\' for d in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' if os.path.exists(f'{d}:\\')]
                return jsonify(drives)
            else:
                directories = [os.path.join(path, d) for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]
                return jsonify(directories)
        else:  # Unix/Linux
            if not path:
                directories = [d for d in glob.glob('/*') if os.path.isdir(d)]
                return jsonify(directories)
            else:
                directories = [os.path.join(path, d) for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]
                return jsonify(directories)
    except Exception as e:
        return jsonify([])

@app.route('/execute', methods=['POST'])
def execute():
    hostnames = request.form['hostnames']
    username = request.form['username']
    password = request.form['password']
    local_path = request.form['local_path']
    remote_path = request.form['remote_path']
    remote_script_path = request.form['remote_script_path']
    error_checking = 'error_checking' in request.form

    hostname_list = [h.strip() for h in hostnames.strip().splitlines() if h.strip()]

    # Set up logging
    logging.basicConfig(filename='script.log', level=logging.INFO)
    logger = logging.getLogger()

    for hostname in hostname_list:
        logger.info(f"Processing host: {hostname}")
        try:
            ssh_client = create_ssh_client(hostname, username, password)
            sftp = ssh_client.open_sftp()

            remote_dir = os.path.dirname(remote_path)
            try:
                sftp.stat(remote_dir)
            except FileNotFoundError:
                sftp.mkdir(remote_dir)
                logger.info(f"Created directory {remote_dir} on {hostname}")

            # List all files in the local directory
            try:
                files = os.listdir(local_path)
            except FileNotFoundError:
                logger.error(f"Local directory {local_path} does not exist")
                continue

            for file_name in files:
                local_file_path = os.path.join(local_path, file_name)
                remote_file_path = os.path.join(remote_path, file_name)

                # Check if local file exists and is a file (not a directory)
                if not os.path.isfile(local_file_path):
                    logger.error(f"{local_file_path} is not a file")
                    continue

                # Log before attempting to copy
                logger.info(f"Attempting to copy {local_file_path} to {remote_file_path} on {hostname}")
                try:
                    sftp.put(local_file_path, remote_file_path)
                    logger.info(f"Copied {local_file_path} to {remote_file_path} on {hostname}")
                except Exception as e:
                    if error_checking:
                        logger.error(f"Failed to copy {local_file_path} to {remote_file_path} on {hostname}: {str(e)}")

            # Make the remote script executable
            ssh_client.exec_command(f'chmod +x {remote_script_path}')
            logger.info(f"Changed permissions for {remote_script_path} to make it executable on {hostname}")

            stdin, stdout, stderr = ssh_client.exec_command(f'bash {remote_script_path}')
            if error_checking:
                logger.info(stdout.read().decode())
                logger.error(stderr.read().decode())

            sftp.close()
            ssh_client.close()
            logger.info(f"Completed processing host: {hostname}")
        except Exception as e:
            if error_checking:
                logger.error(f"Failed to process {hostname}: {str(e)}")

    with open('script.log', 'r') as log:
        log_content = log.read()

    return render_template('index1.html', log_content=log_content)

# Load project configurations
with open('projects.json') as f:
    projects = json.load(f)['projects']

# Dynamically create routes for each project
for project in projects:
    app.add_url_rule(f"/{project['name']}", project['name'], lambda template=project['template']: render_template(template))

if __name__ == '__main__':
    app.run(port=5000, debug=True)
    