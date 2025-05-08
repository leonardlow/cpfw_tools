from flask import Flask, render_template
import webbrowser
import threading

app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route('/project1')
def project1():
    return render_template('index1.html')

@app.route('/project2')
def project2():
    return render_template('getinfo.html')

@app.route('/')
def home():
    return '''
    <h2>CPFW Projects</h2>
    <ul>
        <li><a href="/project1">Project 1</a></li>
        <li><a href="/project2">Project 2</a></li>
    </ul>
    '''

def open_browser():
    webbrowser.open_new("http://localhost:5000")

if __name__ == '__main__':
    threading.Timer(1.0, open_browser).start()
    app.run(debug=True, port=5000)
