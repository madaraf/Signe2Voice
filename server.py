from flask import Flask, send_from_directory
import socket

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

def get_local_ip():
    """Get the local IP address of the laptop"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

if __name__ == '__main__':
    local_ip = get_local_ip()
    port = 5000
    
    print(f"Voice2Sign is running!")
    print(f"Open on laptop: http://{local_ip}:{port}")
    print(f"Open on phone: http://{local_ip}:{port}")
    print(f"Make sure both devices are on the same WiFi network!")
    
    app.run(host='0.0.0.0', port=port, debug=True)